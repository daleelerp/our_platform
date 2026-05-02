import { parsePhoneNumberFromString } from "libphonenumber-js";

/** ISO country code saved on `user_profiles.country` — Egypt only for onboarding phone flow */
export const DEFAULT_ONBOARDING_COUNTRY = "EG";

export const EGYPT_DIAL_DISPLAY = "+20";

/** National digits only (no country code); validates as Egyptian mobile via libphonenumber */
export function isValidEgyptianMobile(nationalDigits: string): boolean {
  const raw = nationalDigits.trim();
  if (!raw) return false;
  const parsed = parsePhoneNumberFromString(raw, "EG");
  return parsed?.isValid() === true && parsed.country === "EG";
}

export function normalizeEgyptianMobileToE164(nationalDigits: string): string | null {
  const raw = nationalDigits.trim();
  if (!raw) return null;
  const parsed = parsePhoneNumberFromString(raw, "EG");
  if (!parsed?.isValid() || parsed.country !== "EG") return null;
  return parsed.format("E.164");
}

/** If stored value is E.164 (+20…), show national part in the input */
export function nationalDigitsFromStored(stored: string): string {
  const raw = stored.trim();
  if (!raw) return "";
  const parsed = parsePhoneNumberFromString(raw, "EG");
  if (parsed?.nationalNumber != null) return String(parsed.nationalNumber);
  return raw.replace(/\D/g, "");
}
