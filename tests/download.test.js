'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  ytDlpRuntimeFlags,
} = require('../dist/services/download.service');

test('yt-dlp uses the running Node 22+ executable for YouTube challenges', () => {
  const flags = ytDlpRuntimeFlags('24.20.0', '/opt/node/bin/node');
  assert.equal(flags.jsRuntimes, 'node:/opt/node/bin/node');
  assert.equal(flags.forceIpv4, true);
  assert.equal(flags.socketTimeout, 30);
});

test('yt-dlp does not advertise an unsupported Node 20 runtime', () => {
  const flags = ytDlpRuntimeFlags('20.20.2', '/usr/bin/node');
  assert.equal(flags.jsRuntimes, undefined);
});

test('deployment configs install standalone yt-dlp builds without Python', () => {
  const root = path.join(__dirname, '..');
  const render = fs.readFileSync(path.join(root, 'render.yaml'), 'utf8');
  const docker = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
  const nixpacks = fs.readFileSync(path.join(root, 'nixpacks.toml'), 'utf8');

  assert.match(render, /NODE_VERSION[\s\S]*24\.20\.0/);
  assert.match(render, /YOUTUBE_DL_FILENAME[\s\S]*yt-dlp_linux/);
  assert.match(render, /YOUTUBE_DL_SKIP_PYTHON_CHECK[\s\S]*"1"/);
  assert.match(docker, /node:24-alpine/);
  assert.match(docker, /yt-dlp_musllinux/);
  assert.match(nixpacks, /nodejs_24/);
  assert.match(nixpacks, /yt-dlp_linux/);
});
