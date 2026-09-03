export const COUNTRIES = [
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳", min: 10, max: 10, placeholder: "98765 43210" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪", min: 9, max: 9, placeholder: "50 123 4567" },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸", min: 10, max: 10, placeholder: "201 555 0123" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦", min: 10, max: 10, placeholder: "416 555 0123" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧", min: 10, max: 10, placeholder: "7911 123456" },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬", min: 8, max: 8, placeholder: "8123 4567" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺", min: 9, max: 9, placeholder: "412 345 678" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦", min: 9, max: 9, placeholder: "50 123 4567" },
  { code: "QA", name: "Qatar", dialCode: "+974", flag: "🇶🇦", min: 8, max: 8, placeholder: "3312 3456" },
  { code: "OM", name: "Oman", dialCode: "+968", flag: "🇴🇲", min: 8, max: 8, placeholder: "9123 4567" },
  { code: "KW", name: "Kuwait", dialCode: "+965", flag: "🇰🇼", min: 8, max: 8, placeholder: "9123 4567" },
  { code: "BH", name: "Bahrain", dialCode: "+973", flag: "🇧🇭", min: 8, max: 8, placeholder: "3612 3456" },
  { code: "MY", name: "Malaysia", dialCode: "+60", flag: "🇲🇾", min: 9, max: 10, placeholder: "12 345 6789" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", flag: "🇳🇿", min: 8, max: 10, placeholder: "21 123 4567" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪", min: 10, max: 11, placeholder: "151 2345678" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷", min: 9, max: 9, placeholder: "6 12 34 56 78" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦", min: 9, max: 9, placeholder: "71 123 4567" },
  { code: "NP", name: "Nepal", dialCode: "+977", flag: "🇳🇵", min: 10, max: 10, placeholder: "984 1234567" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", flag: "🇱🇰", min: 9, max: 9, placeholder: "71 234 5678" },
  { code: "BD", name: "Bangladesh", dialCode: "+880", flag: "🇧🇩", min: 10, max: 10, placeholder: "1712 345678" },
  { code: "PH", name: "Philippines", dialCode: "+63", flag: "🇵🇭", min: 10, max: 10, placeholder: "917 123 4567" },
  { code: "ID", name: "Indonesia", dialCode: "+62", flag: "🇮🇩", min: 9, max: 12, placeholder: "812 3456 7890" },
  { code: "TH", name: "Thailand", dialCode: "+66", flag: "🇹🇭", min: 9, max: 9, placeholder: "81 234 5678" },
  { code: "IE", name: "Ireland", dialCode: "+353", flag: "🇮🇪", min: 9, max: 9, placeholder: "85 123 4567" },
  { code: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱", min: 9, max: 9, placeholder: "6 12345678" },
  { code: "CH", name: "Switzerland", dialCode: "+41", flag: "🇨🇭", min: 9, max: 9, placeholder: "78 123 45 67" },
  { code: "SE", name: "Sweden", dialCode: "+46", flag: "🇸🇪", min: 9, max: 9, placeholder: "70 123 45 67" },
  { code: "NO", name: "Norway", dialCode: "+47", flag: "🇳🇴", min: 8, max: 8, placeholder: "412 34 567" },
  { code: "DK", name: "Denmark", dialCode: "+45", flag: "🇩🇰", min: 8, max: 8, placeholder: "20 12 34 56" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹", min: 10, max: 10, placeholder: "312 345 6789" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸", min: 9, max: 9, placeholder: "612 34 56 78" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵", min: 10, max: 10, placeholder: "90 1234 5678" },
  { code: "KR", name: "South Korea", dialCode: "+82", flag: "🇰🇷", min: 9, max: 10, placeholder: "10 1234 5678" },
  { code: "HK", name: "Hong Kong", dialCode: "+852", flag: "🇭🇰", min: 8, max: 8, placeholder: "9123 4567" },
  { code: "OTHER", name: "Other / International", dialCode: "+", flag: "🌐", min: 6, max: 15, placeholder: "International number" },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // India (+91)

export function getCountryByCode(code) {
  if (!code) return DEFAULT_COUNTRY;
  return COUNTRIES.find((c) => c.code.toUpperCase() === code.toUpperCase()) || DEFAULT_COUNTRY;
}

export function getCountryByDialCode(dialCode) {
  if (!dialCode) return DEFAULT_COUNTRY;
  const clean = dialCode.startsWith("+") ? dialCode : `+${dialCode}`;
  return COUNTRIES.find((c) => c.dialCode === clean) || DEFAULT_COUNTRY;
}

/**
 * Splits any input phone string (e.g. "+919876543210" or "9876543210")
 * into matching country object and national digits.
 */
export function parsePhoneNumber(phoneStr, defaultCountryCode = "IN") {
  if (!phoneStr) {
    return { country: getCountryByCode(defaultCountryCode), nationalNumber: "" };
  }

  const str = String(phoneStr).trim();
  
  if (str.startsWith("+")) {
    // Sort countries by dialCode length descending to match +971 before +9
    const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
    for (const c of sorted) {
      if (c.code !== "OTHER" && str.startsWith(c.dialCode)) {
        const rawDigits = str.slice(c.dialCode.length).replace(/\D/g, "");
        return { country: c, nationalNumber: rawDigits.slice(0, c.max) };
      }
    }
  }

  // Raw digits without +
  const digits = str.replace(/\D/g, "");
  const defaultCountry = getCountryByCode(defaultCountryCode);

  // If starts with 91 and 12 digits total
  if (digits.startsWith("91") && digits.length === 12) {
    return { country: getCountryByCode("IN"), nationalNumber: digits.slice(2, 12) };
  }

  // Strip leading 0 for national numbers
  const cleaned = digits.startsWith("0") && digits.length > 10 ? digits.replace(/^0+/, "") : digits;

  return { country: defaultCountry, nationalNumber: cleaned.slice(0, defaultCountry.max) };
}

/**
 * Validates national digits according to country rule
 */
export function validatePhoneNumber(nationalNumber, country = DEFAULT_COUNTRY) {
  const digits = String(nationalNumber || "").replace(/\D/g, "");
  if (!digits) return false;
  return digits.length >= country.min && digits.length <= country.max;
}
