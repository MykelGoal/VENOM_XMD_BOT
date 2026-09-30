'use strict';

const { test, before } = require('node:test');
const assert = require('node:assert/strict');

process.env.OWNER_NUMBER = process.env.OWNER_NUMBER || '2348000000000';

let parseNaturalCommandRequest;

before(() => {
  ({ parseNaturalCommandRequest } = require('../dist/services/ai-tools.service'));
});

test('natural sensitivity requests deterministically select the sensi command', () => {
  assert.deepEqual(parseNaturalCommandRequest('give me sensi .a7pro'), {
    command: 'sensi',
    args: 'a7pro',
  });
  assert.deepEqual(parseNaturalCommandRequest('Venom, show me the best FF sensitivity for Samsung Galaxy A15 please'), {
    command: 'sensi',
    args: 'Samsung Galaxy A15',
  });
  assert.deepEqual(parseNaturalCommandRequest("what's the best Free Fire sensi for Infinix Hot 40?"), {
    command: 'sensi',
    args: 'Infinix Hot 40',
  });
});

test('natural image requests deterministically select legitimate image generation', () => {
  assert.deepEqual(parseNaturalCommandRequest('Venom create an image of a red and black Free Fire tournament poster'), {
    command: 'imagine',
    args: 'a red and black Free Fire tournament poster',
  });
});

test('natural command shortcut does not hijack general sensitivity conversation', () => {
  assert.equal(parseNaturalCommandRequest('what is sensitivity?'), null);
  assert.equal(parseNaturalCommandRequest('does the bot have a sensi command?'), null);
  assert.equal(parseNaturalCommandRequest('we were discussing sensitivity yesterday'), null);
});
