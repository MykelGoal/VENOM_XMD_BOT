'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'venom-groupbrain-test-'));
process.env.VENOM_DATA_DIR = tempDir;
process.env.OWNER_NUMBER = '2348000000000';

let groupBrainRepo;
let service;
let runGroupBrainReminderTick;
let buildVenomBrain;

before(() => {
  ({ groupBrainRepo } = require('../dist/database/repositories/groupbrain.repo'));
  service = require('../dist/services/groupbrain.service');
  ({ runGroupBrainReminderTick } = require('../dist/services/groupbrain-reminder.service'));
  ({ buildVenomBrain } = require('../dist/services/venom-brain'));
});

after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

test('natural admin lessons and Lagos room-match times parse deterministically', () => {
  assert.deepEqual(
    service.parseGroupTeaching('Venom, remember that our guild ID is 123456'),
    { kind: 'fact', value: 'our guild ID is 123456' },
  );
  assert.deepEqual(
    service.parseGroupTeaching('Venom remember every newcomer must send a picture'),
    { kind: 'photo', value: 'record' },
  );

  const now = new Date('2026-09-27T12:00:00.000Z'); // 1 PM Lagos
  const at = service.parseLagosMatchTime('schedule room match tonight by 9pm', now);
  assert.equal(new Date(at).toISOString(), '2026-09-27T20:00:00.000Z');
  const action = service.parseGroupTeaching('Venom schedule room match tonight by 9pm', now);
  assert.equal(action.kind, 'match');
  assert.equal(action.startsAt, at);
  assert.equal(
    new Date(service.parseLagosMatchTime('room match for 4 squads by 9pm', now)).toISOString(),
    '2026-09-27T20:00:00.000Z',
  );
});

test('Group Brain stores official knowledge and only pseudonymized bounded chat context', () => {
  const jid = 'brain-context@g.us';
  groupBrainRepo.setEnabled(jid, true);
  groupBrainRepo.setPurpose(jid, 'Free Fire community, room matches and member support');
  groupBrainRepo.addFact(jid, 'Our guild ID is 123456', '2348000000000');
  groupBrainRepo.addRule(jid, 'Respect every member');
  groupBrainRepo.addStyle(jid, 'Use short Nigerian English and Pidgin replies');
  groupBrainRepo.recordObservation(jid, '2348111122222', 'Who is creating the room tonight?');

  const context = service.buildGroupBrainContext(jid);
  assert.match(context, /Our guild ID is 123456/);
  assert.match(context, /member-2222/);
  assert.doesNotMatch(context, /2348111122222/);
  assert.match(context, /Do not advertise menus/);
  assert.match(
    service.deterministicGroupAnswer(jid, 'What is our guild ID?'),
    /123456/,
  );
});

test('selective mode answers direct calls and relevant questions, not ordinary banter', () => {
  const jid = 'brain-selective@g.us';
  groupBrainRepo.setEnabled(jid, true);
  groupBrainRepo.setPurpose(jid, 'Free Fire guild and room-match community');
  groupBrainRepo.addFact(jid, 'The guild ID is 445566', 'owner');
  const sock = {
    user: { id: '2348999999999:1@s.whatsapp.net' },
    authState: { creds: { me: { id: '2348999999999:1@s.whatsapp.net' } } },
  };
  const base = {
    chat: jid,
    sender: '2348111111111@s.whatsapp.net',
    senderNumber: '2348111111111',
    isGroup: true,
    fromMe: false,
    mentions: [],
    type: 'conversation',
  };

  assert.equal(service.groupBrainWantsReply(sock, { ...base, body: 'Venom, help me' }), true);
  assert.equal(service.groupBrainWantsReply(sock, { ...base, body: 'What is our guild ID?' }), true);
  assert.equal(service.groupBrainWantsReply(sock, { ...base, body: 'This match sweet die 😂' }), false);
});

test('durable room reminders are sent once to admins and the group', async () => {
  const jid = 'brain-reminder@g.us';
  groupBrainRepo.setEnabled(jid, true);
  groupBrainRepo.setRoomAdmins(jid, ['2348011111111', '2348022222222']);
  const now = Date.parse('2026-09-27T19:50:00.000Z');
  groupBrainRepo.addEvent(jid, {
    kind: 'room-match',
    title: 'CS Squad room match',
    startsAt: now + 10 * 60 * 1000,
    createdBy: 'owner',
  });
  const sent = [];
  const sock = {
    sendMessage: async (to, content) => {
      sent.push({ to, content });
      return { key: { id: String(sent.length) } };
    },
  };

  assert.equal(await runGroupBrainReminderTick(sock, now), 2);
  assert.equal(sent.filter((item) => item.to.endsWith('@s.whatsapp.net')).length, 2);
  assert.equal(sent.filter((item) => item.to === jid).length, 1);
  assert.equal(await runGroupBrainReminderTick(sock, now + 1000), 0);
});

test('the core AI prompt is lean and does not inject the full menu or social promotion', () => {
  const brain = buildVenomBrain();
  assert.ok(brain.length < 7000, `brain prompt is too large: ${brain.length}`);
  assert.doesNotMatch(brain, /COMPLETE COMMAND LIST|follow .*TikTok|star .*GitHub/i);
  assert.match(brain, /Help first/);
  assert.match(brain, /not the owner and not a human/);
  assert.match(brain, /Never introduce or label yourself/);
  assert.match(brain, /Name: Venom\./);
  assert.doesNotMatch(brain, /Name: Venom AI/);
});
