import fs from 'fs';
import path from 'path';
import type { Command } from '../types/command.type';
import {
  CommandRegistry,
  type CommandRegistration,
} from '../core/command-registry';
import { logger } from '../utils/logger';

const registry = new CommandRegistry();

/** Canonical commands only, keyed by primary name (kept for menus/tooling). */
export const commands = registry.commands;

/** Resolve a primary command name or alias in O(1). */
export function resolveCommand(name: string): Command | undefined {
  return registry.resolve(name);
}

/**
 * Recursively scans the commands directory and loads every *.command file.
 * Drop a new file into any subfolder and it is picked up automatically.
 */
export function loadCommands(): void {
  const dir = __dirname;
  const files = walk(dir)
    .filter((file) => /\.command\.(ts|js)$/.test(file))
    .sort();
  const registrations: CommandRegistration[] = [];

  for (const file of files) {
    try {
      const mod = require(file) as { default?: Command; command?: Command };
      const command = mod.default ?? mod.command;
      registrations.push({ command, source: path.relative(dir, file) });
    } catch (err) {
      logger.error({ err }, `Failed to load command: ${file}`);
    }
  }

  const result = registry.rebuild(registrations);
  for (const issue of result.issues) logger.warn(issue);
  logger.info(
    `📦 Loaded ${result.commandCount} commands (${result.lookupCount} names and aliases).`,
  );
}

/** Return all canonical commands grouped by category (for menus). */
export function commandsByCategory(): Record<string, Command[]> {
  return registry.byCategory();
}

/** Recursively collect file paths under a directory. */
function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
