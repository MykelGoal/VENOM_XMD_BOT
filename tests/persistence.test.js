'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'venom-db-test-'));
process.env.VENOM_DATA_DIR = dataDir;

const {
  createCollection,
  flushLocalCollections,
} = require('../dist/database');

test.after(() => {
  flushLocalCollections();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('rapid non-critical updates are coalesced and flush as valid JSON', () => {
  const stats = createCollection('activity-test');
  for (let count = 1; count <= 100; count += 1) {
    stats.set('group|member', { count });
  }

  const file = path.join(dataDir, 'activity-test.json');
  assert.equal(fs.existsSync(file), false, 'write should be queued, not repeated');

  flushLocalCollections();
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), {
    'group|member': { count: 100 },
  });
  assert.equal(
    fs.readdirSync(dataDir).some((name) => name.endsWith('.tmp')),
    false,
    'atomic temporary file should be renamed away',
  );
});

test('money-critical collections still persist immediately', () => {
  const wallets = createCollection('wallets');
  wallets.set('2348000000000', { balanceKobo: 50000 });

  const file = path.join(dataDir, 'wallets.json');
  assert.equal(fs.existsSync(file), true);
  assert.equal(
    JSON.parse(fs.readFileSync(file, 'utf8'))['2348000000000'].balanceKobo,
    50000,
  );
});
