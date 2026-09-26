/** Flutterwave key/payment helpers shared by commands and the VTU service. */

/**
 * The owner intentionally accepts bank-transfer checkout only. Keep this in a
 * shared constant so the checkout and diagnostics always report the same lane.
 */
export const FLUTTERWAVE_CHECKOUT_OPTIONS = 'banktransfer';

/**
 * Accept current live and test secret-key shapes, while rejecting accidental
 * trailing punctuation (for example copying `...-X.` from a sentence).
 */
export function isValidFlutterwaveSecretKey(value: string): boolean {
  return /^FLWSECK(?:_TEST)?-[A-Za-z0-9_-]+-X$/.test(value.trim());
}

export function isFlutterwaveTestSecretKey(value: string): boolean {
  return value.trim().startsWith('FLWSECK_TEST-');
}
