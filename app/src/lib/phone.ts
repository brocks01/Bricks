/** A Singapore mobile number: 8 digits starting with 8 or 9, with or without +65. */
export function isSingaporeMobile(input: string): boolean {
  return /^[89]\d{7}$/.test(localDigits(input));
}

/** "+65 9123 4567" → "+6591234567", the form we store. */
export function normalisePhone(input: string): string {
  const digits = localDigits(input);
  return /^[89]\d{7}$/.test(digits) ? `+65${digits}` : input.trim();
}

function localDigits(input: string): string {
  return input.replace(/[\s()-]/g, '').replace(/^\+?65(?=\d{8}$)/, '');
}
