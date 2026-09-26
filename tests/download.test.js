'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  ytDlpRuntimeArgs,
} = require('../dist/services/download.service');

test('yt-dlp prefers the project-installed Deno challenge runtime', () => {
  assert.deepEqual(
    ytDlpRuntimeArgs('20.20.2', '/usr/bin/node', '/app/node_modules/deno/deno'),
    ['--js-runtimes', 'deno:/app/node_modules/deno/deno'],
  );
});

test('yt-dlp can fall back to Node 22+ but not unsupported Node 20', () => {
  assert.deepEqual(
    ytDlpRuntimeArgs('24.20.0', '/opt/node/bin/node', ''),
    ['--js-runtimes', 'node:/opt/node/bin/node'],
  );
  assert.deepEqual(ytDlpRuntimeArgs('20.20.2', '/usr/bin/node', ''), []);
});

test('project install verifies a standalone yt-dlp without dashboard variables', () => {
  const root = path.join(__dirname, '..');
  const pkg = require('../package.json');
  const installer = fs.readFileSync(
    path.join(root, 'scripts/install-ytdlp.cjs'),
    'utf8',
  );
  const downloadService = fs.readFileSync(
    path.join(root, 'src/services/download.service.ts'),
    'utf8',
  );
  const render = fs.readFileSync(path.join(root, 'render.yaml'), 'utf8');
  const docker = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
  const nixpacks = fs.readFileSync(path.join(root, 'nixpacks.toml'), 'utf8');

  assert.equal(pkg.scripts.postinstall, 'node scripts/install-ytdlp.cjs');
  assert.equal(pkg.dependencies.deno, '2.9.5');
  assert.equal(pkg.dependencies['youtube-dl-exec'], undefined);
  assert.match(installer, /SHA2-256SUMS/);
  assert.match(installer, /node_modules', '\.venom-tools'/);
  assert.match(
    downloadService,
    /youtube:player_client=android_vr,web_embedded/,
  );
  assert.match(render, /buildCommand: npm ci && npm run build/);
  assert.match(docker, /node:24-bookworm-slim/);
  assert.match(docker, /COPY scripts\/install-ytdlp\.cjs/);
  assert.match(nixpacks, /nodejs_24/);
});
