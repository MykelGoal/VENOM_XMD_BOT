'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'venom-tour-test-'));
process.env.VENOM_DATA_DIR = dataDir;
process.env.OWNER_NUMBER = '2348111111111';

const {
  flushLocalCollections,
  hydrateCollection,
} = require('../dist/database');
const {
  tournamentRepo,
} = require('../dist/database/repositories/tournament.repo');
const {
  getTournamentPaymentAccount,
  parseRoundResults,
  placementPoints,
  postRegistrationMilestone,
  sendTournamentAnnouncement,
  sendTournamentDailyReminder,
  setTournamentPaymentAccount,
  tournamentOwnerJid,
} = require('../dist/services/tournament.service');

function createTournament(code) {
  return tournamentRepo.create({
    code,
    groupJid: `${code.toLowerCase()}@g.us`,
    groupName: `${code} Group`,
    eventDate: '5 October 2026, 7:00 PM WAT',
    paymentInstructions: 'Contact the organizer privately.',
    createdByJid: '2348000000001@s.whatsapp.net',
    createdByDmJid: '2348000000001@s.whatsapp.net',
    createdByNumber: '2348000000001',
  });
}

function registerAndApprove(code, index) {
  const number = `23480000${String(index).padStart(4, '0')}`;
  const uid = `100000${String(index).padStart(3, '0')}`;
  tournamentRepo.addPlayer(code, {
    number,
    jid: `${number}@s.whatsapp.net`,
    groupJid: `${index}@lid`,
    nickname: `Player ${index}`,
    freeFireUid: uid,
  });
  tournamentRepo.approvePlayer(code, uid, '2348000000001');
  return uid;
}

after(() => {
  flushLocalCollections();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('owner notifications always target OWNER_NUMBER, not the bot number', () => {
  const tournament = createTournament('OWNERDM');
  assert.equal(tournamentOwnerJid(tournament), '2348111111111@s.whatsapp.net');
});

test('payment account is stored persistently and returned for private replies', () => {
  setTournamentPaymentAccount({
    bank: 'OPAY',
    accountNumber: '1234567890',
    accountName: 'Tournament Organizer',
  });
  assert.deepEqual(getTournamentPaymentAccount(), {
    bank: 'OPAY',
    accountNumber: '1234567890',
    accountName: 'Tournament Organizer',
  });
});

test('payment proof state survives as part of the registration record', () => {
  const tournament = createTournament('PROOF');
  tournamentRepo.addPlayer(tournament.code, {
    number: '2348000000999',
    jid: '2348000000999@s.whatsapp.net',
    nickname: 'Proof Player',
    freeFireUid: '1234567890',
  });
  const { player } = tournamentRepo.markPaymentProof(
    tournament.code,
    '2348000000999',
  );
  assert.equal(typeof player.paymentProofSubmittedAt, 'number');
});

test('launch announcement is one message mentioning all members once', async () => {
  const tournament = createTournament('ANNOUNCE');
  const participants = Array.from({ length: 70 }, (_, index) => ({
    id: `${index + 1}@lid`,
    admin: index === 0 ? 'admin' : null,
  }));
  participants.push({ id: '999@s.whatsapp.net', admin: 'admin' });
  const sent = [];
  const sock = {
    user: { id: '999@s.whatsapp.net' },
    groupMetadata: async () => ({
      id: tournament.groupJid,
      subject: tournament.groupName,
      participants,
    }),
    sendMessage: async (jid, content) => sent.push({ jid, content }),
  };

  await sendTournamentAnnouncement(sock, tournament);

  assert.equal(sent.length, 1);
  assert.equal(sent[0].jid, tournament.groupJid);
  assert.equal(sent[0].content.mentions.length, 70);
  assert.equal(new Set(sent[0].content.mentions).size, 70);
  assert.match(sent[0].content.text, /FREE FIRE SOLO TOURNAMENT/);
  assert.match(sent[0].content.text, /bot sends the account, reference/);
  assert.doesNotMatch(sent[0].content.text, /Contact the organizer privately/);
  assert.doesNotMatch(sent[0].content.text, /@1@lid|Group members notified/);
  assert.ok(sent[0].content.text.length < 1200, 'announcement should stay compact');
});

test('daily reminder hidden-tags only members who are not approved', async () => {
  const tournament = createTournament('REMIND');
  registerAndApprove(tournament.code, 1);
  const sent = [];
  const sock = {
    user: { id: '999@s.whatsapp.net' },
    groupMetadata: async () => ({
      id: tournament.groupJid,
      subject: tournament.groupName,
      participants: [
        { id: '1@lid', admin: null },
        { id: '2@lid', admin: null },
        { id: '999@s.whatsapp.net', admin: 'admin' },
      ],
    }),
    sendMessage: async (jid, content) => sent.push({ jid, content }),
  };

  assert.equal(await sendTournamentDailyReminder(sock, tournament), true);
  assert.deepEqual(sent[0].content.mentions, ['2@lid']);
  assert.match(sent[0].content.text, /39 remaining/);
  assert.ok(sent[0].content.text.length < 600, 'daily reminder should be short');
});

test('registration milestones post only once at 10/20/30/40', async () => {
  const tournament = createTournament('MILESTONE');
  const sent = [];
  const sock = {
    sendMessage: async (jid, content) => sent.push({ jid, content }),
  };

  for (let index = 1; index <= 9; index += 1) {
    registerAndApprove(tournament.code, index);
  }
  assert.equal(await postRegistrationMilestone(sock, tournament), false);

  registerAndApprove(tournament.code, 10);
  assert.equal(await postRegistrationMilestone(sock, tournament), true);
  assert.equal(await postRegistrationMilestone(sock, tournament), false);
  assert.equal(sent.length, 1);
  assert.match(sent[0].content.text, /10\/40/);
});

test('round parser calculates placement points and ranking deterministically', () => {
  const tournament = createTournament('SCORING');
  const uid1 = registerAndApprove(tournament.code, 101);
  const uid2 = registerAndApprove(tournament.code, 102);
  const uid3 = registerAndApprove(tournament.code, 103);
  const results = parseRoundResults(
    `${uid1},4,1; ${uid2},8,2; ${uid3},0,3`,
  );

  assert.equal(placementPoints(1), 12);
  assert.equal(placementPoints(11), 0);
  tournamentRepo.recordRound(tournament.code, 1, results);
  const ranking = tournamentRepo.ranking(tournament.code);

  assert.equal(ranking[0].player.freeFireUid, uid2);
  assert.equal(ranking[0].totalPoints, 17);
  assert.equal(ranking[1].player.freeFireUid, uid1);
  assert.equal(ranking[1].totalPoints, 16);
});

test('tournament state is durable locally and can be hydrated from Mongo shape', () => {
  flushLocalCollections();
  const file = path.join(dataDir, 'tournaments.json');
  assert.equal(fs.existsSync(file), true);
  const onDisk = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(onDisk.ANNOUNCE.code, 'ANNOUNCE');
  assert.equal(onDisk.MILESTONE.participants.length, 10);

  const remote = {
    code: 'REMOTE',
    game: 'Free Fire',
    groupJid: 'remote@g.us',
    groupName: 'Remote Group',
    eventDate: 'Tomorrow',
    paymentInstructions: 'Private transfer',
    maxPlayers: 40,
    entryFeeNaira: 1000,
    prizes: { first: 25000, second: 10000, third: 5000 },
    status: 'registration',
    createdByJid: '1@s.whatsapp.net',
    createdByDmJid: '1@s.whatsapp.net',
    createdByNumber: '1',
    participants: [],
    announcedMilestones: [],
    reminderEnabled: true,
    reminderTime: '18:00',
    roomSentRounds: [],
    standingsPostedRounds: [],
    completedRounds: [],
    createdAt: 1,
    updatedAt: 1,
  };
  assert.equal(hydrateCollection('tournaments', { REMOTE: remote }), 'hydrated');
  assert.equal(tournamentRepo.get('REMOTE').groupName, 'Remote Group');
});
