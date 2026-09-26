<div align="center">

<img src="assets/logo.png" alt="VENOM-XMD" width="100%"/>

<br/>

# 🕷️ VENOM-XMD

**Multi-device WhatsApp bot · 450 commands · [Baileys](https://github.com/WhiskeySockets/Baileys) + TypeScript**

<br/>

<img src="https://img.shields.io/badge/commands-450-39ff88?style=for-the-badge&labelColor=050806" alt="commands"/>
<img src="https://img.shields.io/badge/language-TypeScript-3178c6?style=for-the-badge&labelColor=050806" alt="typescript"/>
<img src="https://img.shields.io/badge/baileys-multi--device-00d95f?style=for-the-badge&labelColor=050806" alt="baileys"/>
<img src="https://img.shields.io/badge/node-%E2%89%A520-39ff88?style=for-the-badge&labelColor=050806" alt="node"/>
<img src="https://img.shields.io/badge/license-MIT-b6ff3c?style=for-the-badge&labelColor=050806" alt="license"/>

<br/>

### ⚡ Pair once → paste `SESSION_ID` → deploy. No QR on the server.

<br/>

[![Pair](https://img.shields.io/badge/PAIR-GET_SESSION_ID-39ff88?style=for-the-badge&logo=whatsapp&logoColor=white&labelColor=050806)](https://session-site-2odn.onrender.com)
[![Fork](https://img.shields.io/badge/FORK-ON_GITHUB-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/MykelGoal/VENOM_XMD_BOT/fork)
[![Stars](https://img.shields.io/github/stars/MykelGoal/VENOM_XMD_BOT?style=for-the-badge&label=STAR&labelColor=050806&color=39ff88&logo=github&logoColor=white)](https://github.com/MykelGoal/VENOM_XMD_BOT/stargazers)

</div>

---

## ① 🔑 Pair — once

<div align="center">

[![Pair Now](https://img.shields.io/badge/🔗_PAIR_NOW-session--site--2odn.onrender.com-25D366?style=for-the-badge&logo=whatsapp&logoColor=white&labelColor=050806)](https://session-site-2odn.onrender.com)

*Link WhatsApp — **QR** 📷 or **pairing code** 🔢 — then copy your **`SESSION_ID`**.*
*It's a password — keep it secret 🤫*

</div>

## ② 🚀 Deploy — one click

<div align="center">

| | |
|:---:|:---:|
| [![Heroku](https://img.shields.io/badge/🟣_DEPLOY_TO-HEROKU-430098?style=for-the-badge&logo=heroku&logoColor=white)](https://heroku.com/deploy?template=https://github.com/MykelGoal/VENOM_XMD_BOT) | [![Render](https://img.shields.io/badge/⬛_DEPLOY_TO-RENDER-009688?style=for-the-badge&logo=render&logoColor=white)](https://render.com/deploy?repo=https://github.com/MykelGoal/VENOM_XMD_BOT) |
| [![Railway](https://img.shields.io/badge/🚂_DEPLOY_ON-RAILWAY-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app/new/template?template=https://github.com/MykelGoal/VENOM_XMD_BOT) | [![Koyeb](https://img.shields.io/badge/🔵_DEPLOY_TO-KOYEB-1E2430?style=for-the-badge&logo=koyeb&logoColor=white)](https://app.koyeb.com/deploy?type=git&repository=github.com/MykelGoal/VENOM_XMD_BOT&branch=main&name=venom-xmd) |

*Only **two** settings — everything else has defaults:*

| Variable | Example | |
|:---------|:---------|:--|
| `SESSION_ID` | `VENOM-XXXX-XXXX` | from the [session site](https://session-site-2odn.onrender.com) |
| `OWNER_NUMBER` | `2348012345678` | your number, no `+` |

*Optional:* `MEMORY_URL=mantle:auto` — the AI remembers chats **across redeploys** (free, no signup, AES-256 encrypted; `.aimemory clear` to forget).

</div>

## ③ 💬 Use

<div align="center">

<br/>

**Send <kbd>.menu</kbd> — then try <kbd>.ai</kbd> <kbd>.play</kbd> <kbd>.sticker</kbd> <kbd>.weather</kbd> <kbd>.waifu</kbd>**

**450 commands. One menu. 🎉**

</div>

---

## 🏆 Quiet Free Fire tournaments

Run a 40-player, ₦1,000-entry solo tournament without flooding the group:

- The owner saves the payout account privately once with `.touraccount BANK | NUMBER | NAME`.
- `.tourcreate CODE | date/time` posts one launch announcement and tags members once—without exposing the account.
- Players register with `.tourjoin`; the bot replies in DM with payment details and a unique transfer reference.
- Receipt images/PDFs sent with `.tourproof` are forwarded privately to the first configured `OWNER_NUMBER` for real bank-app verification.
- Admins approve privately with `.tourapprove`; the owner number receives every registration summary and forwarded receipt.
- One compact hidden-tag reminder runs daily at 6 PM WAT, excluding already-approved players; `.tourreminder` can change or disable it.
- Room IDs and passwords go only to checked-in players in DM.
- `.tourround`, `.tourstandings`, and `.tourfinish` calculate and publish controlled round/final updates.
- The complete roster, payment state, check-ins and scores are mirrored to MongoDB and restored before WhatsApp reconnects after a redeploy.

Run `.tourhelp` for the complete organizer workflow. Tournament creation intentionally refuses to start when MongoDB is unavailable, preventing silent data loss on ephemeral hosts.

With `MONGO_URI` configured, the same startup hydration also preserves group settings, access roles, users, economy records, notes, warnings, voice model IDs, wallets and payment state. Chat memory and WhatsApp sessions keep their dedicated persistence mechanisms.

---

## 💳 VTU — ClubKonnect data + bank-transfer collection

Venom uses **ClubKonnect** for the live Nigerian data catalogue and low-cost data delivery. Configure it only in the bot owner's private DM (never in a group or source file):

```
.setkey clubkonnect USERID|APIKEY
```

Flutterwave remains the optional customer-collection lane and is restricted to **bank transfer only**:

```
.setkey flutterwave FLWSECK-xxxxxxxxxxxxxxxx
```

Both credentials are stored in the bot's private settings database and never belong in the repository. Runtime environment fallback remains available through `FLW_SECRET_KEY`, `CLUBKONNECT_USER_ID`, and `CLUBKONNECT_API_KEY`.

| Users | Owner |
|:------|:------|
| `.data [mtn\|glo\|airtel\|9mobile]` — browse current ClubKonnect plans | `.vtu` — provider balances, wallets and sales |
| `.buydata <net> <code> [phone]` — buy from wallet or request a bank-transfer link | `.vtu check` — read-only API/catalogue diagnostics |
| `.airtime <100-20000> [phone]` — airtime when Flutterwave is configured | `.vtu margin <5>` — set data markup % (default 3) |
| `.fund <amount>` — Flutterwave bank-transfer wallet top-up | `.setkey remove clubkonnect` / `.setkey remove flutterwave` |

**How the money and delivery safety work** 🇳🇬

- Flutterwave creates bank-transfer-only checkout links and Venom verifies each payment directly; screenshots are never accepted as payment proof.
- Data prices follow the current ClubKonnect catalogue plus the owner's margin (default 3%, rounded up to ₦5). Exact provider plan IDs are preserved.
- Every debit/credit is recorded in an append-only ledger. Pending orders and provider references persist across restarts.
- Venom requeries ClubKonnect with the original unique request reference before any retry. Ambiguous timeouts, processing, on-hold and network-unresponsive orders remain pending through the provider retry window; Venom refunds only after a definitive cancellation/refund/failure.
- There is no automatic provider failover after an ambiguous submission, preventing duplicate delivery.

*Setup:* Fund the ClubKonnect wallet before selling data. For customer top-ups, complete Flutterwave KYC and enable **Bank Transfer** under Dashboard → Settings → Business Preferences → Payment Methods. Run `.vtu check` for read-only, credential-sanitized diagnostics. Always rotate any API key accidentally posted in chat before deployment.

**⚠️ Durable storage on Render free tier:** redeploys wipe local files. Set a **free** [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) connection string as `MONGO_URI`; operational settings, wallet ledgers and pending provider orders are mirrored and restored on every boot. VTU can fall back to local files, but production money flows should use MongoDB.

---

## 🤖 AI 2.0 — an AI that *does* things

Add any AI key (`.setkey gemini <key>` — free at [aistudio.google.com](https://aistudio.google.com/apikey)) and turn on AI mode (`.aimode on`), and the assistant becomes an **agent**:

> **"play duduke by Simi"** → it downloads and sends the song itself
> **"how much dey my wallet?"** → it checks and tells you
> **"buy MTN 1GB for 0803…"** → it quotes the exact price, you reply **yes**, it delivers (or sends a payment link if your wallet is short)

Works with all providers (DeepSeek, Gemini, Groq, OpenRouter, OpenAI) via function calling. Money moves **only** on your explicit "yes" — matched by deterministic code, never by the model — and owner/admin/group commands are blocked from AI reach.

---

## 💻 Local

Use **Node.js 24 LTS** (Node 20 minimum). `npm install` automatically downloads and verifies the correct standalone `yt-dlp` build plus Deno for YouTube challenges—no system Python or hosting-dashboard variables are required.

```bash
git clone https://github.com/MykelGoal/VENOM_XMD_BOT && cd VENOM_XMD_BOT
npm install
cp .env.example .env   # fill SESSION_ID + OWNER_NUMBER
npm run build && npm start
```

### Development checks

Run the complete quality gate before opening a pull request or deploying:

```bash
npm ci
npm run validate
```

This runs ESLint, strict TypeScript checking, a production build, and automated
registry, persistence, anti-link, anti-delete, retry, and muted-spam tests.

---

<div align="center">

> ⚠️ Automation can get numbers **banned** — use a spare number. Not affiliated with WhatsApp / Meta.

**[MIT](LICENSE)** · Built with 🕷️ by **[MykelGoal](https://github.com/MykelGoal)** · **⭐ if it helped!**

</div>
