import { userRepo } from '../database/repositories/user.repo';

/**
 * True if a user is banned from using the bot. Backed by the user
 * repository (JSON store by default).
 */
export function isBanned(number: string): boolean {
  return userRepo.get(number)?.banned ?? false;
}
