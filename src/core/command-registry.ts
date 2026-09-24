import type { Command } from '../types/command.type';

export interface CommandRegistration {
  command: Command | null | undefined;
  /** File/module name used only to make startup warnings actionable. */
  source?: string;
}

export interface RegistryBuildResult {
  commandCount: number;
  lookupCount: number;
  issues: string[];
}

/** Normalize command names and aliases exactly once at the registry boundary. */
function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Canonical command registry plus an O(1) lookup index for names and aliases.
 *
 * Primary names always win over aliases. Duplicate names and aliases are
 * reported instead of being silently overwritten, which keeps command routing
 * deterministic as the command set grows.
 */
export class CommandRegistry {
  /** Canonical commands only, keyed by their normalized primary name. */
  readonly commands = new Map<string, Command>();

  /** Primary names and aliases, all pointing at canonical command objects. */
  private lookup = new Map<string, Command>();

  rebuild(registrations: CommandRegistration[]): RegistryBuildResult {
    const nextCommands = new Map<string, Command>();
    const sources = new Map<string, string>();
    const issues: string[] = [];

    // Register every primary name first so a command name always has priority
    // over another command's alias, regardless of filesystem ordering.
    for (const { command, source = 'unknown module' } of registrations) {
      if (!command || typeof command.name !== 'string' || !command.name.trim()) {
        issues.push(`Skipped command without a valid name (${source})`);
        continue;
      }
      if (typeof command.run !== 'function') {
        issues.push(`Skipped command "${command.name}" without run() (${source})`);
        continue;
      }

      const name = normalize(command.name);
      const existing = nextCommands.get(name);
      if (existing) {
        issues.push(
          `Duplicate command name "${name}" in ${source}; keeping ${sources.get(name) ?? existing.name}`,
        );
        continue;
      }

      nextCommands.set(name, command);
      sources.set(name, source);
    }

    const nextLookup = new Map<string, Command>(nextCommands);

    // Add aliases only after all primary names have been reserved.
    for (const [name, command] of nextCommands) {
      const source = sources.get(name) ?? command.name;
      for (const rawAlias of command.aliases ?? []) {
        if (typeof rawAlias !== 'string') continue;
        const alias = normalize(rawAlias);
        if (!alias || alias === name) continue;

        const existing = nextLookup.get(alias);
        if (existing && existing !== command) {
          issues.push(
            `Alias "${alias}" from ${source} conflicts with command "${existing.name}"; alias ignored`,
          );
          continue;
        }
        nextLookup.set(alias, command);
      }
    }

    // Preserve the exported Map object's identity for modules that imported it.
    this.commands.clear();
    for (const [name, command] of nextCommands) {
      this.commands.set(name, command);
    }
    this.lookup = nextLookup;

    return {
      commandCount: this.commands.size,
      lookupCount: this.lookup.size,
      issues,
    };
  }

  resolve(name: string): Command | undefined {
    return this.lookup.get(normalize(name));
  }

  byCategory(): Record<string, Command[]> {
    const grouped: Record<string, Command[]> = {};
    for (const command of this.commands.values()) {
      (grouped[command.category] ??= []).push(command);
    }
    return grouped;
  }
}
