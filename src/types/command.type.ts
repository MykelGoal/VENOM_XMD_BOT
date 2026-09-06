import type { WASocket } from '@whiskeysockets/baileys';
import type { SerializedMessage } from './message.type';

/** Categories used to group commands in the menu. */
export type CommandCategory =
  | 'general'
  | 'group'
  | 'media'
  | 'ai'
  | 'tools'
  | 'fun'
  | 'game'
  | 'economy'
  | 'config'
  | 'bot'
  | 'user'
  | 'image'
  | 'textmaker'
  | 'converter'
  | 'search'
  | 'downloader'
  | 'anime'
  | 'owner';

/** Context object passed into every command's run() method. */
export interface CommandContext {
  sock: WASocket;
  msg: SerializedMessage;
  args: string[];
  /** Everything after the command name, as a single string. */
  text: string;
  prefix: string;
}

/** The shape every command file must default-export. */
export interface Command {
  name: string;
  aliases?: string[];
  category: CommandCategory;
  description: string;
  usage?: string;
  /** Restrict to bot owner. */
  ownerOnly?: boolean;
  /** Restrict to group admins. */
  adminOnly?: boolean;
  /** Only usable inside groups. */
  groupOnly?: boolean;
  run: (ctx: CommandContext) => Promise<void> | void;
}
