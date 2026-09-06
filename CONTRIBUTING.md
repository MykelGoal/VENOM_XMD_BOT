# Contributing to VENOM-XMD

Thanks for your interest in improving VENOM-XMD! 🕷️

## Getting started

1. Fork and clone the repo.
2. `npm install`
3. `cp .env.example .env` and fill in your values.
4. `npm run dev`

## Adding a command

Create a file `src/commands/<category>/<name>.command.ts` that
default-exports a `Command`:

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

The auto-loader registers it on the next start — no central file to edit.

## Rules of the road

- Keep the code type-safe: `npx tsc --noEmit` must pass.
- One command per file; keep business logic in `services/`.
- Don't commit `.env` or the `sessions/` folder.
- Be respectful in issues and PRs.

## Commit style

Short, imperative present tense: `add sticker command`, `fix reconnect loop`.
