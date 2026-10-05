/**
 * Client-side mirror of backend App\Support\SecurityRules.
 * The backend is the source of truth; this only gives instant feedback.
 */

export const USERNAME_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z][A-Za-z0-9._]{3,29}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const USERNAME_HINT = 'Start with a letter, include at least one number, 4–30 characters. Example: carlos01';

export interface PasswordCheck {
  id: string;
  label: string;
  passed: boolean;
}

export const getPasswordChecks = (password: string): PasswordCheck[] => [
  { id: 'length', label: 'At least 8 characters', passed: password.length >= 8 },
  { id: 'upper', label: 'One uppercase letter (A–Z)', passed: /[A-Z]/.test(password) },
  { id: 'lower', label: 'One lowercase letter (a–z)', passed: /[a-z]/.test(password) },
  { id: 'number', label: 'One number (0–9)', passed: /\d/.test(password) },
  { id: 'special', label: 'One special character (!@#$%^&*)', passed: /[^A-Za-z0-9]/.test(password) },
];

export const isStrongPassword = (password: string): boolean =>
  getPasswordChecks(password).every((c) => c.passed);

export type StrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong';

export const getPasswordStrength = (password: string): StrengthLevel => {
  if (!password) return 'empty';
  const passed = getPasswordChecks(password).filter((c) => c.passed).length;
  if (passed <= 2) return 'weak';
  if (passed === 3) return 'fair';
  if (passed === 4) return 'good';
  return 'strong';
};

/** Login identifier must be a valid email OR a valid username. */
export const validateLoginIdentifier = (value: string): string | null => {
  const v = value.trim();
  if (!v) return 'Enter your email or username.';
  if (v.includes('@')) {
    return EMAIL_REGEX.test(v) ? null : 'Enter a valid email address.';
  }
  return USERNAME_REGEX.test(v) ? null : `Invalid username. ${USERNAME_HINT}`;
};

/** Pulls the first Laravel validation error message from an API error body. */
export const firstApiError = (data: any, fallback = 'Something went wrong.'): string => {
  if (data?.errors) {
    const first = Object.values(data.errors)[0];
    if (Array.isArray(first) && first.length) return String(first[0]);
  }
  return data?.message || fallback;
};
