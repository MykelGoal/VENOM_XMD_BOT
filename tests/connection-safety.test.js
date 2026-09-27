'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { installBaileysConsoleSafety } = require('../dist/core/baileys');

test('libsignal SessionEntry key dumps are suppressed without hiding normal console info', () => {
  const originalInfo = console.info;
  const seen = [];
  console.info = (...args) => seen.push(args);
  try {
    installBaileysConsoleSafety();
    console.info('Closing session:', { currentRatchet: { privKey: 'must-not-log' } });
    console.info('ordinary diagnostic');
    assert.deepEqual(seen, [['ordinary diagnostic']]);
  } finally {
    console.info = originalInfo;
  }
});

test('connection-replaced code 440 exits instead of creating a reconnect fight', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../src/core/connection.ts'),
    'utf8',
  );
  assert.match(source, /DisconnectReason\.connectionReplaced/);
  assert.match(source, /Session was replaced by another bot instance/);
  assert.match(source, /process\.exit\(1\)/);
});
