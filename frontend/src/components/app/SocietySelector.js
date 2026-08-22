import { useEffect, useRef, useState } from "react";
import useSocietyStore from "../../stores/society.store";

function CheckIcon({ className = "" }) {
  return (
    <span className={`material-symbols-outlined text-[20px] ${className}`}>check</span>
  );
}

export default function SocietySelector() {
  const societies = useSocietyStore((state) => state.societies);
  const activeSocietyId = useSocietyStore((state) => state.activeSocietyId);
  const setActiveSociety = useSocietyStore((state) => state.setActiveSociety);

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const activeMembership =
    societies.find((s) => s.society.id === activeSocietyId) || null;
  const activeSociety = activeMembership?.society || null;
  const activeUnit = activeMembership?.units?.[0] || null;

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (societyId) => {
    setActiveSociety(societyId);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={activeSociety ? `${activeSociety.name}${activeUnit ? ` — ${activeUnit.label}` : ""}` : "Select society"}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 md:px-3 md:py-2 text-left transition-colors hover:bg-surface-container-low cursor-pointer max-w-[46vw] sm:max-w-xs"
      >
        <span className="material-symbols-outlined shrink-0 text-primary text-[22px] hidden sm:block">
          apartment
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-body-sm font-semibold text-on-surface">
            {activeSociety ? activeSociety.name : "Select society"}
          </span>
          <span className="hidden sm:block truncate text-label-sm text-on-surface-variant">
            {activeUnit ? activeUnit.label : "No unit assigned"}
          </span>
        </span>
        <span
          className={`material-symbols-outlined shrink-0 text-on-surface-variant text-[20px] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Switch society"
          className="absolute left-0 md:left-auto right-auto mt-2 w-[calc(100vw-2rem)] max-w-80 sm:w-80 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg overflow-hidden z-50"
        >
          <p className="px-4 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-outline">
            Your Societies
          </p>
          {societies.length === 0 && (
            <p className="px-4 pb-4 text-body-sm text-on-surface-variant">
              You are not a member of any society yet.
            </p>
          )}
          <ul className="max-h-80 overflow-y-auto pb-2">
            {societies.map(({ society, units }) => {
              const isActive = society.id === activeSocietyId;
              const unitLabel = units?.[0]
                ? units[0].label + (units.length > 1 ? ` (+${units.length - 1} more)` : "")
                : "No unit assigned";
              return (
                <li key={society.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(society.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                      isActive
                        ? "bg-primary-fixed text-on-primary-fixed"
                        : "hover:bg-surface-container-low text-on-surface"
                    }`}
                  >
                    <span className="w-5 shrink-0 flex justify-center">
                      {isActive && <CheckIcon />}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block truncate text-body-md font-medium ${
                          isActive ? "text-on-primary-fixed" : "text-on-surface"
                        }`}
                      >
                        {society.name}
                      </span>
                      <span
                        className={`block truncate text-label-sm ${
                          isActive ? "text-on-primary-fixed-variant" : "text-on-surface-variant"
                        }`}
                      >
                        {unitLabel}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
