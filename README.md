<div align="center">

# 🕷️ VENOM-XMD

**A modular, production-ready WhatsApp bot built with [Baileys](https://github.com/WhiskeySockets/Baileys) + TypeScript.**

Clean architecture · auto-loading commands · middleware pipeline · AI · stickers · full group management.

</div>

---

## ✨ Features

- ⚡ **Dual login** — QR code *or* 8-digit pairing code
- 🔁 **Auto-reconnect** on disconnect (survives drops)
- 🧩 **Auto-loading commands** — add a file, it just works
- 🛡️ **Middleware** — cooldown, owner/admin permissions, ban list, anti-link
- 🤖 **AI built in** — `.ai`, `.translate` (OpenAI / Groq / OpenRouter compatible)
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
| `LOGIN_METHOD` | `qr`, `pairing`, or `both` |
| `PAIRING_NUMBER` | Phone number for pairing-code login |
| `AI_API_KEY` | Key for AI commands (OpenAI-compatible) |
| `AI_MODEL` | e.g. `gpt-4o-mini` |
| `AI_BASE_URL` | API base URL (swap for Groq/OpenRouter) |
| `AI_AUTO_REPLY` | `true` to auto-answer normal DMs with AI |
| `STICKER_PACK` / `STICKER_AUTHOR` | Sticker metadata |

**Login:** with `qr`, scan the code printed in the terminal. With `pairing`,
set `PAIRING_NUMBER`, then on your phone go to **Linked Devices → Link with
phone number** and enter the code shown.

---

## 💬 Commands (29 built in)

### General
| Command | Description |
|---------|-------------|
| `.ping` | Latency check |
| `.menu` | List all commands |
| `.help <cmd>` | Help for one command |
| `.alive` | Runtime status |
| `.info` | About the bot |
| `.uptime` | How long it's been running |

### AI
| Command | Description |
|---------|-------------|
| `.ai <question>` | Ask the AI anything |
| `.translate <lang> <text>` | Translate text |

### Fun
| Command | Description |
|---------|-------------|
| `.quote` | Random inspirational quote |
| `.joke` | Random joke |
| `.dice [max]` | Roll a dice |
| `.coinflip` | Flip a coin |

### Media
| Command | Description |
|---------|-------------|
| `.sticker` | Image/video → sticker |
| `.toimg` | Sticker → image |
| `.download <url>` | Download a direct media URL |

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
