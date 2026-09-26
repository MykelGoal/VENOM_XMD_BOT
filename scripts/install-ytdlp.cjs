'use strict';

/**
 * Install yt-dlp's official self-contained executable during npm install.
 * This deliberately avoids youtube-dl-exec's Python-dependent zipapp so the
 * bot works on Render without dashboard environment-variable changes.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const RELEASE_BASE = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download';
const toolsDir = path.join(process.cwd(), 'node_modules', '.venom-tools');
const outputName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const outputPath = path.join(toolsDir, outputName);

function linuxUsesMusl() {
  if (fs.existsSync('/etc/alpine-release')) return true;
  try {
    return !process.report?.getReport()?.header?.glibcVersionRuntime;
  } catch {
    return false;
  }
}

function releaseAsset() {
  const arm = process.arch === 'arm64' ? '_aarch64' : '';
  if (process.platform === 'linux') {
    return `yt-dlp_${linuxUsesMusl() ? 'musllinux' : 'linux'}${arm}`;
  }
  if (process.platform === 'darwin') return 'yt-dlp_macos';
  if (process.platform === 'win32' && process.arch === 'x64') {
    return 'yt-dlp.exe';
  }
  throw new Error(
    `No managed yt-dlp build for ${process.platform}/${process.arch}. Set YT_DLP_PATH to a compatible executable.`,
  );
}

async function checkedFetch(url) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`HTTP ${response.status} downloading ${url}`);
  return response;
}

async function install() {
  if (process.env.YT_DLP_PATH?.trim()) {
    console.log('[yt-dlp] YT_DLP_PATH is set; managed download skipped.');
    return process.env.YT_DLP_PATH.trim();
  }

  const asset = releaseAsset();
  const [binaryResponse, sumsResponse] = await Promise.all([
    checkedFetch(`${RELEASE_BASE}/${asset}`),
    checkedFetch(`${RELEASE_BASE}/SHA2-256SUMS`),
  ]);
  const sums = await sumsResponse.text();
  const expected = sums
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/))
    .find((parts) => parts.at(-1) === asset)?.[0];
  if (!expected) throw new Error(`No SHA-256 checksum published for ${asset}`);

  const data = Buffer.from(await binaryResponse.arrayBuffer());
  const actual = crypto.createHash('sha256').update(data).digest('hex');
  if (actual !== expected) {
    throw new Error(`SHA-256 mismatch for ${asset}; refusing to install it`);
  }

  fs.mkdirSync(toolsDir, { recursive: true });
  const temporary = `${outputPath}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, data, { mode: 0o755 });
  if (process.platform !== 'win32') fs.chmodSync(temporary, 0o755);
  fs.renameSync(temporary, outputPath);
  console.log(`[yt-dlp] Installed verified ${asset} (${(data.length / 1_048_576).toFixed(1)} MiB).`);
  return outputPath;
}

if (require.main === module) {
  install().catch((error) => {
    console.error(`[yt-dlp] Installation failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { install, outputPath, releaseAsset };
