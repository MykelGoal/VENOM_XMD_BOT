<div align="center">

# 🕷️ VENOM-XMD

**A modular, production-ready WhatsApp bot built with [Baileys](https://github.com/WhiskeySockets/Baileys) + TypeScript.**

Clean architecture · auto-loading commands · middleware pipeline · AI · stickers · full group management.

</div>

---

## ✨ Features

- ⚡ **Dual login** — QR code *or* 8-digit pairing code
- 🔁 **Auto-reconnect** on disconnect (survives drops)
- 🧩 **302 auto-loading commands** — add a file, it just works
- 🛡️ **Middleware** — cooldown, owner/admin permissions, ban list, anti-link
- 🤖 **AI built in** — `.ai`, `.translate` (OpenAI / Groq / OpenRouter / **Gemini**)
- 🔌 **20+ free-API commands** — weather, wiki, github, memes, and more (no keys)
- 🎨 **Sticker maker** — image/video → sticker, and sticker → image
- 👥 **Full group tools** — kick, add, promote, demote, tagall, lock/unlock, welcome
- 🎉 **Fun** — quote, joke, dice, coinflip
- 🗃️ **JSON data store** — zero setup, swappable for SQLite/Mongo
- 📦 **Deploy-ready** — PM2, Docker, and GitHub Actions CI included

---

## 📁 Project Structure

```
src/
├── index.ts              # Entry point
├── config/              # Env + constants
├── core/                # Socket, auth, connection, store
├── handlers/            # Message / command / event / group / error routing
├── commands/            # Auto-loaded commands (see categories below)
│   ├── general/  ai/  fun/  media/  group/  owner/
├── middleware/          # cooldown, permission, ban, antilink
├── services/            # message, media, group, ai (business logic)
├── database/            # models + repositories (JSON store)
├── types/               # shared TypeScript types
└── utils/               # logger, serialize, helpers
```

---

## 🚀 Getting Started

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env      # then edit it

# 3. Run (dev, auto-reload)
npm run dev

# 4. Run (production)
npm run build && npm start
# or:  pm2 start ecosystem.config.js
```

### Configuration (`.env`)

| Var | What it does |
|-----|--------------|
| `BOT_NAME` | Display name |
| `PREFIX` | Command prefix (default `.`) |
| `OWNER_NUMBER` | Your number(s), e.g. `2348012345678` |
| `SESSION_ID` | Paste a session from the [session site](https://github.com/MykelGoal/session-site) to deploy pre-authenticated (no QR) |
| `SESSION_SITE_URL` | Your session site URL — needed only for the short `VENOM-XXXX-XXXX` ID |
| `LOGIN_METHOD` | `qr`, `pairing`, or `both` (used only when `SESSION_ID` is blank) |
| `PAIRING_NUMBER` | Phone number for pairing-code login |
| `AI_API_KEY` | Key for AI commands (OpenAI-compatible) |
| `AI_MODEL` | e.g. `gpt-4o-mini` |
| `AI_BASE_URL` | API base URL (swap for Groq/OpenRouter) |
| `AI_AUTO_REPLY` | `true` to auto-answer normal DMs with AI |
| `STICKER_PACK` / `STICKER_AUTHOR` | Sticker metadata |

### 🔑 Deploying with a `SESSION_ID` (recommended)

No terminal, no QR on the server. Pair **once** and paste the result:

1. Open the **[VENOM session site](https://github.com/MykelGoal/session-site)**.
2. Pick **QR** or **Pairing Code** and link your WhatsApp.
3. It shows a session ID (and DMs it to you). Copy it.
4. Set it in your host's environment:

   ```env
   SESSION_ID=VENOM-XXXX-XXXX
   SESSION_SITE_URL=https://your-session-site.onrender.com
   ```

5. Deploy. The bot decodes/fetches the credentials at startup and connects
   already authenticated. 🎉

**Session ID formats accepted:**

| Format | Example | Needs `SESSION_SITE_URL`? | Notes |
|--------|---------|:---:|-------|
| **Short** | `VENOM-K7M2-9XPQ` | ✅ | Recommended — permanent & cloud-backed; the bot auto-refreshes it |
| **Long** | `VENOM~H4sIAAAA…` | ❌ | Self-contained, decodes offline |
| **Plain** | `eyJub2lzZUtleSI6…` | ❌ | Base64 creds (legacy) |

> With a short ID, the bot keeps its cloud copy fresh on every credential
> rotation, so redeploys always restore a valid session automatically.

**Login without a session ID:** leave `SESSION_ID` blank. With `LOGIN_METHOD=qr`,
scan the code printed in the terminal. With `pairing`, set `PAIRING_NUMBER`, then
on your phone go to **Linked Devices → Link with phone number** and enter the
code shown.

---

## 💬 Commands (302 built in)

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

### Tools *(free APIs — no key needed)*
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
| `.base64 encode/decode <text>` | Base64 encode/decode |
| `.binary <text\|bits>` | Text ↔ binary (auto-detect) |
| `.hex <text\|hex>` | Text ↔ hex (auto-detect) |
| `.morse <text\|code>` | Text ↔ Morse (auto-detect) |
| `.hash <algo> <text>` · `.md5` · `.sha256` | Hash text |
| `.uuid [n]` | Generate UUID v4 |
| `.password [len]` | Strong random password |
| `.mock <text>` | mOcKiNg CaSe |
| `.vaporwave <text>` | Ａｅｓｔｈｅｔｉｃ full-width |
| `.emojify <text>` | 🇧🇮🇬 emoji letters |
| `.reversetext <text>` | Reverse text |
| `.repeat <n> <text>` | Repeat text n times |

### Fun *(free APIs — no key needed)*
| Command | Description |
|---------|-------------|
| `.quote` | Random inspirational quote |
| `.joke` | Random joke |
| `.meme` | Random meme |
| `.dog` / `.cat` | Random animal pic |
| `.advice` | Random advice |
| `.fact` | Random fact |
| `.dice [max]` | Roll a dice |
| `.coinflip` | Flip a coin |

### Media
| Command | Description |
|---------|-------------|
| `.sticker` | Image/video → sticker |
| `.toimg` | Sticker → image |
| `.download <url>` | Download a direct media URL |

### Downloader *(free public endpoints — no key)*
| Command | Description |
|---------|-------------|
| `.play <name>` | Search YouTube → send audio (MP3) |
| `.video <name>` | Search YouTube → send video (MP4) |
| `.ytsearch <query>` | List YouTube results (no download) |
| `.tiktok <url>` | TikTok video, no watermark |
| `.tiktokaudio <url>` | Extract TikTok audio |
| `.facebook <url>` | Facebook video (HD when available) |
| `.spotify <url>` | Download a Spotify track |
| `.apk <app>` | Search & download an Android APK |
| `.lyrics <song>` | Fetch song lyrics |

### Anime *(free APIs — no key)*
| Command | Description |
|---------|-------------|
| `.anime <title>` | Anime info + poster (Kitsu) |
| `.manga <title>` | Manga info + cover |
| `.character <name>` | Character info + image |
| `.animequote` | Random anime quote |
| `.waifu` / `.husbando` | Random waifu / husbando image |
| `.neko` / `.kitsune` / `.catgirl` | Random neko / foxgirl / catgirl image |

_Plus 52 reaction-GIF commands (`.hug`, `.slap`, `.pat`, …) under the **Fun** category._

### Image
| Command | Description |
|---------|-------------|
| `.wallpaper <query>` | Search & send HD wallpapers |
| `.pinterest <query> [n]` | Search Pinterest images |
| `.carbon <code>` | Turn code into a carbon-style image |
| `.exif` | Read metadata of a replied image |
| `.blur` `.sepia` `.invert` `.pixelate` … | 15+ image filters (reply to an image) |
| `.wasted` `.jail` `.triggered` `.glass` … | Meme/canvas overlays |

### User / Privacy (owner)
| Command | Description |
|---------|-------------|
| `.setname <name>` | Change bot display name |
| `.setbio <text>` | Change bot about/bio |
| `.setpp` | Set bot profile picture (reply to image) |
| `.getpp [@user]` | Fetch a user's profile picture |
| `.getbio [@user]` | Fetch a user's about/bio |
| `.block` / `.unblock` / `.blocklist` | Manage blocked users |
| `.archive` / `.unarchive` | Archive / unarchive a chat |
| `.pin` / `.unpin` | Pin / unpin a chat |
| `.clearchat` | Clear the current chat |
| `.presence <state>` | Set online/typing/recording presence |
| `.vv` | Reveal a view-once message (reply to it) |

### Group (admin)
| Command | Description |
|---------|-------------|
| `.kick @user` | Remove a member |
| `.add <number>` | Add a member |
| `.promote @user` | Make admin |
| `.demote @user` | Remove admin |
| `.tagall [msg]` | Mention everyone |
| `.groupinfo` | Group details |
| `.lock` / `.unlock` | Close / open the group |
| `.welcome on/off` | Toggle welcome messages |
| `.antilink on/off` | Toggle anti-link protection |

### Owner
| Command | Description |
|---------|-------------|
| `.broadcast <msg>` | Message all groups |
| `.ban @user` / `.unban @user` | Ban / unban from the bot |
| `.restart` | Restart the process |

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

Save it — the auto-loader registers it on next start. Done. 🎉

---

## 🐳 Docker

```bash
docker build -t venom-xmd .
docker run -v $(pwd)/sessions:/app/sessions --env-file .env venom-xmd
```

---

## ⚠️ Notes

- The `sessions/` folder holds your WhatsApp login — **never commit it**.
- Use responsibly and follow WhatsApp's Terms of Service. Automated
  messaging can get numbers banned; use a spare number.

## 📝 License

[MIT](LICENSE) — built with 🕷️ by **venom**.
