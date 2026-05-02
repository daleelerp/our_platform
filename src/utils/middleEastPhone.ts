import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";

/**
 * ISO 3166-1 alpha-2 codes for Middle East countries (GCC, Levant, Egypt,
 * Iraq, Iran, Turkey, Yemen, Cyprus — common regional definitions).
 */
export const MIDDLE_EAST_COUNTRY_CODES = new Set<CountryCode>([
  "AE",
  "BH",
  "CY",
  "EG",
  "IQ",
  "IR",
  "IL",
  "JO",
  "KW",
  "LB",
  "OM",
  "PS",
  "QA",
  "SA",
  "SY",
  "TR",
  "YE",
]);

/**
 * Validates a mobile number that resolves to a valid national number in one of
 * {@link MIDDLE_EAST_COUNTRY_CODES}. Accepts E.164 (+971…) or, if `profileCountry`
 * is set (from onboarding country picker), national formats for that country.
 */
export function isValidMiddleEastMobileNumber(
  input: string,
  profileCountry?: string | null
): boolean {
  const raw = input.trim();
  if (!raw) return false;

  const defaultCountry =
    profileCountry && /^[A-Z]{2}$/i.test(profileCountry)
      ? (profileCountry.toUpperCase() as CountryCode)
      : undefined;

  const parsed = parsePhoneNumberFromString(raw, defaultCountry);
  if (!parsed?.isValid()) return false;

  const country = parsed.country;
  return !!country && MIDDLE_EAST_COUNTRY_CODES.has(country);
}

/** Returns E.164 string or null if invalid / not a Middle East mobile. */
export function normalizeMiddleEastMobileToE164(
  input: string,
  profileCountry?: string | null
): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const defaultCountry =
    profileCountry && /^[A-Z]{2}$/i.test(profileCountry)
      ? (profileCountry.toUpperCase() as CountryCode)
      : undefined;

  const parsed = parsePhoneNumberFromString(raw, defaultCountry);
  if (!parsed?.isValid()) return null;

  const country = parsed.country;
  if (!country || !MIDDLE_EAST_COUNTRY_CODES.has(country)) return null;

  return parsed.format("E.164");
}
