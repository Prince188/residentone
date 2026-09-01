import { useState, useEffect } from "react";

export const PROPERTY_TYPES = [
  { value: "flat", label: "Flat / Apartment", icon: "apartment" },
  { value: "villa", label: "Villa", icon: "villa" },
  { value: "row_house", label: "Row House", icon: "cottage" },
  { value: "penthouse", label: "Penthouse", icon: "domain" },
  { value: "studio", label: "Studio", icon: "bed" },
  { value: "shop", label: "Commercial Shop", icon: "storefront" },
  { value: "office", label: "Office Unit", icon: "business_center" },
  { value: "plot", label: "Open Plot", icon: "landscape" },
];

export default function EditHouseModal({
  house,
  open,
  onClose,
  onSave,
  isSaving,
  error,
}) {
  const [label, setLabel] = useState(house?.label || "");
  const [block, setBlock] = useState(house?.block || "");
  const [floor, setFloor] = useState(house?.floor ?? "");
  const [doorNo, setDoorNo] = useState(house?.doorNo || "");
  const [propertyType, setPropertyType] = useState(house?.propertyType || "flat");

  useEffect(() => {
    if (house) {
      setLabel(house.label || "");
      setBlock(house.block || "");
      setFloor(house.floor ?? "");
      setDoorNo(house.doorNo || "");
      setPropertyType(house.propertyType || "flat");
    }
  }, [house, open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e) => {
      if (e.key === "Escape" && !isSaving) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, isSaving, onClose]);

  if (!open || !house) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    onSave({
      label: label.trim(),
      block: block.trim() || null,
      floor: floor !== "" ? Number(floor) : null,
      doorNo: doorNo.trim() || null,
      propertyType,
    });
  };

  const selectedPropType =
    PROPERTY_TYPES.find((p) => p.value === propertyType) || PROPERTY_TYPES[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Semi-transparent backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity"
        onClick={isSaving ? undefined : onClose}
      />

      {/* Standalone Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 my-auto flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-outline-variant/40 bg-surface-container-lowest shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-outline-variant/20 bg-gradient-to-r from-primary/10 via-surface-container-low to-surface-container-lowest p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-sm">
                <span className="material-symbols-outlined text-[26px]">home_work</span>
              </div>
              <div>
                <h3 className="text-title-lg font-bold text-on-surface">Edit House Details</h3>
                <p className="text-body-sm text-on-surface-variant">
                  Update unit number, block, and property specifications
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              aria-label="Close"
              className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Live Preview Pill */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[18px] text-primary">
                {selectedPropType.icon}
              </span>
              <p className="truncate text-body-sm font-semibold text-on-surface">
                House {label || "—"} {block ? `· Wing ${block}` : ""}{" "}
                {floor !== "" ? `· Floor ${floor}` : ""}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              {selectedPropType.label.split(" ")[0]}
            </span>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-error/30 bg-error/10 p-3.5 text-body-sm text-error">
            {error}
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col p-5 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-label-sm font-bold text-on-surface flex items-center gap-1.5 mb-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">tag</span>
              House / Flat Number <span className="text-error">*</span>
            </label>
            <input
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. 101, B-402, Villa 12"
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-label-sm font-bold text-on-surface flex items-center gap-1.5 mb-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">apartment</span>
                Wing / Block
              </label>
              <input
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                placeholder="e.g. A, Tower 2"
                className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
            </div>
            <div>
              <label className="text-label-sm font-bold text-on-surface flex items-center gap-1.5 mb-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">layers</span>
                Floor Number
              </label>
              <input
                type="number"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="e.g. 1, 4, 12"
                className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-label-sm font-bold text-on-surface flex items-center gap-1.5 mb-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">door_front</span>
                Door / Physical No
              </label>
              <input
                value={doorNo}
                onChange={(e) => setDoorNo(e.target.value)}
                placeholder="e.g. 101, 102"
                className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
            </div>
            <div>
              <label className="text-label-sm font-bold text-on-surface flex items-center gap-1.5 mb-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">domain</span>
                Property Type
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium cursor-pointer"
              >
                {PROPERTY_TYPES.map((pt) => (
                  <option key={pt.value} value={pt.value}>
                    {pt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-outline-variant/20 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-full border border-outline-variant px-5 py-2.5 text-label-md font-semibold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !label.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-label-md font-semibold text-on-primary shadow-sm hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSaving ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">
                    progress_activity
                  </span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
