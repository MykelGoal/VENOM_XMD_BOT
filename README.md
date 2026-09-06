<div align="center">

<img src="assets/logo.png" alt="VENOM-XMD" width="100%"/>

# 🕷️ VENOM-XMD

### The Ultimate Multi-Device WhatsApp Bot — **300+ commands**, built on [Baileys](https://github.com/WhiskeySockets/Baileys) + TypeScript

<p align="center">
  <img src="https://img.shields.io/badge/commands-392-39ff88?style=for-the-badge&labelColor=050806" alt="commands"/>
  <img src="https://img.shields.io/badge/language-TypeScript-3178c6?style=for-the-badge&labelColor=050806" alt="typescript"/>
  <img src="https://img.shields.io/badge/baileys-multi--device-00d95f?style=for-the-badge&labelColor=050806" alt="baileys"/>
  <img src="https://img.shields.io/badge/license-MIT-b6ff3c?style=for-the-badge&labelColor=050806" alt="license"/>
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/MykelGoal/VENOM_XMD_BOT?style=social" alt="stars"/>
  <img src="https://img.shields.io/github/forks/MykelGoal/VENOM_XMD_BOT?style=social" alt="forks"/>
</p>

**⚡ Pair once. Paste your `SESSION_ID`. Deploy. That's it.**

No QR scanning on the server. No terminal. Just two variables.

<h3>

[🔑 Get Your Session](https://session-site-2odn.onrender.com) · [🚀 Deploy](#-one-click-deploy) · [💬 Commands](#-command-list) · [🍴 Fork](https://github.com/MykelGoal/VENOM_XMD_BOT/fork)

</h3>

</div>

---

## 🔑 Step 1 — Get Your Session ID

> You only ever do this **once**.

<div align="center">

### 👉 [**CLICK HERE TO PAIR → session-site-2odn.onrender.com**](https://session-site-2odn.onrender.com) 👈

</div>

1. Open the **[VENOM Session Site](https://session-site-2odn.onrender.com)**.
2. Choose **QR Code** 📷 or **Pairing Code** 🔢 and link your WhatsApp.
3. Copy the **`SESSION_ID`** it gives you (it's also sent to your WhatsApp DM).

That's your key. Keep it secret — **it's like a password.**

---

## 🚀 One-Click Deploy

> Deploy in under a minute. You'll be asked for just **two** things:
> **`SESSION_ID`** and **`OWNER_NUMBER`**.

<div align="center">

| Platform | Deploy | Notes |
|:--------:|:------:|-------|
| **Heroku** | [![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/MykelGoal/VENOM_XMD_BOT) | Container stack, runs as a worker |
| **Render** | [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/MykelGoal/VENOM_XMD_BOT) | Free web tier, keep-alive built in |
| **Railway** | [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/MykelGoal/VENOM_XMD_BOT) | Nixpacks auto-build |
| **Koyeb** | [![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy?type=git&repository=github.com/MykelGoal/VENOM_XMD_BOT&branch=main&name=venom-xmd) | Free instance |

</div>

### 🟣 Heroku
1. Click the **Deploy to Heroku** button above.
2. Fill in `SESSION_ID` and `OWNER_NUMBER`.
3. Click **Deploy app** → **View**. Done. 🎉

### 🟢 Render
1. Click **Deploy to Render** (or **New → Blueprint** and paste this repo — it reads `render.yaml`).
2. Add `SESSION_ID` and `OWNER_NUMBER` in the environment.
3. Deploy. To keep a free instance awake 24/7, ping its URL with [UptimeRobot](https://uptimerobot.com).

### 🚂 Railway / Koyeb
1. Click the button (or **New Project → Deploy from GitHub**).
2. Add env vars `SESSION_ID` and `OWNER_NUMBER`.
3. Deploy — Nixpacks builds it automatically.

---

## 🧾 Environment Variables

<div align="center">

### ✅ Required — just these two

</div>

| Variable | Example | What it does |
|----------|---------|--------------|
| `SESSION_ID` | `eyJub2lzZUtleSI6…` | Your session from the [session site](https://session-site-2odn.onrender.com). Bot starts pre-authenticated. |
| `OWNER_NUMBER` | `2348012345678` | Your number (no `+`). Enables owner/admin commands. Comma-separate for multiple. |

<details>
<summary><b>⚙️ Optional variables (sensible defaults — you can ignore these)</b></summary>

<br/>

| Variable | Default | What it does |
|----------|---------|--------------|
| `BOT_NAME` | `VENOM-XMD` | Display name |
| `PREFIX` | `.` | Command prefix |
| `SESSION_SITE_URL` | *(built-in)* | Pre-set to the public session site; change only if you self-host |
| `LOGIN_METHOD` | `both` | `qr` / `pairing` / `both` — used only when `SESSION_ID` is blank |
| `PAIRING_NUMBER` | *(empty)* | Phone number for pairing-code login |
| `AI_API_KEY` · `AI_MODEL` · `AI_BASE_URL` | *(empty)* | For `.ai` / `.translate` (OpenAI-compatible: Groq, OpenRouter…) |
| `GEMINI_API_KEY` | *(empty)* | Use Google Gemini instead (`AI_PROVIDER=gemini`) |
| `AI_AUTO_REPLY` | `false` | Auto-answer normal DMs with AI |
| `STICKER_PACK` · `STICKER_AUTHOR` | `VENOM-XMD` / `venom` | Sticker metadata |

</details>

---

## ✨ Features

- 🧩 **392 auto-loading commands** across **19 categories** — drop a file in, it just works
- 🔑 **Session-ID deploy** — pair once on the site, paste, go. Zero QR on the server
- 🔁 **Auto-reconnect** — survives drops and WhatsApp restarts
- 🛡️ **Middleware pipeline** — cooldown, owner/admin permissions, ban list, anti-link
- 🤖 **AI built in** — `.ai`, `.translate` (OpenAI / Groq / OpenRouter / **Gemini**)
- ⬇️ **Downloaders** — YouTube (audio/video), TikTok (no watermark), Facebook, Spotify, APK, lyrics
- 🎨 **Stickers & media** — image/video → sticker, sticker → image, converters, filters, meme overlays
- 🎌 **Anime** — anime/manga/character lookup, waifu, husbando, neko + 52 reaction GIFs
- 👥 **Full group tools** — kick, add, promote, tagall, lock, welcome, antilink, antispam, warnings
- 🔒 **Privacy/chat ops** — view-once unlock, profile picture, presence, archive/pin
- 🛠️ **Offline utilities** — base64/hex/binary/morse, hashing, uuid, password generator, and more
- 🐳 **Deploy-ready** — Heroku, Render, Railway, Koyeb, Docker, PM2, GitHub Actions CI

---

## 💬 Command List

> Send `.menu` in any chat for the full, always-up-to-date list.

<details>
<summary><b>📋 Click to expand all 392 commands</b></summary>

### General
| Command | Description |
|---------|-------------|
| `.ping` | Latency check |
| `.menu` | List all commands |
| `.help <cmd>` | Help for one command |
| `.alive` | Runtime status |
| `.info` | About the bot |
| `.uptime` | How long it's been running |

### AI *(needs a key — OpenAI-compatible or Gemini)*
| Command | Description |
|---------|-------------|
| `.ai <question>` | Ask the AI anything |
| `.translate <lang> <text>` | Translate text |

### Downloader *(free public endpoints — no key)*
| Command | Description |
|---------|-------------|
| `.play <name>` | Search YouTube → send audio (MP3) |
| `.video <name>` | Search YouTube → send video (MP4) |
| `.ytsearch <query>` | List YouTube results |
| `.tiktok <url>` | TikTok video, no watermark |
| `.tiktokaudio <url>` | Extract TikTok audio |
| `.facebook <url>` | Facebook video (HD when available) |
| `.spotify <url>` | Download a Spotify track |
| `.apk <app>` | Search & download an Android APK |
| `.lyrics <song>` | Fetch song lyrics |

### Anime *(free APIs — no key)*
| Command | Description |
|---------|-------------|
| `.anime <title>` | Anime info + poster |
| `.manga <title>` | Manga info + cover |
| `.character <name>` | Character info + image |
| `.animequote` | Random anime quote |
| `.waifu` / `.husbando` | Random character images |
| `.neko` / `.kitsune` / `.catgirl` | Random neko / foxgirl / catgirl |

_Plus 52 reaction-GIF commands (`.hug`, `.slap`, `.pat`, …)._

### Tools *(free APIs — no key)*
| Command | Description |
|---------|-------------|
| `.weather <city>` | Current weather |
| `.wiki <topic>` | Wikipedia summary |
| `.github <user>` | GitHub profile lookup |
| `.ip <address>` | IP geolocation |
| `.qr <text>` | Generate a QR code |
| `.shorten <url>` | Shorten a URL |
| `.calc <expr>` | Safe calculator |

### Utilities *(100% offline — no API)*
| Command | Description |
|---------|-------------|
| `.base64 encode/decode` | Base64 encode/decode |
| `.binary` / `.hex` / `.morse` | Text ↔ format (auto-detect) |
| `.hash <algo>` · `.md5` · `.sha256` | Hash text |
| `.uuid [n]` | Generate UUID v4 |
| `.password [len]` | Strong random password |
| `.mock` / `.vaporwave` / `.emojify` | Fun text transforms |
| `.reversetext` / `.repeat` | Reverse / repeat text |

### Image
| Command | Description |
|---------|-------------|
| `.wallpaper <query>` | HD wallpapers |
| `.pinterest <query> [n]` | Pinterest image search |
| `.carbon <code>` | Code → beautiful image |
| `.exif` | Metadata of a replied image |
| `.blur` `.sepia` `.invert` … | 15+ image filters |
| `.wasted` `.jail` `.triggered` … | Meme/canvas overlays |

### Media & Converter
| Command | Description |
|---------|-------------|
| `.sticker` | Image/video → sticker |
| `.toimg` | Sticker → image |
| `.take` | Re-brand a sticker |
| `.tomp3` / `.tovn` | Convert audio |
| `.emojimix` `.circlestk` `.roundstk` | Sticker effects |

### Fun *(free APIs)*
| Command | Description |
|---------|-------------|
| `.quote` `.joke` `.meme` | Random content |
| `.dog` / `.cat` | Random animal pics |
| `.advice` `.fact` | Random advice / fact |
| `.dice` `.coinflip` | Roll / flip |

### Group (admin)
| Command | Description |
|---------|-------------|
| `.kick @user` | Remove a member |
| `.add <number>` | Add a member |
| `.promote` / `.demote` | Manage admins |
| `.tagall [msg]` | Mention everyone |
| `.groupinfo` | Group details |
| `.lock` / `.unlock` | Close / open the group |
| `.welcome on/off` | Toggle welcome messages |
| `.antilink on/off` | Anti-link protection |
| `.antispam` `.antibot` `.antiword` | More guards |
| `.warn` / `.unwarn` / `.warnlist` | Warning system |

### User / Privacy (owner)
| Command | Description |
|---------|-------------|
| `.setname` / `.setbio` / `.setpp` | Update bot profile |
| `.getpp` / `.getbio` | Fetch a user's pic / bio |
| `.block` / `.unblock` / `.blocklist` | Manage blocked users |
| `.archive` / `.pin` / `.clearchat` | Chat management |
| `.presence <state>` | Set online/typing/recording |
| `.vv` | Reveal a view-once message |

### Bot / Config (owner)
| Command | Description |
|---------|-------------|
| `.autotyping` `.autoread` `.autorecord` | Passive behaviors |
| `.rejectcall` `.antidelete` `.alwaysonline` | Smart toggles |
| `.cmdreact` `.startupmsg` | More toggles |
| `.mode` `.setvar` `.sudo` `.ignore` | Configuration |
| `.diag` `.reload` `.restart` | Maintenance |

### Economy & Games
| Command | Description |
|---------|-------------|
| `.balance` `.daily` `.work` `.rob` | Economy |
| `.deposit` `.withdraw` `.shop` `.leaderboard` | Banking |
| `.slots` `.blackjack` `.tictactoe` `.hangman` | Games |

</details>

---

## 🐳 Run with Docker

```bash
docker build -t venom-xmd .
docker run -e SESSION_ID="your_id" -e OWNER_NUMBER="2348012345678" \
  -v $(pwd)/sessions:/app/sessions venom-xmd
```

## 💻 Run Locally

```bash
git clone https://github.com/MykelGoal/VENOM_XMD_BOT
cd VENOM_XMD_BOT
npm install
cp .env.example .env      # add SESSION_ID + OWNER_NUMBER
npm run build && npm start
# dev mode (auto-reload):  npm run dev
```

> Running locally you can even skip `SESSION_ID` and just scan the QR shown in
> the terminal — but always set `OWNER_NUMBER`.

---

## 📁 Project Structure

```
src/
├── index.ts              # Entry point
├── config/               # Env + constants
├── core/                 # Socket, auth, connection, session, keep-alive
├── handlers/             # Message / command / event / group / error routing
├── commands/             # 392 auto-loaded commands (19 categories)
├── middleware/           # cooldown, permission, ban, antilink
├── services/             # message, media, ai, download, anime, textutils …
├── database/             # models + repositories (JSON store)
├── types/                # shared TypeScript types
└── utils/                # logger, serialize, helpers
```

---

## ➕ Adding a Command

Create `src/commands/<category>/hello.command.ts`:

```ts
import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const hello: Command = {
  name: 'hello',
  category: 'general',
  description: 'Say hello.',
  async run({ sock, msg }) {
    await reply(sock, msg, '👋 Hello!');
  },
};

export default hello;
```

Save it — the auto-loader registers it on next start. **Done.** 🎉

---

## ⚠️ Disclaimer

- Your `SESSION_ID` is **equivalent to a password** — never share it or commit it.
- The `sessions/` folder holds your login — it's gitignored; **never commit it**.
- Automating WhatsApp can get numbers **banned**. Use a **spare number**, and use responsibly under [WhatsApp's Terms](https://www.whatsapp.com/legal/terms-of-service).
- Not affiliated with or endorsed by WhatsApp or Meta.

---

<div align="center">

## 📝 License

[MIT](LICENSE) — free to use, fork, and modify.

### Built with 🕷️ by **[MykelGoal](https://github.com/MykelGoal)**

**If VENOM-XMD helped you, drop a ⭐ — it means a lot!**

<img src="https://img.shields.io/badge/VENOM--XMD-Advanced%20Automation-39ff88?style=for-the-badge&labelColor=050806" alt="venom-xmd"/>

</div>
