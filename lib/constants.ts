import { generateDummyPassword } from "./db/utils";

export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

export const guestRegex = /^guest-\d+$/;

// Lazy singleton — bcrypt.hashSync is CPU-heavy (~300ms) and should NOT
// run at module scope on every cold start. Only needed for timing-safe
// comparison during failed login attempts.
let _dummyPassword: string | null = null;
export function getDummyPassword(): string {
  if (!_dummyPassword) _dummyPassword = generateDummyPassword();
  return _dummyPassword;
}
