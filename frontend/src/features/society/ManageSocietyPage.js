import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import api from "../../lib/api";
import { getHouseCards } from "../../lib/houses";
import { getMembershipRoles, isWingAdmin } from "../../lib/permissions";

function extractError(e, fallback) {
  return e?.response?.data?.error?.message || fallback;
}

export default function ManageSocietyPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const queryClient = useQueryClient();
  const isSocietyAdmin = getMembershipRoles(activeMembership).includes("society_admin") || getMembershipRoles(activeMembership).includes("super_admin");
  const canEdit = isSocietyAdmin;

  const societyQuery = useQuery({
    queryKey: ["society-me", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/me")).data.data,
    enabled: Boolean(activeSociety),
  });

  const housesQuery = useQuery({
    queryKey: ["house-cards", activeSociety?.id],
    queryFn: async () => (await getHouseCards()).data.data,
    enabled: Boolean(activeSociety),
  });

  const membersQuery = useQuery({
    queryKey: ["committee-full", activeSociety?.id],
    queryFn: async () => (await api.get("/memberships")).data.data,
    enabled: Boolean(activeSociety),
  });

  const [form, setForm] = useState({ name: "", address: "", city: "", state: "", pincode: "", contactPersonName: "", contactPhone: "", contactEmail: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(false);
  const [wingSearches, setWingSearches] = useState({}); // { [wing]: query }
  const [assignMsg, setAssignMsg] = useState("");

  useEffect(() => {
    if (societyQuery.data) {
      setForm({
        name: societyQuery.data.name || "",
        address: societyQuery.data.address || "",
        city: societyQuery.data.city || "",
        state: societyQuery.data.state || "",
        pincode: societyQuery.data.pincode || "",
        contactPersonName: societyQuery.data.contactPersonName || "",
        contactPhone: societyQuery.data.contactPhone || "",
        contactEmail: societyQuery.data.contactEmail || "",
      });
    }
  }, [societyQuery.data]);

  const mutate = useMutation({
    mutationFn: async (payload) => (await api.patch("/societies/me", payload)).data.data,
    onSuccess: (data) => {
      setMsg("Society info updated");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["society-me"] });
      queryClient.invalidateQueries({ queryKey: ["society"] });
      setTimeout(() => setMsg(""), 2500);
    },
    onError: (e) => setErr(extractError(e, "Failed to update")),
  });

  const wings = useMemo(() => {
    const houses = housesQuery.data || [];
    const map = new Map();
    houses.forEach((h) => {
      const w = (h.block || "General").toUpperCase();
      if (!map.has(w)) map.set(w, { wing: w, count: 0, floors: new Set() });
      const entry = map.get(w);
      entry.count += 1;
      if (h.floor) entry.floors.add(String(h.floor));
    });
    let list = Array.from(map.values());
    // For apartments: hide General if real wings exist (prevents double counting from legacy sequential 1..N houses)
    const hasRealWing = list.some((x) => x.wing !== "General");
    if (hasRealWing) list = list.filter((x) => x.wing !== "General");
    return list.sort((a, b) => a.wing.localeCompare(b.wing)).map((x) => ({ wing: x.wing, count: x.count, floors: Array.from(x.floors).sort() }));
  }, [housesQuery.data]);

  const allMemberships = useMemo(() => membersQuery.data || [], [membersQuery.data]);
  const wingAdmins = useMemo(() => allMemberships.filter((m) => isWingAdmin(m)), [allMemberships]);

  const wingAdminByWing = useMemo(() => {
    const map = {};
    wingAdmins.forEach((m) => {
      const wings = m.assignedWings || [];
      wings.forEach((w) => {
        const key = String(w).toUpperCase();
        if (!map[key]) map[key] = [];
        map[key].push(m);
      });
    });
    return map;
  }, [wingAdmins]);

  // per-wing search helper
  const getFilteredForWing = (wing) => {
    const q = (wingSearches[wing] || "").trim().toLowerCase();
    if (q.length < 2) return [];
    return allMemberships.filter((m) => {
      const name = (m.userId?.name || "").toLowerCase();
      const phone = (m.userId?.phone || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    }).slice(0, 6);
  };

  const assignWingAdmin = useMutation({
    mutationFn: async ({ memberId, wing }) => {
      const m = allMemberships.find((x) => String(x._id) === String(memberId));
      if (!m) throw new Error("Member not found");
      const existing = (m.assignedWings || []).map((w) => String(w).toUpperCase());
      let newWings;
      let newRole = m.role;
      const roles = getMembershipRoles(m);
      if (roles.includes("wing_admin")) {
        newWings = existing.includes(wing) ? existing : [...existing, wing];
        newRole = m.role; // keep primary, backend will handle additive
      } else {
        newRole = "wing_admin";
        newWings = [wing];
      }
      const res = await api.patch(`/memberships/${memberId}`, { role: newRole, assignedWings: newWings });
      return res.data.data;
    },
    onSuccess: (_data, vars) => {
      setAssignMsg(`Wing admin assigned to Wing ${vars.wing}`);
      queryClient.invalidateQueries({ queryKey: ["committee-full"] });
      setTimeout(() => setAssignMsg(""), 2000);
      setWingSearches((prev) => ({ ...prev, [vars.wing]: "" }));
    },
    onError: (e) => setAssignMsg(extractError(e, "Failed to assign")),
  });

  const unassignWing = useMutation({
    mutationFn: async ({ memberId, wing }) => {
      const res = await api.patch(`/memberships/${memberId}`, { action: "removeWing", wing });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committee-full"] });
    },
  });

  if (!activeSociety) return <div className="p-6 text-body-md">No society selected.</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/dashboard" className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Dashboard
          </Link>
          <h1 className="page-title">Manage Society</h1>
          <p className="page-subtitle">{activeSociety.name} · {societyQuery.data?.city || ""} · {wings.length} wing(s) · {wings.reduce((s,w)=>s+w.count,0) || housesQuery.data?.length || 0} houses</p>
        </div>
        {!canEdit && <span className="text-label-sm text-outline">View only — Society Admin can edit</span>}
      </section>

      {msg && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-label-md text-emerald-800">{msg}</div>}
      {err && <div className="rounded-xl bg-error-container border border-error px-4 py-2 text-label-md text-on-error-container">{err}</div>}

      <section className="rounded-2xl border border-outline-variant/30 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-title-sm font-bold flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><span className="material-symbols-outlined text-[18px]">domain</span></span>
            Society Information
          </h2>
          {canEdit && !editing && <button onClick={() => setEditing(true)} className="rounded-full border border-outline-variant px-4 py-1.5 text-label-md hover:border-primary hover:text-primary">Edit</button>}
        </div>
        {societyQuery.isLoading ? (
          <div className="mt-4 h-24 animate-pulse bg-surface-container rounded-xl" />
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ["Society Name", "name", true],
              ["Address", "address", true],
              ["City", "city", true],
              ["State", "state", true],
              ["Pincode", "pincode", true],
              ["Contact Person", "contactPersonName", true],
              ["Contact Phone", "contactPhone", true],
              ["Contact Email", "contactEmail", true],
            ].map(([label, key, req]) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-label-sm font-semibold text-on-surface-variant">{label} {req && <span className="text-error">*</span>}</span>
                <input
                  disabled={!editing}
                  value={form[key] || ""}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  className={`rounded-xl border px-3 py-2.5 text-body-sm ${editing ? "bg-white border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/10" : "bg-surface-container-low border-outline-variant/30 text-on-surface"} outline-none`}
                />
              </label>
            ))}
          </div>
        )}
        {editing && (
          <div className="mt-4 flex gap-2 justify-end">
            <button onClick={() => { setEditing(false); setErr(""); if (societyQuery.data) setForm({ name: societyQuery.data.name || "", address: societyQuery.data.address || "", city: societyQuery.data.city || "", state: societyQuery.data.state || "", pincode: societyQuery.data.pincode || "", contactPersonName: societyQuery.data.contactPersonName || "", contactPhone: societyQuery.data.contactPhone || "", contactEmail: societyQuery.data.contactEmail || "" }); }} className="rounded-full border px-5 py-2 text-label-md">Cancel</button>
            <button onClick={() => { setErr(""); mutate.mutate(form); }} disabled={mutate.isPending} className="rounded-full bg-primary text-on-primary px-6 py-2 text-label-md font-semibold disabled:opacity-60">{mutate.isPending ? "Saving..." : "Save"}</button>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="rounded-xl bg-surface-container-low p-3">
            <div className="text-title-md font-bold">{wings.reduce((s,w)=>s+w.count,0) || housesQuery.data?.length || 0}</div>
            <div className="text-label-sm text-on-surface-variant">Houses</div>
          </div>
          <div className="rounded-xl bg-surface-container-low p-3">
            <div className="text-title-md font-bold">{wings.length}</div>
            <div className="text-label-sm text-on-surface-variant">Wings</div>
          </div>
          <div className="rounded-xl bg-surface-container-low p-3">
            <div className="text-title-md font-bold">{wingAdmins.length}</div>
            <div className="text-label-sm text-on-surface-variant">Wing Admins</div>
          </div>
          <div className="rounded-xl bg-surface-container-low p-3">
            <div className="text-title-md font-bold capitalize">{societyQuery.data?.status || "-"}</div>
            <div className="text-label-sm text-on-surface-variant">Status</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-outline-variant/30 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-title-sm font-bold flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700"><span className="material-symbols-outlined text-[18px]">shield_person</span></span>
            Wings &amp; Wing Admins
          </h2>
          <Link to="/wing/manage" className="inline-flex items-center gap-1.5 rounded-full bg-primary text-on-primary px-4 py-2 text-label-sm font-semibold hover:bg-inverse-surface transition-colors no-underline">
            <span className="material-symbols-outlined text-[18px]">meeting_room</span>
            Manage Wing
          </Link>
        </div>
        <p className="text-body-sm text-on-surface-variant mt-2">Assign a wing admin to each wing. A person can manage multiple wings; each wing can have multiple admins. Use <b>Manage Wing</b> to manage houses for a wing (wing-admin view is wing-scoped).</p>

        {assignMsg && <div className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-label-sm text-primary">{assignMsg}</div>}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {wings.map(({ wing, count, floors }) => (
            <div key={wing} className="rounded-2xl border border-outline-variant/40 bg-surface-container-low/40 p-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold">{wing}</span>
                <div className="flex-1">
                  <h3 className="font-bold leading-none">Wing {wing}</h3>
                  <p className="text-body-sm text-on-surface-variant">{count} houses • Floors: {floors.join(", ") || "-"}</p>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-label-sm font-semibold mb-1">Current Wing Admins</p>
                {(wingAdminByWing[wing] || []).length === 0 ? (
                  <p className="text-body-sm text-outline border border-dashed rounded-xl p-3 bg-white text-center">No wing admin for this wing</p>
                ) : (
                  <div className="space-y-2">
                    {(wingAdminByWing[wing] || []).map((m) => (
                      <div key={m._id} className="flex items-center justify-between bg-white rounded-xl border px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-800">{(m.userId?.name || "?").charAt(0).toUpperCase()}</span>
                          <div>
                            <div className="text-body-sm font-semibold leading-none">{m.userId?.name || "Unknown"}</div>
                            <div className="text-label-sm text-on-surface-variant">{m.userId?.phone || ""}</div>
                          </div>
                        </div>
                        {canEdit && <button onClick={() => unassignWing.mutate({ memberId: m._id, wing })} className="text-label-sm text-error hover:underline">Remove</button>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {canEdit && (
                <div className="mt-3 border-t border-outline-variant/20 pt-3">
                  <p className="text-label-sm font-semibold mb-1">Assign Wing Admin to Wing {wing}</p>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input value={wingSearches[wing] || ""} onChange={(e) => setWingSearches((prev) => ({ ...prev, [wing]: e.target.value }))} placeholder="Search name/phone (min 2 chars)" className="w-full rounded-xl border border-outline-variant px-3 py-2 text-body-sm" />
                      {(wingSearches[wing] || "").trim().length >= 2 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border rounded-xl shadow-lg max-h-40 overflow-auto">
                          {getFilteredForWing(wing).length === 0 ? <p className="p-2 text-body-sm text-outline">No members</p> : getFilteredForWing(wing).map((mem) => (
                            <button key={mem._id} type="button" onClick={() => { setWingSearches((prev) => ({ ...prev, [wing]: "" })); assignWingAdmin.mutate({ memberId: mem._id, wing }); }} className="w-full text-left px-3 py-2 hover:bg-primary/10 text-body-sm">
                              {mem.userId?.name} • {mem.userId?.phone} <span className="text-label-sm text-outline">({[...[mem.role], ...((mem.additionalRoles)||[])].join(", ")})</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-label-sm text-outline mt-1">Different wings can have different admins. Independent per wing.</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {wings.length === 0 && <p className="mt-4 text-center text-body-sm text-outline">No wings found. Ensure houses have block (wing) set via Structure Builder then approve society.</p>}
      </section>
    </div>
  );
}
