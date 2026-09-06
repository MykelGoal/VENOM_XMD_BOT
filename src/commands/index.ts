import fs from 'fs';
import path from 'path';
import type { Command } from '../types/command.type';
import { logger } from '../utils/logger';

/** Registry of all loaded commands, keyed by primary name. */
export const commands = new Map<string, Command>();

/**
 * Recursively scans the commands directory and loads every *.command
 * file. Drop a new file into any subfolder and it's picked up here —
 * no central switch statement to edit.
 */
export function loadCommands(): void {
  commands.clear();
  const dir = __dirname;
  const files = walk(dir).filter((f) =>
    /\.command\.(ts|js)$/.test(f),
  );

  for (const file of files) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(file);
      const command: Command = mod.default ?? mod.command;
      if (!command?.name || typeof command.run !== 'function') {
        logger.warn(`Skipping invalid command file: ${file}`);
        continue;
      }
      commands.set(command.name.toLowerCase(), command);
    } catch (err) {
      logger.error({ err }, `Failed to load command: ${file}`);
    }
  }

  logger.info(`📦 Loaded ${commands.size} commands.`);
}

/** Return all commands grouped by category (for the menu). */
export function commandsByCategory(): Record<string, Command[]> {
  const grouped: Record<string, Command[]> = {};
  for (const cmd of commands.values()) {
    (grouped[cmd.category] ??= []).push(cmd);
  }
  return grouped;
}

/** Recursively collect file paths under a directory. */
function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
