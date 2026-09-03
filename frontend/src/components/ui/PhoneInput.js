import { useState, useRef, useEffect, useMemo } from "react";
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  getCountryByCode,
  parsePhoneNumber,
  validatePhoneNumber,
} from "../../lib/countries";

const PINNED_COUNTRY_CODES = ["IN", "AE", "US", "GB", "SG", "CA", "AU", "SA", "QA", "OM"];

export default function PhoneInput({
  value = "",
  onChange,
  countryCode,
  onCountryChange,
  defaultCountry = "IN",
  disabled = false,
  required = false,
  id,
  name = "phone",
  placeholder,
  label,
  error,
  helperText,
  showDigitCounter = true,
  className = "",
  inputClassName = "",
  autoFocus = false,
  size = "md",
}) {
  // Parse incoming value to determine initial country and national digits
  const parsed = useMemo(() => {
    return parsePhoneNumber(value, countryCode || defaultCountry);
  }, [value, countryCode, defaultCountry]);

  const [selectedCountry, setSelectedCountry] = useState(
    countryCode ? getCountryByCode(countryCode) : parsed.country || DEFAULT_COUNTRY
  );
  const [nationalNumber, setNationalNumber] = useState(parsed.nationalNumber || "");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Sync internal state when external value or countryCode changes
  useEffect(() => {
    if (countryCode) {
      const c = getCountryByCode(countryCode);
      setSelectedCountry(c);
    }
  }, [countryCode]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const p = parsePhoneNumber(value, selectedCountry.code);
    if (p.nationalNumber !== nationalNumber) {
      setNationalNumber(p.nationalNumber);
    }
    if (!countryCode && p.country && p.country.code !== selectedCountry.code) {
      setSelectedCountry(p.country);
    }
  }, [value]);

  // Click outside listener to close country picker dropdown
  useEffect(() => {
    if (!isDropdownOpen) return;

    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setSearchQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isDropdownOpen]);

  // Filter countries by search query
  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const pinnedCountries = useMemo(() => {
    if (searchQuery.trim()) return [];
    return COUNTRIES.filter((c) => PINNED_COUNTRY_CODES.includes(c.code));
  }, [searchQuery]);

  const emitChange = (newDigits, country) => {
    const targetCountry = country || selectedCountry;
    // Strip non-digits and cap at max allowed
    const cleanDigits = String(newDigits || "").replace(/\D/g, "").slice(0, targetCountry.max);
    setNationalNumber(cleanDigits);

    const fullValue = cleanDigits
      ? targetCountry.code === "IN"
        ? cleanDigits // For backward compatibility with India standard numbers in existing API
        : `${targetCountry.dialCode}${cleanDigits}`
      : "";

    const isValid = validatePhoneNumber(cleanDigits, targetCountry);

    // Call onChange with synthetic event or callback parameters
    if (typeof onChange === "function") {
      onChange({
        target: {
          name,
          id: id || name,
          value: fullValue,
          nationalNumber: cleanDigits,
          countryCode: targetCountry.code,
          dialCode: targetCountry.dialCode,
          isValid,
        },
        value: fullValue,
        nationalNumber: cleanDigits,
        country: targetCountry,
        isValid,
      });
    }
  };

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    setSearchQuery("");
    onCountryChange?.(country.code);

    // Adjust current digits if exceeding new country's max
    const trimmed = nationalNumber.slice(0, country.max);
    emitChange(trimmed, country);
  };

  const handleInputChange = (e) => {
    let inputVal = e.target.value;
    emitChange(inputVal, selectedCountry);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const parsedPaste = parsePhoneNumber(pasted, selectedCountry.code);

    if (parsedPaste.country && parsedPaste.country.code !== selectedCountry.code) {
      setSelectedCountry(parsedPaste.country);
      onCountryChange?.(parsedPaste.country.code);
      emitChange(parsedPaste.nationalNumber, parsedPaste.country);
    } else {
      emitChange(parsedPaste.nationalNumber, selectedCountry);
    }
  };

  const isExactLengthMet = nationalNumber.length === selectedCountry.max;
  const isInputFilled = nationalNumber.length > 0;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={id || name}
          className="block text-label-md font-semibold text-on-surface mb-1.5"
        >
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}

      {/* Unified Input Box Container */}
      <div
        className={`relative flex items-center w-full rounded-xl border bg-surface transition-all ${
          error
            ? "border-error focus-within:border-error focus-within:ring-1 focus-within:ring-error"
            : "border-outline-variant focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
        } ${disabled ? "bg-surface-container-low opacity-60 cursor-not-allowed" : ""} ${inputClassName}`}
        ref={dropdownRef}
      >
        {/* Country Code Selector Button */}
        <div className="relative shrink-0">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
            className={`flex items-center gap-1 pl-3 pr-2 py-2 text-body-sm font-semibold text-on-surface hover:bg-surface-container-low rounded-l-xl transition-colors focus:outline-none ${
              disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            } ${size === "sm" ? "py-1.5 text-body-xs" : size === "lg" ? "py-3 text-[15px]" : "py-2 text-body-sm"}`}
          >
            <span className="text-[16px] leading-none" role="img" aria-label={selectedCountry.name}>
              {selectedCountry.flag}
            </span>
            <span className="font-mono text-body-sm font-bold text-on-surface">
              {selectedCountry.dialCode}
            </span>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant/70">
              {isDropdownOpen ? "arrow_drop_up" : "arrow_drop_down"}
            </span>
          </button>

          {/* Searchable Country Picker Dropdown Popover */}
          {isDropdownOpen && (
            <div className="absolute left-0 top-full z-50 mt-1.5 w-72 sm:w-80 max-h-72 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl animate-in fade-in zoom-in-95 duration-100 flex flex-col">
              {/* Dropdown Search Bar */}
              <div className="p-2 border-b border-outline-variant/60 bg-surface-container-low">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-outline pointer-events-none">
                    search
                  </span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search country or code..."
                    className="w-full rounded-xl border border-outline-variant bg-surface py-1.5 pl-8 pr-3 text-[12px] text-on-surface focus:border-primary focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Country List */}
              <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/30 py-1">
                {/* Pinned Quick Select Countries */}
                {pinnedCountries.length > 0 && !searchQuery && (
                  <div className="pb-1 mb-1">
                    <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-outline bg-surface-container-high/40">
                      Popular Countries
                    </div>
                    {pinnedCountries.map((c) => (
                      <button
                        key={`pinned-${c.code}`}
                        type="button"
                        onClick={() => handleCountrySelect(c)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-primary/5 transition-colors cursor-pointer ${
                          selectedCountry.code === c.code ? "bg-primary/10 font-bold text-primary" : "text-on-surface"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[16px] shrink-0">{c.flag}</span>
                          <span className="text-[13px] truncate">{c.name}</span>
                        </div>
                        <span className="font-mono text-[11px] font-bold text-on-surface-variant shrink-0 ml-2">
                          {c.dialCode}
                        </span>
                      </button>
                    ))}
                    <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-outline bg-surface-container-high/40 mt-1">
                      All Countries
                    </div>
                  </div>
                )}

                {filteredCountries.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCountrySelect(c)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-primary/5 transition-colors cursor-pointer ${
                      selectedCountry.code === c.code ? "bg-primary/10 font-bold text-primary" : "text-on-surface"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[16px] shrink-0">{c.flag}</span>
                      <span className="text-[13px] truncate">{c.name}</span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-on-surface-variant shrink-0 ml-2">
                      {c.dialCode}
                    </span>
                  </button>
                ))}

                {filteredCountries.length === 0 && (
                  <div className="p-4 text-center text-[12px] text-outline">
                    No country matches "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Vertical Divider */}
        <span className="h-5 w-[1px] bg-outline-variant/60 shrink-0 mx-0.5" />

        {/* National Number Input Field */}
        <div className="relative flex-1 min-w-0">
          <input
            id={id || name}
            name={name}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            disabled={disabled}
            required={required}
            autoFocus={autoFocus}
            value={nationalNumber}
            onChange={handleInputChange}
            onPaste={handlePaste}
            maxLength={selectedCountry.max}
            placeholder={placeholder || selectedCountry.placeholder || `${selectedCountry.max}-digit number`}
            className={`w-full bg-transparent border-0 py-2.5 pl-2.5 pr-8 text-body-sm font-medium text-on-surface placeholder:text-outline/60 focus:outline-none focus:ring-0 ${
              size === "sm" ? "py-1.5 text-body-xs" : size === "lg" ? "py-3 text-[15px]" : "py-2.5 text-body-sm"
            }`}
          />

          {/* Clean Subtle Digit Status Badge */}
          {showDigitCounter && isInputFilled && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              {isExactLengthMet ? (
                <span className="material-symbols-outlined text-[16px] text-emerald-600 font-bold">
                  check_circle
                </span>
              ) : (
                <span className="font-mono text-[10px] font-semibold text-outline">
                  {nationalNumber.length}/{selectedCountry.max}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error or Helper Message only when provided */}
      {error && <p className="mt-1 text-body-xs font-semibold text-error">{error}</p>}
      {helperText && !error && <p className="mt-1 text-body-xs text-on-surface-variant">{helperText}</p>}
    </div>
  );
}
