'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'venom-reminder-test-'));
process.env.VENOM_DATA_DIR = dataDir;

const { flushLocalCollections } = require('../dist/database');
const {
  tournamentRepo,
} = require('../dist/database/repositories/tournament.repo');
const {
  lagosClock,
  runTournamentReminderTick,
} = require('../dist/services/tournament-reminder.service');

after(() => {
  flushLocalCollections();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('Lagos clock is independent of the server timezone', () => {
  assert.deepEqual(lagosClock(new Date('2026-09-25T17:05:00.000Z')), {
    date: '2026-09-25',
    minutes: 18 * 60 + 5,
  });
});

test('6 PM reminder posts once per Lagos day and survives repeat ticks', async () => {
  const tournament = tournamentRepo.create({
    code: 'DAILY6',
    groupJid: 'daily6@g.us',
    groupName: 'Daily Reminder Group',
    eventDate: 'Saturday, 7 PM WAT',
    paymentInstructions: 'Private account',
    createdByJid: '2348000000001@s.whatsapp.net',
    createdByDmJid: '2348000000001@s.whatsapp.net',
    createdByNumber: '2348000000001',
  });
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
  const sixPm = new Date('2026-09-25T17:05:00.000Z');

  assert.equal(await runTournamentReminderTick(sock, sixPm), 1);
  assert.equal(await runTournamentReminderTick(sock, sixPm), 0);
  assert.equal(sent.length, 1);
  assert.equal(tournamentRepo.get('DAILY6').lastReminderDate, '2026-09-25');

  // It does not post before the configured time on the next day.
  assert.equal(
    await runTournamentReminderTick(
      sock,
      new Date('2026-09-26T14:00:00.000Z'),
    ),
    0,
  );
});
