'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'venom-ops-test-'));
process.env.VENOM_DATA_DIR = dataDir;

const {
  flushLocalCollections,
  hydrateCollection,
} = require('../dist/database');
require('../dist/database/repositories/register');
const { groupRepo } = require('../dist/database/repositories/group.repo');
const { settingsRepo } = require('../dist/database/repositories/settings.repo');

const operationalCollections = [
  'access',
  'afk',
  'economy',
  'groups',
  'groupstats',
  'notes',
  'settings',
  'tournaments',
  'users',
  'voiceclones',
  'wallets',
  'walletledger',
  'vtupending',
  'warns',
];

after(() => {
  flushLocalCollections();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('every operational repository is registered before Mongo hydration', () => {
  for (const name of operationalCollections) {
    assert.notEqual(
      hydrateCollection(name, {}),
      'missing',
      `${name} was not registered`,
    );
  }
});

test('group settings and global settings restore from Mongo-shaped documents', () => {
  const groupJid = '120363000000000500@g.us';
  assert.equal(
    hydrateCollection('groups', {
      [groupJid]: {
        jid: groupJid,
        welcome: true,
        antilink: true,
        mutedUsers: ['2348000000000'],
        createdAt: 1,
      },
    }),
    'hydrated',
  );
  assert.equal(
    hydrateCollection('settings', {
      mode: { key: 'mode', value: 'private' },
    }),
    'hydrated',
  );

  assert.equal(groupRepo.get(groupJid).antilink, true);
  assert.equal(groupRepo.get(groupJid).welcome, true);
  assert.deepEqual(groupRepo.get(groupJid).mutedUsers, ['2348000000000']);
  assert.equal(settingsRepo.get('mode'), 'private');
});
