'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'venom-community-test-'));
process.env.VENOM_DATA_DIR = dataDir;
process.env.OWNER_NUMBER = '2348111111111';

const { groupBrainRepo } = require('../dist/database/repositories/groupbrain.repo');
const {
  groupStatsRepo,
  isMeaningfulActivity,
} = require('../dist/database/repositories/groupstats.repo');
const { tournamentRepo } = require('../dist/database/repositories/tournament.repo');
const { tournamentSessionRepo } = require('../dist/database/repositories/tournament-session.repo');
const {
  parseMemberIntroduction,
} = require('../dist/services/onboarding.service');
const {
  handleNaturalTournament,
  parseNaturalTournamentDetails,
} = require('../dist/services/tournament-natural.service');
const { runCommunityManagerTick } = require('../dist/services/community-manager.service');
const { flushLocalCollections } = require('../dist/database');

after(() => {
  flushLocalCollections();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('natural introductions are normalized and campaign completion is durable', () => {
  const parsed = parseMemberIntroduction(
    "I'm Michael, IGN Venom King, UID 8636270783, Middle East server, Rusher",
  );
  assert.equal(
    parseMemberIntroduction('Call me David, IGN Eagle, UID 1234567890, Rusher').region,
    undefined,
    'the pronoun “me” must not be mistaken for the ME server',
  );
  assert.deepEqual(parsed, {
    preferredName: 'Michael',
    freeFireName: 'Venom King',
    freeFireUid: '8636270783',
    region: 'ME',
    role: 'rusher',
  });

  const jid = 'onboarding@g.us';
  groupBrainRepo.startOnboardingCampaign(jid, ['2348000000001@s.whatsapp.net']);
  assert.equal(groupBrainRepo.needsIntroduction(jid, '2348000000001'), true);
  groupBrainRepo.saveIntroduction(jid, '2348000000001', parsed);
  const brain = groupBrainRepo.get(jid);
  assert.equal(brain.members['2348000000001'].intro.freeFireUid, '8636270783');
  assert.equal(brain.onboardingCampaignActive, false);
  assert.equal(typeof brain.onboardingCampaignCompletedAt, 'number');
});

test('activity analytics exclude commands and reaction noise from meaningful trends', () => {
  const jid = 'activity@g.us';
  const at = Date.parse('2026-09-30T10:00:00.000Z');
  assert.equal(isMeaningfulActivity('.menu', 'conversation', '.'), false);
  assert.equal(isMeaningfulActivity('😂😂😂', 'conversation', '.'), false);
  assert.equal(isMeaningfulActivity('Who wants to play tonight?', 'conversation', '.'), true);
  assert.equal(isMeaningfulActivity('', 'imageMessage', '.'), true);

  groupStatsRepo.record(jid, '2348000000001', { meaningful: false, at });
  groupStatsRepo.record(jid, '2348000000001', { meaningful: true, at });
  groupStatsRepo.record(jid, '2348000000002', { meaningful: true, media: true, at });
  const summary = groupStatsRepo.summary(jid, 7, at);
  assert.equal(groupStatsRepo.totalMessages(jid), 3);
  assert.equal(summary.meaningfulMessages, 2);
  assert.equal(summary.mediaMessages, 1);
  assert.equal(summary.uniqueActive, 2);
});

test('adaptive activities run once on a daytime activity day and skip lively groups', async () => {
  const quiet = 'quiet-community@g.us';
  const lively = 'lively-community@g.us';
  groupBrainRepo.setCommunityManager(quiet, true);
  groupBrainRepo.setCommunityManager(lively, true);
  const now = new Date('2026-09-29T15:15:00.000Z'); // Tuesday 4:15 PM Lagos
  groupStatsRepo.record(lively, '2348000000004', {
    meaningful: true,
    at: now.getTime() - 10 * 60 * 1000,
  });
  const sent = [];
  const sock = {
    sendMessage: async (jid, content) => {
      sent.push({ jid, content });
      return { key: { id: String(sent.length) } };
    },
  };
  const first = await runCommunityManagerTick(sock, now);
  const second = await runCommunityManagerTick(sock, new Date(now.getTime() + 60_000));
  assert.equal(first.engagements, 1);
  assert.equal(second.engagements, 0);
  assert.equal(sent.filter((item) => item.jid === quiet).length, 1);
  assert.equal(sent.filter((item) => item.jid === lively).length, 0);
});

test('natural tournament details and short-lived sessions are deterministic', () => {
  assert.deepEqual(
    parseNaturalTournamentDetails('My nickname is DARK KING, UID 1234567890'),
    { nickname: 'DARK KING', freeFireUid: '1234567890' },
  );
  tournamentSessionRepo.set('2348000000003', 'venom40', 'details', 1000);
  assert.equal(tournamentSessionRepo.get('2348000000003', 2000).tournamentCode, 'VENOM40');
  assert.equal(tournamentSessionRepo.get('2348000000003', 1000 + 24 * 60 * 60 * 1000 + 1), undefined);
});

function pendingReview(code, number, uid, reviewId, reviewMessageId) {
  const tournament = tournamentRepo.create({
    code,
    groupJid: `${code.toLowerCase()}@g.us`,
    groupName: `${code} group`,
    eventDate: 'Tomorrow',
    paymentInstructions: 'OPAY — 1234567890 — Organizer',
    createdByJid: '2348111111111@s.whatsapp.net',
    createdByDmJid: '2348111111111@s.whatsapp.net',
    createdByNumber: '2348111111111',
  });
  const player = tournamentRepo.addPlayer(code, {
    number,
    jid: `${number}@s.whatsapp.net`,
    nickname: `Player ${uid.slice(-2)}`,
    freeFireUid: uid,
  });
  tournamentRepo.markPaymentProof(code, number, {
    reviewId,
    reviewMessageId,
    fingerprint: `${code}-hash`,
  });
  return { tournament, player };
}

function reviewMessage(body, reviewId, quotedId) {
  return {
    raw: { key: { id: `reply-${quotedId}`, remoteJid: '2348111111111@s.whatsapp.net' }, message: { conversation: body } },
    chat: '2348111111111@s.whatsapp.net',
    sender: '2348111111111@s.whatsapp.net',
    senderNumber: '2348111111111',
    isGroup: false,
    fromMe: false,
    id: `reply-${quotedId}`,
    body,
    type: 'conversation',
    mentions: [],
    quoted: {
      raw: { key: { id: quotedId }, message: { conversation: `[VENOM-REVIEW:${reviewId}]` } },
      chat: '2348111111111@s.whatsapp.net',
      sender: 'bot@s.whatsapp.net',
      senderNumber: '999',
      isGroup: false,
      fromMe: true,
      id: quotedId,
      body: `[VENOM-REVIEW:${reviewId}]`,
      type: 'conversation',
      mentions: [],
    },
  };
}

test('owner natural approval requires the exact quoted review message id', async () => {
  const exact = pendingReview('NATURAL1', '2348000000101', '1234567801', 'TP-NATURAL1-ABC', 'review-exact');
  const forged = pendingReview('NATURAL2', '2348000000102', '1234567802', 'TP-NATURAL2-DEF', 'review-real');
  const sent = [];
  const sock = {
    sendMessage: async (jid, content) => {
      sent.push({ jid, content });
      return { key: { id: String(sent.length) } };
    },
  };

  assert.equal(
    await handleNaturalTournament(sock, reviewMessage('approve', 'TP-NATURAL1-ABC', 'review-exact')),
    true,
  );
  assert.equal(tournamentRepo.findPlayer(exact.tournament.code, exact.player.number).paymentStatus, 'approved');

  assert.equal(
    await handleNaturalTournament(sock, reviewMessage('approve', 'TP-NATURAL2-DEF', 'review-forged')),
    true,
  );
  assert.equal(tournamentRepo.findPlayer(forged.tournament.code, forged.player.number).paymentStatus, 'pending');
  assert.match(sent.at(-1).content.text, /exact bot review message/);
});
