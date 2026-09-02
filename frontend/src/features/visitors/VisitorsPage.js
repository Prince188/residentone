import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, {
  selectActiveSociety,
  selectActiveMembership,
} from "../../stores/society.store";
import {
  getVisitors,
  getVisitorStats,
  respondVisitorApproval,
  cancelVisitorPass,
  extractApiError,
} from "../../lib/visitors";
import { hasPermission } from "../../lib/permissions";
import { getSocket } from "../../lib/socket";
import api from "../../lib/api";
import PreApproveModal from "./PreApproveModal";

export default function VisitorsPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("inside"); // 'inside' | 'expected' | 'pending' | 'history'
  const [isPreApproveOpen, setIsPreApproveOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [page, setPage] = useState(1);
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety?.id),
  });

  const canManageVisitors =
    activeMembership &&
    (hasPermission(activeMembership.role, "manage_visitors", permissionsQuery.data) ||
      ["super_admin", "society_admin", "security_guard", "manager"].includes(
        activeMembership.role
      ));

  const myHouses = activeMembership?.units || [];

  // Query Stats
  const statsQuery = useQuery({
    queryKey: ["visitor-stats", activeSociety?.id],
    queryFn: async () => (await getVisitorStats()).data.data,
    enabled: Boolean(activeSociety?.id),
    refetchInterval: 15000,
  });
  const stats = statsQuery.data || { inside: 0, expected: 0, pending: 0, todayTotal: 0 };

  // Query Visitors List
  const visitorsQuery = useQuery({
    queryKey: [
      "visitors",
      activeSociety?.id,
      activeTab,
      selectedType,
      searchQuery,
      page,
    ],
    queryFn: async () =>
      (
        await getVisitors({
          status: activeTab,
          visitorType: selectedType !== "all" ? selectedType : undefined,
          search: searchQuery.trim() || undefined,
          page,
          limit: 15,
        })
      ).data,
    enabled: Boolean(activeSociety?.id),
    refetchInterval: 10000,
  });

  const visitors = visitorsQuery.data?.data || [];
  const pagination = visitorsQuery.data?.pagination || { page: 1, totalPages: 1 };

  // Real-time socket events for visitor approvals & entries
  useEffect(() => {
    if (!activeSociety?.id) return;
    const socket = getSocket(activeSociety.id);
    if (!socket) return;

    const handleVisitorEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
    };

    socket.on("visitor:approval_request", handleVisitorEvent);
    socket.on("visitor:approval_response", handleVisitorEvent);
    socket.on("visitor:checked_in", handleVisitorEvent);
    socket.on("visitor:checked_out", handleVisitorEvent);
    socket.on("visitor:pre_approved", handleVisitorEvent);

    return () => {
      socket.off("visitor:approval_request", handleVisitorEvent);
      socket.off("visitor:approval_response", handleVisitorEvent);
      socket.off("visitor:checked_in", handleVisitorEvent);
      socket.off("visitor:checked_out", handleVisitorEvent);
      socket.off("visitor:pre_approved", handleVisitorEvent);
    };
  }, [activeSociety?.id, queryClient]);

  // Mutation: Respond to Walk-In Approval
  const respondMutation = useMutation({
    mutationFn: async ({ id, action }) => {
      const res = await respondVisitorApproval(id, action);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
      setActionSuccess(`Visitor ${data.name} marked as ${data.status.replace(/_/g, " ")}`);
      setTimeout(() => setActionSuccess(""), 4000);
    },
    onError: (err) => {
      setActionError(extractApiError(err, "Failed to update visitor approval"));
    },
  });

  // Mutation: Cancel Pass
  const cancelMutation = useMutation({
    mutationFn: async (id) => {
      const res = await cancelVisitorPass(id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
      setActionSuccess("Pass cancelled.");
      setTimeout(() => setActionSuccess(""), 3000);
    },
    onError: (err) => {
      setActionError(extractApiError(err, "Failed to cancel pass"));
    },
  });

  const pendingApprovals = visitors.filter((v) => v.status === "pending_approval");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary mb-1"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Dashboard
          </Link>
          <h1 className="page-title flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[28px]">badge</span>
            Visitor Management
          </h1>
          <p className="page-subtitle">
            Pre-approve guests, track delivery entries, and approve walk-ins at the gate
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsPreApproveOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-label-md font-bold text-on-primary hover:opacity-90 shadow-sm transition-opacity cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            <span>Pre-Approve Visitor</span>
          </button>

          {canManageVisitors && (
            <Link
              to="/visitors/terminal"
              className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2.5 text-label-md font-bold text-primary hover:bg-primary/10 transition-colors no-underline"
            >
              <span className="material-symbols-outlined text-[20px]">shield</span>
              <span>Gate Terminal</span>
            </Link>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-body-sm font-bold text-emerald-900 shadow-sm animate-in fade-in">
          <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="flex items-center gap-2 rounded-2xl border border-error/30 bg-error/5 p-4 text-body-sm font-bold text-error shadow-sm animate-in fade-in">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span>{actionError}</span>
        </div>
      )}

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <span className="flex items-center gap-1.5 text-label-sm text-outline font-semibold">
            <span className="material-symbols-outlined text-[18px] text-emerald-600">sensor_door</span>
            Inside Now
          </span>
          <p className="mt-1 text-headline-sm font-extrabold text-emerald-600">{stats.inside}</p>
          <p className="text-[11px] text-on-surface-variant mt-0.5">Currently in society</p>
        </div>

        <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <span className="flex items-center gap-1.5 text-label-sm text-outline font-semibold">
            <span className="material-symbols-outlined text-[18px] text-primary">event_upcoming</span>
            Expected Passes
          </span>
          <p className="mt-1 text-headline-sm font-extrabold text-primary">{stats.expected}</p>
          <p className="text-[11px] text-on-surface-variant mt-0.5">Pre-approved for today</p>
        </div>

        <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <span className="flex items-center gap-1.5 text-label-sm text-outline font-semibold">
            <span className="material-symbols-outlined text-[18px] text-amber-600">pending</span>
            Gate Approvals
          </span>
          <p className="mt-1 text-headline-sm font-extrabold text-amber-600">{stats.pending}</p>
          <p className="text-[11px] text-on-surface-variant mt-0.5">Awaiting resident action</p>
        </div>

        <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <span className="flex items-center gap-1.5 text-label-sm text-outline font-semibold">
            <span className="material-symbols-outlined text-[18px] text-on-surface">history</span>
            Today's Total
          </span>
          <p className="mt-1 text-headline-sm font-extrabold text-on-surface">{stats.todayTotal}</p>
          <p className="text-[11px] text-on-surface-variant mt-0.5">Total visitor entries today</p>
        </div>
      </div>

      {/* REAL-TIME GATE APPROVAL BANNER (When visitor is at the gate) */}
      {stats.pending > 0 && (
        <div className="rounded-3xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 via-surface-container-lowest to-amber-50/40 p-5 shadow-md space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-amber-900 font-extrabold text-title-sm">
            <span className="material-symbols-outlined text-[24px] text-amber-600 animate-pulse">
              doorbell
            </span>
            <span>Visitor Waiting at Security Gate! ({stats.pending})</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pendingApprovals.map((v) => (
              <div
                key={v._id || v.id}
                className="rounded-2xl border border-amber-300 bg-white p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase text-amber-900">
                      {v.visitorType}
                    </span>
                    <h4 className="text-body-md font-extrabold text-on-surface mt-1">{v.name}</h4>
                    <p className="text-label-sm text-on-surface-variant">
                      {v.company ? `${v.company} · ` : ""}
                      {v.phone}
                    </p>
                  </div>
                  <span className="text-label-sm font-bold text-primary">House {v.unitId?.label}</span>
                </div>

                {v.vehicleNumber && (
                  <p className="font-mono text-label-sm font-bold text-on-surface bg-surface-container-low px-2 py-1 rounded-lg inline-block">
                    🚗 {v.vehicleNumber}
                  </p>
                )}

                {/* 3 Interactive Decision Buttons */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => respondMutation.mutate({ id: v._id || v.id, action: "approve" })}
                    disabled={respondMutation.isPending}
                    className="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 py-2 text-[12px] font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>Approve</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => respondMutation.mutate({ id: v._id || v.id, action: "reject" })}
                    disabled={respondMutation.isPending}
                    className="flex items-center justify-center gap-1 rounded-xl bg-error py-2 text-[12px] font-bold text-white hover:bg-error/90 transition-colors cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                    <span>Deny</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => respondMutation.mutate({ id: v._id || v.id, action: "leave_at_gate" })}
                    disabled={respondMutation.isPending}
                    className="flex items-center justify-center gap-1 rounded-xl border border-purple-300 bg-purple-50 py-2 text-[12px] font-bold text-purple-900 hover:bg-purple-100 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">package_2</span>
                    <span>Gate Drop</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN TABS & SEARCH BAR */}
      <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-5">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "inside", label: `Inside (${stats.inside})`, icon: "sensor_door" },
              { id: "expected", label: `Expected (${stats.expected})`, icon: "event_upcoming" },
              { id: "pending", label: `Pending (${stats.pending})`, icon: "pending" },
              { id: "history", label: "History & Logs", icon: "history" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTab(t.id);
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-label-md font-bold transition-all cursor-pointer ${
                  activeTab === t.id
                    ? "bg-primary text-on-primary shadow-xs"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Category & Search Input */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-outline-variant bg-surface py-1.5 px-3 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="guest">Guests</option>
              <option value="delivery">Deliveries</option>
              <option value="cab">Cabs</option>
              <option value="service">Services</option>
              <option value="other">Other</option>
            </select>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search visitor, phone, PIN..."
                className="rounded-xl border border-outline-variant bg-surface py-1.5 pl-9 pr-3 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary w-48 sm:w-60"
              />
            </div>
          </div>
        </div>

        {/* VISITOR CARDS GRID */}
        {visitorsQuery.isLoading ? (
          <div className="p-12 text-center text-on-surface-variant">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-3 text-body-sm font-medium">Loading visitor logs...</p>
          </div>
        ) : visitors.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visitors.map((v) => {
              const isInside = v.status === "inside";
              const isExpected = v.status === "approved" && !v.checkInTime;
              const isPending = v.status === "pending_approval";

              return (
                <div
                  key={v._id || v.id}
                  className="rounded-2xl border border-outline-variant/70 bg-surface-container-low p-4 shadow-sm flex flex-col justify-between space-y-3"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isInside
                                ? "bg-emerald-100 text-emerald-800"
                                : isExpected
                                ? "bg-primary/10 text-primary"
                                : isPending
                                ? "bg-amber-100 text-amber-800"
                                : "bg-surface-container-high text-on-surface-variant"
                            }`}
                          >
                            {v.status.replace(/_/g, " ")}
                          </span>
                          <span className="text-[11px] font-semibold text-outline uppercase">
                            {v.visitorType}
                          </span>
                        </div>
                        <h4 className="text-body-md font-extrabold text-on-surface mt-1 truncate">
                          {v.name}
                        </h4>
                        <p className="text-label-sm text-outline truncate">
                          {v.company ? `${v.company} · ` : ""}
                          {v.phone}
                        </p>
                      </div>

                      <span className="font-mono text-title-sm font-extrabold text-primary shrink-0">
                        #{v.passcode}
                      </span>
                    </div>

                    {/* Metadata Grid */}
                    <div className="mt-3 space-y-1 border-t border-outline-variant/40 pt-2 text-body-sm">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant text-[12px]">Destination:</span>
                        <span className="font-bold text-on-surface">House {v.unitId?.label || "—"}</span>
                      </div>

                      {v.vehicleNumber && (
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant text-[12px]">Vehicle:</span>
                          <span className="font-mono font-bold text-on-surface">{v.vehicleNumber}</span>
                        </div>
                      )}

                      {v.checkInTime && (
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant text-[12px]">Entered Gate:</span>
                          <span className="font-semibold text-on-surface text-[12px]">
                            {new Date(v.checkInTime).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                        </div>
                      )}

                      {v.checkOutTime && (
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant text-[12px]">Departed:</span>
                          <span className="font-semibold text-on-surface text-[12px]">
                            {new Date(v.checkOutTime).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="border-t border-outline-variant/40 pt-2 flex items-center justify-between gap-2">
                    {isExpected && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const shareText = `🚪 *ResidentOne Gate Entry Pass*\n🏢 Society: ${activeSociety?.name || "Society"}\n🏠 House: ${v.unitId?.label || "House"}\n👤 Visitor: ${v.name}\n🔑 *Entry PIN: ${v.passcode}*\nShow this PIN at gate. View pass: ${window.location.origin}/visitor-pass/${v._id || v.id}`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
                          }}
                          className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-700 hover:underline cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">share</span>
                          <span>WhatsApp Pass</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => cancelMutation.mutate(v._id || v.id)}
                          className="text-[12px] font-semibold text-error hover:underline cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {isPending && (
                      <div className="flex w-full gap-1.5">
                        <button
                          type="button"
                          onClick={() => respondMutation.mutate({ id: v._id || v.id, action: "approve" })}
                          className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-center text-[11px] font-bold text-white hover:bg-emerald-700 cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => respondMutation.mutate({ id: v._id || v.id, action: "reject" })}
                          className="flex-1 rounded-lg bg-error py-1.5 text-center text-[11px] font-bold text-white hover:bg-error/90 cursor-pointer"
                        >
                          Deny
                        </button>
                      </div>
                    )}

                    {!isExpected && !isPending && (
                      <span className="text-[11px] text-outline">
                        {new Date(v.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    )}

                    <Link
                      to={`/visitor-pass/${v._id || v.id}`}
                      target="_blank"
                      className="text-[12px] font-semibold text-primary hover:underline ml-auto no-underline flex items-center gap-0.5"
                    >
                      <span>Pass Ticket</span>
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-outline-variant p-10 text-center text-on-surface-variant space-y-2">
            <span className="material-symbols-outlined text-[40px] text-outline/60">
              person_off
            </span>
            <h4 className="text-body-md font-bold text-on-surface">No Visitors Found</h4>
            <p className="text-label-sm text-outline max-w-sm mx-auto">
              {activeTab === "inside"
                ? "There are no visitors currently inside your houses."
                : activeTab === "expected"
                ? "No pre-approved passes scheduled for today. Click '+ Pre-Approve Visitor' to generate an entry pass."
                : "No visitor history records match your search filter."}
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-outline-variant/60 pt-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-xl border border-outline-variant px-3 py-1.5 text-label-sm font-semibold text-on-surface disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span className="text-body-sm text-on-surface-variant font-medium">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-outline-variant px-3 py-1.5 text-label-sm font-semibold text-on-surface disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* PRE-APPROVE MODAL */}
      {isPreApproveOpen && (
        <PreApproveModal
          myHouses={myHouses}
          activeSociety={activeSociety}
          onClose={() => setIsPreApproveOpen(false)}
        />
      )}
    </div>
  );
}
