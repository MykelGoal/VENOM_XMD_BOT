'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CommandRegistry } = require('../dist/core/command-registry');

function command(name, aliases = [], category = 'tools') {
  return {
    name,
    aliases,
    category,
    description: name,
    async run() {},
  };
}

test('registry resolves normalized primary names and aliases in O(1)', () => {
  const registry = new CommandRegistry();
  const play = command('Play', ['p', 'SONG']);
  const result = registry.rebuild([{ command: play, source: 'play.command.js' }]);

  assert.equal(result.commandCount, 1);
  assert.equal(result.lookupCount, 3);
  assert.equal(registry.resolve('play'), play);
  assert.equal(registry.resolve(' P '), play);
  assert.equal(registry.resolve('song'), play);
  assert.equal(registry.resolve('missing'), undefined);
});

test('primary names beat conflicting aliases and collisions are reported', () => {
  const registry = new CommandRegistry();
  const alpha = command('alpha', ['beta', 'shared']);
  const beta = command('beta', ['shared']);
  const duplicateAlpha = command('ALPHA', ['other']);

  const result = registry.rebuild([
    { command: alpha, source: 'alpha.command.js' },
    { command: beta, source: 'beta.command.js' },
    { command: duplicateAlpha, source: 'duplicate.command.js' },
  ]);

  assert.equal(result.commandCount, 2);
  assert.equal(registry.resolve('alpha'), alpha);
  assert.equal(registry.resolve('beta'), beta);
  assert.equal(registry.resolve('shared'), alpha);
  assert.ok(result.issues.some((issue) => issue.includes('Duplicate command name')));
  assert.ok(result.issues.some((issue) => issue.includes('Alias "beta"')));
  assert.ok(result.issues.some((issue) => issue.includes('Alias "shared"')));
});

test('category grouping includes canonical commands only', () => {
  const registry = new CommandRegistry();
  const help = command('help', ['h'], 'general');
  const ping = command('ping', ['latency'], 'bot');
  registry.rebuild([
    { command: help },
    { command: ping },
  ]);

  assert.deepEqual(registry.byCategory(), {
    general: [help],
    bot: [ping],
  });
});
