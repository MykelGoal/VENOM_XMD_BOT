# Contributing to VENOM-XMD

Thanks for your interest in improving VENOM-XMD! 🕷️

## Getting started

1. Fork and clone the repo.
2. `npm ci`
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
Command names and aliases must be unique; registry collisions are reported at
startup instead of being silently overwritten.

## Rules of the road

- Run `npm run validate` before submitting changes. It executes ESLint, strict
  TypeScript checking, the production build, and automated tests.
- One command per file; keep business logic in `services/`.
- Don't commit `.env` or the `sessions/` folder.
- Be respectful in issues and PRs.

## Commit style

Short, imperative present tense: `add sticker command`, `fix reconnect loop`.
