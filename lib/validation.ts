/** Shortest password the register screen accepts, the same as the Android app. */
export const MIN_PASSWORD_LENGTH = 8;

/** What's wrong with a new password: nothing until something's typed. */
export function passwordProblem(password: string): string | null {
  return password.length > 0 && password.length < MIN_PASSWORD_LENGTH
    ? `At least ${MIN_PASSWORD_LENGTH} characters`
    : null;
}

/** A loose check, just enough to tell a finished email address from a half-typed one. */
export function isEmail(value: string): boolean {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}
