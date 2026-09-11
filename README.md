<div align="center">

<img src="assets/logo.png" alt="VENOM-XMD" width="100%"/>

<br/>

# 🕷️ VENOM-XMD

**Multi-device WhatsApp bot · 398 commands · [Baileys](https://github.com/WhiskeySockets/Baileys) + TypeScript**

<br/>

<img src="https://img.shields.io/badge/commands-398-39ff88?style=for-the-badge&labelColor=050806" alt="commands"/>
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

**398 commands. One menu. 🎉**

</div>

---

## 💳 VTU — sell data & airtime (optional, owner-activated)

Turn the bot into a mini VTU shop with **your own** [Flutterwave](https://flutterwave.com) account (free). One command to activate:

```
.setkey flutterwave FLWSECK-xxxxxxxxxxxxxxxx
```

The key is stored in the bot's private database — it never touches the repo. (Prefer env? `FLW_SECRET_KEY` works too.)

| Users | Owner |
|:------|:------|
| `.data [mtn\|glo\|airtel\|9mobile]` — browse bundles + prices | `.vtu` — status: mode, Flutterwave balance, wallets, sales |
| `.buydata <net> <code> [phone]` — instant from wallet, or a payment link | `.vtu margin <5>` — set your data markup % (default 3) |
| `.airtime <100-20000> [phone]` — airtime at face value | `.setkey remove flutterwave` — deactivate |

**How the money works** 🇳🇬

- Payment links (card / bank transfer / USSD) via Flutterwave; the bot verifies every payment with Flutterwave itself before delivering — never a screenshot.
- `.fund <amount>` tops up a user's wallet; wallet balance buys are instant.
- Data sells at Flutterwave price **+ your margin** (default 3%, rounded up to ₦5); airtime sells at face value.
- Every kobo is tracked in an append-only ledger — wallets survive restarts, failed deliveries auto-refund, and duplicate payment notifications can never double-credit.

*Note (merchant mode): Flutterwave charges bills to your Flutterwave balance, so keep it funded — check it anytime with `.vtu`.*

---

## 🤖 AI 2.0 — an AI that *does* things

Add any AI key (`.setkey gemini <key>` — free at [aistudio.google.com](https://aistudio.google.com/apikey)) and turn on AI mode (`.aimode on`), and the assistant becomes an **agent**:

> **"play duduke by Simi"** → it downloads and sends the song itself
> **"how much dey my wallet?"** → it checks and tells you
> **"buy MTN 1GB for 0803…"** → it quotes the exact price, you reply **yes**, it delivers (or sends a payment link if your wallet is short)

Works with all providers (DeepSeek, Gemini, Groq, OpenRouter, OpenAI) via function calling. Money moves **only** on your explicit "yes" — matched by deterministic code, never by the model — and owner/admin/group commands are blocked from AI reach.

---

## 💻 Local

```bash
git clone https://github.com/MykelGoal/VENOM_XMD_BOT && cd VENOM_XMD_BOT
npm install && cp .env.example .env   # fill SESSION_ID + OWNER_NUMBER
npm run build && npm start
```

---

<div align="center">

> ⚠️ Automation can get numbers **banned** — use a spare number. Not affiliated with WhatsApp / Meta.

**[MIT](LICENSE)** · Built with 🕷️ by **[MykelGoal](https://github.com/MykelGoal)** · **⭐ if it helped!**

</div>
