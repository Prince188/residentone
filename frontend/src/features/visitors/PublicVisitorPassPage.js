import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicVisitorPass } from "../../lib/visitors";

export default function PublicVisitorPassPage() {
  const { id } = useParams();

  const passQuery = useQuery({
    queryKey: ["public-visitor-pass", id],
    queryFn: async () => (await getPublicVisitorPass(id)).data.data,
    enabled: Boolean(id),
  });

  if (passQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-container-low p-4">
        <div className="text-center text-on-surface-variant">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-3 text-body-md font-medium">Loading digital visitor pass...</p>
        </div>
      </div>
    );
  }

  if (passQuery.isError || !passQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-container-low p-4">
        <div className="max-w-md rounded-3xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-lg">
          <span className="material-symbols-outlined text-[48px] text-error">cancel</span>
          <h2 className="mt-3 text-title-lg font-bold text-on-surface">Invalid or Expired Pass</h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            This visitor entry pass is no longer valid or could not be found. Please request a new pass from your host resident.
          </p>
        </div>
      </div>
    );
  }

  const pass = passQuery.data;
  const isExpired = new Date(pass.validUntil) < new Date();
  const isInside = pass.status === "inside";
  const isCheckedOut = pass.status === "checked_out";

  const statusColor = isInside
    ? "bg-emerald-500 text-white"
    : isCheckedOut
    ? "bg-slate-500 text-white"
    : isExpired
    ? "bg-rose-500 text-white"
    : "bg-primary text-on-primary";

  const statusLabel = isInside
    ? "Currently Inside"
    : isCheckedOut
    ? "Checked Out"
    : isExpired
    ? "Pass Expired"
    : "Active & Valid";

  const mapsQuery = encodeURIComponent(
    `${pass.society?.name || "Society"}, ${pass.society?.address || ""} ${pass.society?.city || ""}`
  );
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-container-low via-surface-container-lowest to-surface-container-low px-4 py-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-outline-variant bg-surface-container-lowest shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-primary via-emerald-800 to-teal-900 px-6 py-6 text-white text-center">
          <div className="flex justify-center mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-md">
              <span className="material-symbols-outlined text-[28px]">apartment</span>
            </div>
          </div>
          <h1 className="text-title-lg font-extrabold tracking-tight">{pass.society?.name || "Housing Society"}</h1>
          <p className="text-body-sm text-white/80 mt-0.5">Digital Gate Entry Pass</p>
        </div>

        {/* Status Badge */}
        <div className="px-6 -mt-3 flex justify-center">
          <span className={`rounded-full px-4 py-1 text-label-sm font-extrabold uppercase tracking-wider shadow-md ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        {/* Pass Body */}
        <div className="p-6 space-y-5 text-center">
          <div>
            <span className="text-outline text-[12px] uppercase font-bold tracking-wider">Visitor Name</span>
            <h2 className="text-headline-sm font-extrabold text-on-surface">{pass.name}</h2>
            {pass.company && (
              <p className="text-body-sm font-semibold text-primary mt-0.5">
                {pass.company} · {pass.visitorType?.toUpperCase()}
              </p>
            )}
          </div>

          {/* Large Entry PIN Card */}
          <div className="rounded-3xl border-2 border-dashed border-primary/40 bg-primary/5 p-5 shadow-inner">
            <span className="text-[11px] font-bold uppercase tracking-widest text-outline">
              Show at Main Gate
            </span>
            <p className="mt-1 font-mono text-[42px] font-black tracking-[0.2em] text-primary">
              {pass.passcode}
            </p>
            <p className="text-label-sm text-on-surface-variant mt-1">
              Give this 6-digit PIN to the security guard at the gate.
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-left rounded-2xl bg-surface-container-low p-4 text-body-sm border border-outline-variant/40">
            <div>
              <span className="text-outline text-[11px] uppercase font-semibold">Destination:</span>
              <p className="font-bold text-on-surface">House {pass.unit?.label || "—"}</p>
              {pass.unit?.block && (
                <p className="text-label-sm text-on-surface-variant">Block {pass.unit.block}</p>
              )}
            </div>

            <div>
              <span className="text-outline text-[11px] uppercase font-semibold">Host Resident:</span>
              <p className="font-bold text-on-surface truncate">{pass.host?.name || "Resident"}</p>
            </div>

            <div>
              <span className="text-outline text-[11px] uppercase font-semibold">Vehicle:</span>
              <p className="font-mono font-bold text-on-surface">{pass.vehicleNumber || "None / Walking"}</p>
            </div>

            <div>
              <span className="text-outline text-[11px] uppercase font-semibold">Valid Until:</span>
              <p className="font-bold text-on-surface">
                {new Date(pass.validUntil).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>
            </div>
          </div>

          {/* Map Directions Button */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest p-3.5 text-label-md font-bold text-on-surface shadow-xs hover:bg-surface-container-low transition-colors no-underline"
          >
            <span className="material-symbols-outlined text-[20px] text-primary">navigation</span>
            <span>Get Directions in Google Maps</span>
          </a>

          <p className="text-[11px] text-outline">
            Powered by <strong>ResidentOne</strong> · Digital Society Gatekeeping
          </p>
        </div>
      </div>
    </div>
  );
}
