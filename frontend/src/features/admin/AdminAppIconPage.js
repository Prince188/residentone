import { useState, useEffect } from "react";
import { getAdminAppConfig, updateLauncherIcon } from "../../lib/appConfig";

const ICON_METADATA = [
  {
    key: "default",
    label: "ResidentOne Classic",
    category: "Standard",
    description: "Default signature emerald and gold theme.",
    image: "/icons/launcher/default.png",
    status: "Production Ready",
  },
  {
    key: "diwali",
    label: "Diwali Festive",
    category: "Festival",
    description: "Decorated with traditional earthen diyas, sparkles & rangoli.",
    image: "/icons/launcher/diwali.png",
    status: "Production Ready",
  },
  {
    key: "navratri",
    label: "Navratri Special",
    category: "Festival",
    description: "Festive circular mandala garland with traditional dandiya sticks.",
    image: "/icons/launcher/navratri.png",
    status: "Production Ready",
  },
  {
    key: "new_year",
    label: "New Year",
    category: "Seasonal",
    description: "New Year celebration theme (Placeholder slot).",
    image: "/icons/launcher/new_year.png",
    status: "Placeholder Slot",
  },
  {
    key: "anniversary",
    label: "ResidentOne Anniversary",
    category: "Special Event",
    description: "ResidentOne platform anniversary celebration slot.",
    image: "/icons/launcher/anniversary.png",
    status: "Placeholder Slot",
  },
  {
    key: "independence_day",
    label: "Independence Day",
    category: "National Event",
    description: "15th August patriotic theme slot.",
    image: "/icons/launcher/independence_day.png",
    status: "Placeholder Slot",
  },
  {
    key: "republic_day",
    label: "Republic Day",
    category: "National Event",
    description: "26th January patriotic theme slot.",
    image: "/icons/launcher/republic_day.png",
    status: "Placeholder Slot",
  },
  {
    key: "holi",
    label: "Holi Festival",
    category: "Festival",
    description: "Festival of colors theme slot.",
    image: "/icons/launcher/holi.png",
    status: "Placeholder Slot",
  },
  {
    key: "christmas",
    label: "Christmas Festive",
    category: "Festival",
    description: "Winter holidays and Christmas theme slot.",
    image: "/icons/launcher/christmas.png",
    status: "Placeholder Slot",
  },
];

export default function AdminAppIconPage() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [selectedKey, setSelectedKey] = useState("default");
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fetchConfig = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await getAdminAppConfig();
      const launcherData = res.data?.data?.launcherIcon || {};
      setConfig(launcherData);
      setSelectedKey(launcherData.activeKey || "default");
    } catch (err) {
      console.error("Failed to fetch app icon config:", err);
      setErrorMessage("Could not load current app icon configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleOpenConfirm = (key) => {
    setSelectedKey(key);
    setShowConfirmModal(true);
  };

  const handleApplyIcon = async () => {
    setSaving(true);
    setSuccessMessage("");
    setErrorMessage("");
    try {
      await updateLauncherIcon({
        activeKey: selectedKey,
        enabled: true,
      });
      setShowConfirmModal(false);
      setSuccessMessage(
        "App icon configuration updated. Supported installed versions will apply the new icon when they synchronize."
      );
      await fetchConfig();
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Failed to update app icon configuration.";
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const currentActiveMeta =
    ICON_METADATA.find((i) => i.key === config?.activeKey) || ICON_METADATA[0];
  const targetMeta =
    ICON_METADATA.find((i) => i.key === selectedKey) || currentActiveMeta;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Mobile App Launcher Icon
          </h1>
          <p className="text-sm text-slate-600">
            Remotely switch the active home screen launcher icon for all installed
            ResidentOne Android preview APKs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchConfig}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin" : ""}`}>
              sync
            </span>
            Refresh
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <span className="material-symbols-outlined text-emerald-600 text-[22px] mt-0.5">
            check_circle
          </span>
          <div className="flex-1 text-sm font-medium">{successMessage}</div>
          <button
            onClick={() => setSuccessMessage("")}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
          <span className="material-symbols-outlined text-rose-600 text-[22px] mt-0.5">
            error
          </span>
          <div className="flex-1 text-sm font-medium">{errorMessage}</div>
          <button
            onClick={() => setErrorMessage("")}
            className="text-rose-700 hover:text-rose-900"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* CURRENTLY ACTIVE ICON CARD */}
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-emerald-500 bg-white p-1 shadow-md">
              <img
                src={currentActiveMeta.image}
                alt={currentActiveMeta.label}
                className="h-full w-full rounded-xl object-contain"
                onError={(e) => {
                  e.target.src = "/icons/launcher/default.png";
                }}
              />
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow">
                <span className="material-symbols-outlined text-[14px]">done</span>
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  CURRENTLY ACTIVE
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-600">
                  Version {config?.version || 1}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {currentActiveMeta.label}
              </h2>
              <p className="text-sm text-slate-600">
                {currentActiveMeta.description}
              </p>
              {config?.updatedAt && (
                <p className="text-xs text-slate-400">
                  Last updated on {new Date(config.updatedAt).toLocaleDateString()}{" "}
                  at {new Date(config.updatedAt).toLocaleTimeString()}
                  {config.updatedBy?.name ? ` by ${config.updatedBy.name}` : ""}
                </p>
              )}
            </div>
          </div>

          {config?.activeKey !== "default" && (
            <button
              onClick={() => handleOpenConfirm("default")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-[18px]">restart_alt</span>
              Reset to Default Icon
            </button>
          )}
        </div>
      </div>

      {/* AVAILABLE ICONS GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            Available Bundled Icons ({ICON_METADATA.length})
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Select an icon to remotely switch on next sync
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ICON_METADATA.map((item) => {
            const isActive = config?.activeKey === item.key;
            const isSelected = selectedKey === item.key;

            return (
              <div
                key={item.key}
                onClick={() => setSelectedKey(item.key)}
                className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all cursor-pointer ${
                  isActive
                    ? "border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20 shadow-sm"
                    : isSelected
                    ? "border-primary bg-primary-fixed/10 ring-2 ring-primary/20 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-inner">
                      <img
                        src={item.image}
                        alt={item.label}
                        className="h-full w-full rounded-lg object-contain"
                        onError={(e) => {
                          e.target.src = "/icons/launcher/default.png";
                        }}
                      />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isActive ? (
                        <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {item.category}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {item.label}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-3">
                  {isActive ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700">
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      Currently Live on Mobile Devices
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenConfirm(item.key);
                      }}
                      className="w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
                    >
                      Activate {item.label}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <span className="material-symbols-outlined text-[28px]">palette</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Switch App Launcher Icon?
                </h3>
                <p className="text-xs text-slate-500">
                  Global Android home screen icon update
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4 border border-slate-200">
              <div className="h-14 w-14 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                <img
                  src={targetMeta.image}
                  alt={targetMeta.label}
                  className="h-full w-full rounded-lg object-contain"
                  onError={(e) => {
                    e.target.src = "/icons/launcher/default.png";
                  }}
                />
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  New Active Icon
                </div>
                <div className="text-base font-bold text-slate-900">
                  {targetMeta.label}
                </div>
                <div className="text-xs text-slate-500">
                  Will increment config version to v{(config?.version || 1) + 1}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 p-3.5 text-xs text-amber-800 border border-amber-200 leading-relaxed">
              <span className="font-bold">Important Notice:</span> Installed preview
              APKs that contain this bundled icon will switch automatically the next
              time they open or synchronize with the backend.
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={saving}
                className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyIcon}
                disabled={saving}
                className="flex-1 rounded-xl bg-emerald-700 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">
                      progress_activity
                    </span>
                    Applying...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check</span>
                    Confirm & Switch
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
