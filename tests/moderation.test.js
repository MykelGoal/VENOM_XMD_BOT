'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'venom-mod-test-'));
process.env.VENOM_DATA_DIR = dataDir;

const { initBaileys } = require('../dist/core/baileys');
const { groupRepo } = require('../dist/database/repositories/group.repo');
const { settingsRepo } = require('../dist/database/repositories/settings.repo');
const { flushLocalCollections } = require('../dist/database');
const { store } = require('../dist/core/store');
const { msgCache } = require('../dist/core/msgcache');
const { commands, resolveCommand } = require('../dist/commands');
const {
  containsLink,
  enforceAntilink,
} = require('../dist/middleware/antilink');
const { handleAntiDelete } = require('../dist/handlers/antidelete.handler');

let handleMessageUpsert;

before(async () => {
  await initBaileys();
  ({ handleMessageUpsert } = require('../dist/handlers/message.handler'));
});

after(() => {
  flushLocalCollections();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

function groupFixture(group, sendMessage) {
  const bot = '999@lid';
  const member = '222@lid';
  const admin = '333@lid';
  const metadata = {
    id: group,
    addressingMode: 'lid',
    subject: 'Moderation test',
    owner: undefined,
    participants: [
      { id: bot, lid: bot, admin: 'admin' },
      { id: member, lid: member, admin: null },
      { id: admin, lid: admin, admin: 'admin' },
    ],
  };
  store.setGroup(group, metadata);

  return {
    bot,
    member,
    admin,
    metadata,
    sock: {
      user: { id: '2348099999999@s.whatsapp.net', lid: bot },
      authState: {
        creds: { me: { id: '2348099999999@s.whatsapp.net', lid: bot } },
      },
      groupMetadata: async () => metadata,
      sendMessage,
      readMessages: async () => {},
      sendPresenceUpdate: async () => {},
      relayMessage: async () => {},
    },
  };
}

function serialized(group, sender, id, body = 'message') {
  const raw = {
    key: { remoteJid: group, participant: sender, id },
    message: { conversation: body },
    pushName: 'Member',
    messageTimestamp: Date.now(),
  };
  return {
    raw,
    chat: group,
    sender,
    senderNumber: sender === '333@lid' ? '333' : '222',
    isGroup: true,
    fromMe: false,
    id,
    body,
    type: 'conversation',
    mentions: [],
    isNewsletterForward: false,
  };
}

test('production command registry loads every command and resolves aliases', () => {
  assert.ok(commands.size >= 450, `expected at least 450 commands, got ${commands.size}`);
  assert.equal(resolveCommand('help')?.name, 'help');
  assert.equal(resolveCommand('h')?.name, 'help');
  assert.equal(resolveCommand('tourcreate')?.name, 'tourcreate');
  assert.equal(resolveCommand('touraccount')?.name, 'touraccount');
  assert.equal(resolveCommand('tourproof')?.name, 'tourproof');
  assert.equal(resolveCommand('tourreminder')?.name, 'tourreminder');
  assert.equal(resolveCommand('tour')?.name, 'tourhelp');
});

test('link detector catches protocol, bare-domain and WhatsApp links', () => {
  assert.equal(containsLink('visit https://example.com/a'), true);
  assert.equal(containsLink('visit example.com/a'), true);
  assert.equal(containsLink('chat.whatsapp.com/AbCdEf123456789012'), true);
  assert.equal(containsLink('ordinary conversation without a URL'), false);
});

test('moderation deletion retries once after a transient failure', async () => {
  const group = '120363000000000101@g.us';
  let attempts = 0;
  const fixture = groupFixture(group, async (_jid, content) => {
    if (content.delete && ++attempts === 1) throw new Error('transient');
  });
  groupRepo.muteUser(group, '222');

  const blocked = await enforceAntilink(
    fixture.sock,
    serialized(group, fixture.member, 'RETRY-1'),
  );

  assert.equal(blocked, true);
  assert.equal(attempts, 2);
});

test('muted spam burst is deleted concurrently and completely', async () => {
  const group = '120363000000000102@g.us';
  const deleted = [];
  const fixture = groupFixture(group, async (_jid, content) => {
    if (content.delete) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      deleted.push(content.delete.id);
    }
  });
  groupRepo.muteUser(group, '222');

  const messages = Array.from({ length: 20 }, (_, index) => ({
    key: {
      remoteJid: group,
      participant: fixture.member,
      id: `BURST-${index}`,
    },
    message: { conversation: `spam ${index}` },
    pushName: 'Spammer',
    messageTimestamp: Date.now(),
  }));

  const started = Date.now();
  await handleMessageUpsert(fixture.sock, { messages, type: 'notify' });
  const elapsed = Date.now() - started;

  assert.equal(deleted.length, 20);
  assert.equal(new Set(deleted).size, 20);
  assert.ok(elapsed < 1000, `expected concurrent deletion under 1s, got ${elapsed}ms`);
});

test('anti-link exempts admins but deletes ordinary member links', async () => {
  const group = '120363000000000103@g.us';
  const sent = [];
  const fixture = groupFixture(group, async (_jid, content) => {
    sent.push(content);
  });
  groupRepo.setAntilink(group, true);

  const adminBlocked = await enforceAntilink(
    fixture.sock,
    serialized(group, fixture.admin, 'ADMIN-LINK', 'https://example.com'),
  );
  assert.equal(adminBlocked, false);
  assert.equal(sent.length, 0);

  const memberBlocked = await enforceAntilink(
    fixture.sock,
    serialized(group, fixture.member, 'MEMBER-LINK', 'example.com/news'),
  );
  assert.equal(memberBlocked, true);
  assert.equal(sent.filter((content) => content.delete).length, 1);
  assert.equal(sent.some((content) => content.text?.includes('links are not allowed')), true);
});

test('anti-delete never restores a moderation deletion', async () => {
  const group = '120363000000000104@g.us';
  const sent = [];
  let relayed = 0;
  const fixture = groupFixture(group, async (_jid, content) => {
    sent.push(content);
  });
  fixture.sock.relayMessage = async () => {
    relayed += 1;
  };
  groupRepo.muteUser(group, '222');
  settingsRepo.setBool('antidelete', true);

  const message = serialized(group, fixture.member, 'MODERATED-DELETE');
  msgCache.set(message.id, {
    raw: message.raw,
    sender: message.sender,
    chat: message.chat,
    at: Date.now(),
  });
  await enforceAntilink(fixture.sock, message);
  await handleAntiDelete(fixture.sock, {
    key: message.raw.key,
    update: { message: null },
  });

  assert.equal(sent.filter((content) => content.delete).length, 1);
  assert.equal(sent.some((content) => content.text?.includes('Anti-delete')), false);
  assert.equal(relayed, 0);
});
