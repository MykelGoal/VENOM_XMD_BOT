'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  FLUTTERWAVE_CHECKOUT_OPTIONS,
  isFlutterwaveTestSecretKey,
  isValidFlutterwaveSecretKey,
} = require('../dist/utils/flutterwave');

test('Flutterwave checkout stays on the owner-selected bank-transfer lane', () => {
  assert.equal(FLUTTERWAVE_CHECKOUT_OPTIONS, 'banktransfer');
  const service = fs.readFileSync(
    path.join(__dirname, '../src/services/vtu.service.ts'),
    'utf8',
  );
  assert.match(service, /payment_options: FLUTTERWAVE_CHECKOUT_OPTIONS/);
});

test('data fulfilment uses Flutterwave biller and item identifiers', () => {
  const service = fs.readFileSync(
    path.join(__dirname, '../src/services/vtu.service.ts'),
    'utf8',
  );
  assert.match(service, /billerCode: String\(i\.biller_code\)/);
  assert.match(service, /itemCode: String\(i\.item_code\)/);
  assert.match(service, /items\/\$\{encodeURIComponent\(opts\.itemCode\)\}\/payment/);
  assert.match(service, /customer_id: opts\.customer/);
});

test('Flutterwave secret validation accepts live/test keys and rejects pasted punctuation', () => {
  const live = `FLWSECK-${'a'.repeat(32)}-X`;
  const testKey = `FLWSECK_TEST-${'b'.repeat(32)}-X`;

  assert.equal(isValidFlutterwaveSecretKey(live), true);
  assert.equal(isValidFlutterwaveSecretKey(testKey), true);
  assert.equal(isFlutterwaveTestSecretKey(live), false);
  assert.equal(isFlutterwaveTestSecretKey(testKey), true);
  assert.equal(isValidFlutterwaveSecretKey(`${live}.`), false);
  assert.equal(isValidFlutterwaveSecretKey('FLWPUBK-not-a-secret-X'), false);
});
