import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import { getSocietyDirectory } from "../../lib/directory";
import api from "../../lib/api";
import { hasPermissionForMembership, getMembershipRoles, PERMISSIONS as SHARED_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS as SHARED_DEFAULTS } from "../../lib/permissions";
import { getHouseCards } from "../../lib/houses";

const COMMITTEE_ROLES = [
  { value: "wing_admin", label: "Wing Admin" },
  { value: "committee_member", label: "Committee Member" },
  { value: "manager", label: "Manager" },
  { value: "treasurer", label: "Treasurer" },
  { value: "accountant", label: "Accountant" },
  { value: "helpdesk_manager", label: "Helpdesk Manager" },
  { value: "auditor", label: "Auditor" },
];

function extractError(e, fallback) {
  return e?.response?.data?.error?.message || fallback;
}

export default function ManageCommitteePage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const queryClient = useQueryClient();
  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canManageCommittee = hasPermissionForMembership(activeMembership, "manage_committee", permissionsQuery.data);
  const canManagePermissions = getMembershipRoles(activeMembership).includes("society_admin") || getMembershipRoles(activeMembership).includes("super_admin");
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [role, setRole] = useState("committee_member");
  const [selectedWings, setSelectedWings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("committee_member");
  const [editWings, setEditWings] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [showPermissions, setShowPermissions] = useState(false);

  // Strict isolation: when selected society changes, reset all local UI state
  // This prevents mixing data from previous society when admin is in 2 societies
  useEffect(() => {
    setSearch("");
    setSelected(null);
    setShowForm(false);
    setEditingId(null);
    setMsg("");
    setErr("");
  }, [activeSociety?.id]);

  const membersQuery = useQuery({
    queryKey: ["committee-full", activeSociety?.id],
    queryFn: async () => {
      const res = await api.get("/memberships", { headers: { "x-society-id": activeSociety.id } });
      return res.data.data || [];
    },
    enabled: Boolean(activeSociety),
  });

  // eslint-disable-next-line no-unused-vars
  const directoryQuery = useQuery({
    queryKey: ["directory", activeSociety?.id],
    queryFn: async () => (await getSocietyDirectory()).data.data,
    enabled: Boolean(activeSociety),
  });

  // Available wings for Wing Admin (derived from houses block)
  const wingsQuery = useQuery({
    queryKey: ["house-cards", activeSociety?.id],
    queryFn: async () => (await getHouseCards()).data.data,
    enabled: Boolean(activeSociety),
  });
  const availableWings = useMemo(() => {
    const houses = wingsQuery.data || [];
    const set = new Set();
    houses.forEach((h) => { if (h.block) set.add(String(h.block).toUpperCase()); });
    return Array.from(set).sort();
  }, [wingsQuery.data]);

  // Strictly scoped to selected society: memoize to prevent mixing when switching societies
  const allMemberships = useMemo(() => membersQuery.data || [], [membersQuery.data]);
  const committeeRolesSet = useMemo(
    () => new Set(COMMITTEE_ROLES.map((r) => r.value).concat(["society_admin", "super_admin", "wing_admin"])),
    []
  );
  // One card per user per role only - supports dual roles (society_admin + wing_admin = separate cards)
  const committeeMembers = useMemo(() => {
    const expanded = [];
    allMemberships.forEach((m) => {
      const roles = getMembershipRoles(m).filter((r) => committeeRolesSet.has(r));
      if (roles.length === 0 && committeeRolesSet.has(m.role)) roles.push(m.role);
      roles.forEach((r) => {
        expanded.push({ ...m, role: r, _virtualKey: `${String(m._id)}-${r}`, originalRole: m.role, _isAdditional: (m.additionalRoles || []).includes(r) && m.role !== r });
      });
    });
    const map = new Map();
    expanded.forEach((m) => {
      if (!map.has(m._virtualKey)) map.set(m._virtualKey, m);
    });
    return Array.from(map.values());
  }, [allMemberships, committeeRolesSet]);

  // Group by role for headings: Society Admin, Manager, etc. One person with 2 roles appears in 2 groups
  const ROLE_ORDER = ["super_admin", "society_admin", "wing_admin", "manager", "treasurer", "accountant", "helpdesk_manager", "auditor", "committee_member"];
  const ROLE_LABELS = { super_admin: "Super Admin", society_admin: "Society Admin", wing_admin: "Wing Admin", manager: "Manager", treasurer: "Treasurer", accountant: "Accountant", helpdesk_manager: "Helpdesk Manager", auditor: "Auditor", committee_member: "Committee Member" };
  const groupedByRole = useMemo(() => {
    const groups = {};
    committeeMembers.forEach((m) => {
      if (!groups[m.role]) groups[m.role] = [];
      groups[m.role].push(m);
    });
    return groups;
  }, [committeeMembers]);

  // Search only when admin types - no default suggestions
  const filteredMemberships = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return allMemberships.filter((m) => {
      const name = (m.userId?.name || m.name || "").toLowerCase();
      const phone = (m.userId?.phone || m.phone || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    }).slice(0, 8);
  }, [allMemberships, search]);

  const createMut = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select a person");
      const membershipId = selected._id || selected.id;
      if (!membershipId) throw new Error("Membership not found");
      if (role === "wing_admin" && selectedWings.length === 0) throw new Error("Select at least one wing for Wing Admin");
      const payload = role === "wing_admin" ? { role, assignedWings: selectedWings } : { role };
      const update = await api.patch(`/memberships/${membershipId}`, payload, { headers: { "x-society-id": activeSociety.id } });
      return update.data.data;
    },
    onSuccess: () => {
      setMsg(`Role updated to ${COMMITTEE_ROLES.find((r) => r.value === role)?.label}`);
      setErr("");
      queryClient.invalidateQueries({ queryKey: ["directory"] });
      queryClient.invalidateQueries({ queryKey: ["committee-full"] });
      setTimeout(() => setMsg(""), 3000);
      setShowForm(false);
      setSelected(null);
    },
    onError: (e) => setErr(extractError(e, "Failed to update role")),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, newRole, wings }) => {
      const payload = newRole === "wing_admin" ? { role: newRole, assignedWings: wings || editWings } : { role: newRole };
      if (newRole === "wing_admin" && (!payload.assignedWings || payload.assignedWings.length === 0)) throw new Error("Wing Admin requires at least one wing");
      const res = await api.patch(`/memberships/${id}`, payload, { headers: { "x-society-id": activeSociety.id } });
      return res.data.data;
    },
    onSuccess: (data, vars) => {
      setMsg(`Changed to ${vars.newRole.replace("_", " ")}`);
      queryClient.invalidateQueries({ queryKey: ["committee-full"] });
      queryClient.invalidateQueries({ queryKey: ["directory"] });
      setEditingId(null);
      setTimeout(() => setMsg(""), 3000);
    },
    onError: (e) => setErr(extractError(e, "Failed to change role")),
  });

  const removeMut = useMutation({
    mutationFn: async ({ id, virtualRole, isAdditional, originalRole }) => {
      // For additional wing_admin virtual card, remove only wing_admin additional, keep primary
      if (isAdditional && virtualRole === "wing_admin") {
        const res = await api.patch(`/memberships/${id}`, { role: originalRole || "society_admin" }, { headers: { "x-society-id": activeSociety.id } });
        // The backend clears wing_admin when role !== wing_admin, so this removes wing_admin additional
        return res.data.data;
      }
      const res = await api.patch(`/memberships/${id}`, { role: "owner" }, { headers: { "x-society-id": activeSociety.id } });
      return res.data.data;
    },
    onSuccess: (_data, vars) => {
      if (vars?.isAdditional) setMsg("Wing Admin role removed — society admin retained");
      else setMsg("Removed from committee — now Owner");
      queryClient.invalidateQueries({ queryKey: ["committee-full"] });
      queryClient.invalidateQueries({ queryKey: ["directory"] });
      setTimeout(() => setMsg(""), 3000);
    },
    onError: (e) => setErr(extractError(e, "Failed to remove. Cannot remove last Society Admin.")),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/dashboard" className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Dashboard
          </Link>
          <h1 className="page-title">Manage Committee</h1>
          <p className="page-subtitle">{activeSociety?.name} · {committeeMembers.length} committee member(s)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManagePermissions && (
            <button
              type="button"
              onClick={() => setShowPermissions(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-label-md font-medium text-on-surface hover:bg-surface-container-low hover:border-primary/30 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span> Manage Permissions
            </button>
          )}
          {canManageCommittee ? (
            <button type="button" onClick={() => setShowForm((v) => !v)} className="rounded-full bg-primary px-4 py-2 text-label-md text-on-primary hover:opacity-90">
              <span className="material-symbols-outlined text-[18px] align-middle mr-1">add</span> {showForm ? "Close" : "Create Committee"}
            </button>
          ) : (
            <span className="text-label-sm text-outline">No permission to manage committee</span>
          )}
        </div>
      </section>

      {msg && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-label-md text-emerald-800">{msg}</p>}
      {err && <p className="rounded-lg bg-error-container px-3 py-2 text-label-md text-on-error-container">{err}</p>}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-body-lg font-semibold">Create Committee</h3>
                <p className="text-body-sm text-on-surface-variant">Search only from your society members, then pick a role.</p>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container-high">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-label-md font-medium">Search name (your society only) *</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
                  placeholder="Type name or phone, e.g. Rahul or 98765"
                  className="w-full rounded-lg border border-outline-variant px-3 py-2 text-body-sm focus:border-primary focus:outline-none"
                />
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-low">
              {search.trim().length < 2 && <p className="p-3 text-body-sm text-outline">Type at least 2 characters to search by name or phone.</p>}
              {search.trim().length >= 2 && filteredMemberships.length === 0 && <p className="p-3 text-body-sm text-on-surface-variant">No members found.</p>}
              {search.trim().length >= 2 && filteredMemberships.map((m) => {
                const name = m.userId?.name || "Unknown";
                const phone = m.userId?.phone || "";
                const isSel = String(selected?._id) === String(m._id);
                return (
                  <button
                    key={m._id}
                    type="button"
                    onClick={() => setSelected(m)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-body-sm hover:bg-primary/10 ${isSel ? "bg-primary/10 text-primary font-semibold" : "text-on-surface"}`}
                  >
                    <span>{name} {phone ? `· ${phone}` : ""}</span>
                    <span className="text-label-sm text-outline capitalize">{m.role?.replace("_", " ")}</span>
                  </button>
                );
              })}
            </div>
                {selected && <p className="mt-2 text-label-sm font-semibold text-primary">Selected: {selected.userId?.name} · {selected.role}</p>}
              </div>

              <div>
                <label className="mb-1 block text-label-md font-medium">Select Role *</label>
                <select value={role} onChange={(e) => { setRole(e.target.value); if (e.target.value !== "wing_admin") setSelectedWings([]); }} className="w-full rounded-lg border border-outline-variant px-3 py-2 text-body-sm">
                  {COMMITTEE_ROLES.concat([{ value: "society_admin", label: "Society Admin" }]).map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-label-sm text-outline">Wing Admin manages selected wings only.</p>
              </div>
              {role === "wing_admin" && (
                <div>
                  <label className="mb-1 block text-label-md font-medium">Assign Wings *</label>
                  {availableWings.length === 0 ? (
                    <p className="text-body-sm text-outline border rounded-lg p-3 bg-surface-container-low">No wings found — create apartment structure first (Wings A/B). This society appears to be row-house or has no block data.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {availableWings.map((w) => (
                        <label key={w} className={`flex items-center gap-2 border rounded-xl px-3 py-2 cursor-pointer ${selectedWings.includes(w) ? "bg-primary/10 border-primary" : "bg-white border-outline-variant"}`}>
                          <input type="checkbox" checked={selectedWings.includes(w)} onChange={(e) => {
                            if (e.target.checked) setSelectedWings((p) => [...p, w]);
                            else setSelectedWings((p) => p.filter((x) => x !== w));
                          }} />
                          <span className="text-body-sm font-semibold">Wing {w}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {selectedWings.length > 0 && <p className="mt-1 text-label-sm text-primary">Selected: {selectedWings.join(", ")}</p>}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-outline-variant px-4 py-2 text-label-md text-on-surface hover:border-primary">Cancel</button>
                <button
                  type="button"
                  onClick={() => createMut.mutate()}
                  disabled={!selected || createMut.isPending}
                  className="rounded-full bg-primary px-5 py-2 text-label-md text-on-primary disabled:opacity-50 hover:opacity-90"
                >
                  {createMut.isPending ? "Saving..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="space-y-6">
        <h2 className="text-body-lg font-semibold">Current Committee — grouped by role</h2>
        {committeeMembers.length === 0 && <p className="rounded-xl border border-dashed p-10 text-center text-body-md text-on-surface-variant">No committee yet. Society Admin is default. Use Create Committee to add.</p>}
        {ROLE_ORDER.map((roleKey) => {
          const members = groupedByRole[roleKey];
          if (!members || members.length === 0) return null;
          return (
            <div key={roleKey} className="space-y-3">
              <h3 className="flex items-center gap-2 text-body-md font-bold uppercase tracking-wide text-primary">
                <span className="h-1 w-6 rounded-full bg-primary" />
                {ROLE_LABELS[roleKey] || roleKey} :-
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-label-sm font-semibold normal-case text-primary">{members.length}</span>
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {members.map((m) => {
                  const name = m.userId?.name || "Unknown";
                  const isEditing = editingId === String(m._virtualKey || m._id);
                  return (
                    <div key={m._virtualKey || m._id} className="flex flex-col items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary font-bold text-body-md">{name.charAt(0).toUpperCase()}</span>
                      <p className="w-full truncate text-body-sm font-semibold text-on-surface sm:text-body-md">{name}</p>
                      {!isEditing ? (
                        <>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold capitalize text-primary sm:text-label-sm">{m.role.replace("_", " ")}</span>
                          {m._isAdditional && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">+ Wing Admin (additional)</span>}
                          {!m._isAdditional && m.additionalRoles && m.additionalRoles.includes("wing_admin") && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Also Wing Admin • { (m.assignedWings||[]).join(", ")}</span>
                          )}
                        </>
                      ) : (
                        <select value={editRole} onChange={(e) => { setEditRole(e.target.value); if (e.target.value !== "wing_admin") setEditWings([]); }} disabled={m._isAdditional} className="w-full rounded-lg border border-primary bg-white px-2 py-1 text-label-sm disabled:opacity-60 disabled:cursor-not-allowed">
                          {COMMITTEE_ROLES.concat([{ value: "society_admin", label: "Society Admin" }]).map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      )}
                      {m.role === "wing_admin" && !isEditing && m.assignedWings && m.assignedWings.length > 0 && (
                        <span className="mt-1 inline-flex flex-wrap gap-1 justify-center">
                          {m.assignedWings.map((w) => <span key={w} className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">Wing {w}</span>)}
                        </span>
                      )}
                      {m._isAdditional && !isEditing && <span className="text-[10px] text-amber-700 font-semibold">Additional • Society Admin retained</span>}
                      {isEditing && editRole === "wing_admin" && (
                        <div className="w-full mt-1">
                          <p className="text-[11px] font-semibold mb-1">Wings</p>
                          {availableWings.length === 0 ? <p className="text-[11px] text-outline">No wings</p> : (
                            <div className="flex flex-wrap gap-1 justify-center">
                              {availableWings.map((w) => (
                                <label key={w} className={`flex items-center gap-1 border rounded-full px-2 py-0.5 text-[11px] cursor-pointer ${editWings.includes(w) ? "bg-primary text-on-primary border-primary" : "bg-white border-outline-variant"}`}>
                                  <input type="checkbox" className="sr-only" checked={editWings.includes(w)} onChange={(e) => {
                                    if (e.target.checked) setEditWings((p) => [...p, w]);
                                    else setEditWings((p) => p.filter((x) => x !== w));
                                  }} />
                                  {w}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {!isEditing ? (
                        canManageCommittee ? (
                          <div className="mt-1 flex gap-1">
                            <button type="button" onClick={() => { setEditingId(String(m._virtualKey || m._id)); setEditRole(m.role); setEditWings(m.assignedWings || []); }} className="rounded-full border border-outline-variant px-2 py-1 text-[11px] font-medium hover:border-primary hover:text-primary">Change</button>
                            <button type="button" onClick={() => { const confirmMsg = m._isAdditional ? `Remove Wing Admin from ${name}? Society Admin will be retained.` : `Remove ${name} from committee? Will become Owner.`; if (window.confirm(confirmMsg)) removeMut.mutate({ id: m._id, virtualRole: m.role, isAdditional: !!m._isAdditional, originalRole: m.originalRole }); }} className="rounded-full border border-outline-variant px-2 py-1 text-[11px] font-medium hover:border-error hover:text-error">Remove</button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-outline">View only</span>
                        )
                      ) : (
                        <div className="mt-1 flex gap-1">
                          <button type="button" onClick={() => updateMut.mutate({ id: m._id, newRole: editRole, wings: editWings })} disabled={updateMut.isPending || !canManageCommittee} className="rounded-full bg-primary px-2 py-1 text-[11px] text-on-primary disabled:opacity-50">Save</button>
                          <button type="button" onClick={() => setEditingId(null)} className="rounded-full border border-outline-variant px-2 py-1 text-[11px]">Cancel</button>
                        </div>
                      )}
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {showPermissions && (
        <PermissionsModal
          societyId={activeSociety?.id}
          societyName={activeSociety?.name}
          onClose={() => setShowPermissions(false)}
        />
      )}
    </div>
  );
}

const PERMISSIONS = SHARED_PERMISSIONS;
const ROLE_PERMISSIONS_DEFAULT = SHARED_DEFAULTS;

function PermissionsModal({ societyId, societyName, onClose }) {
  const queryClient = useQueryClient();
  const { data: fetchedPermissions, isLoading } = useQuery({
    queryKey: ["society-permissions", societyId],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(societyId),
  });
  const [permissions, setPermissions] = useState(ROLE_PERMISSIONS_DEFAULT);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (fetchedPermissions) {
      // Merge with defaults to ensure new permissions appear
      const merged = { ...ROLE_PERMISSIONS_DEFAULT, ...fetchedPermissions };
      // Ensure society_admin/super_admin always have all
      merged.society_admin = PERMISSIONS.map((p) => p.key);
      merged.super_admin = PERMISSIONS.map((p) => p.key);
      setPermissions(merged);
    }
  }, [fetchedPermissions]);

  const saveMutation = useMutation({
    mutationFn: async (perms) => (await api.put("/societies/permissions", { permissions: perms })).data.data,
    onSuccess: (data) => {
      setPermissions((prev) => ({ ...prev, ...data }));
      queryClient.invalidateQueries({ queryKey: ["society-permissions", societyId] });
      queryClient.invalidateQueries({ queryKey: ["society-permissions"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const toggle = (role, permKey) => {
    setPermissions((prev) => {
      const next = { ...prev };
      const list = new Set(next[role] || []);
      if (list.has(permKey)) list.delete(permKey);
      else list.add(permKey);
      next[role] = Array.from(list);
      return next;
    });
    setSaved(false);
  };

  const handleSave = () => {
    saveMutation.mutate(permissions);
  };

  const handleReset = () => {
    setPermissions(ROLE_PERMISSIONS_DEFAULT);
    saveMutation.mutate(ROLE_PERMISSIONS_DEFAULT);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-5 py-4 sm:px-6">
          <div>
            <h3 className="flex items-center gap-2 text-body-lg font-bold text-on-surface">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary">
                <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
              </span>
              Manage Permissions
            </h3>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              {societyName ? `${societyName} · ` : ""}Toggle what each role can do. Only <strong>Society Admin</strong> can edit.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="sticky top-0 z-20 bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="sticky left-0 top-0 z-30 bg-surface-container-low px-4 py-3 text-label-sm font-semibold uppercase tracking-wide text-on-surface border-r border-outline-variant shadow-[2px_0_4px_rgba(0,0,0,0.06)]">Permission</th>
                  {Object.keys(ROLE_PERMISSIONS_DEFAULT).filter((r) => r !== "super_admin").map((role) => (
                    <th key={role} className="sticky top-0 z-20 bg-surface-container-low px-3 py-3 text-center">
                      <span className="block text-label-sm font-bold capitalize text-on-surface">{role.replace("_", " ")}</span>
                      <span className="block text-[10px] font-normal normal-case text-outline">{(permissions[role] || []).length} perms</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {PERMISSIONS.map((perm) => (
                  <tr key={perm.key} className="group hover:bg-surface-container-low/50">
                    <td className="sticky left-0 z-10 bg-surface-container-lowest px-4 py-3 border-r border-outline-variant shadow-[2px_0_4px_rgba(0,0,0,0.06)] group-hover:bg-surface-container-low">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <span className="material-symbols-outlined text-[18px]">{perm.icon}</span>
                        </span>
                        <div>
                          <p className="text-body-sm font-semibold leading-none text-on-surface">{perm.label}</p>
                          <p className="mt-0.5 text-label-sm leading-none text-on-surface-variant">{perm.desc}</p>
                        </div>
                      </div>
                    </td>
                    {Object.keys(ROLE_PERMISSIONS_DEFAULT).filter((r) => r !== "super_admin").map((role) => {
                      const has = (permissions[role] || []).includes(perm.key);
                      const isAdmin = role === "society_admin";
                      return (
                        <td key={role} className="px-3 py-3 text-center">
                          <button
                            type="button"
                            aria-label={`${role} ${perm.key}`}
                            onClick={() => toggle(role, perm.key)}
                            disabled={isAdmin}
                            title={isAdmin ? "Society Admin always has all permissions" : ""}
                            className={`inline-flex h-7 w-12 items-center rounded-full p-1 transition-colors ${has ? "bg-primary justify-end" : "bg-outline-variant justify-start"} ${isAdmin ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:opacity-90"}`}
                          >
                            <span className="h-5 w-5 rounded-full bg-white shadow-sm transition-all" />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          <p className="px-5 py-3 text-label-sm text-outline border-t border-outline-variant bg-surface-container-low">
            Society Admin always has all permissions and cannot be changed. Changes are saved per-society in this browser (localStorage) for now.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-outline-variant bg-surface-container-lowest px-5 py-4">
          <button type="button" onClick={handleReset} disabled={saveMutation.isPending || isLoading} className="rounded-full border border-outline-variant px-4 py-2 text-label-md text-on-surface hover:bg-surface-container-high disabled:opacity-50">
            Reset to defaults
          </button>
          <div className="flex items-center gap-2">
            {isLoading && <span className="text-label-sm text-outline">Loading…</span>}
            {saveMutation.isPending && <span className="flex items-center gap-1 text-label-sm text-outline"><span className="w-4 h-4 border-2 border-outline-variant border-t-primary rounded-full animate-spin" /> Saving…</span>}
            {saved && <span className="flex items-center gap-1 text-label-sm font-semibold text-success"><span className="material-symbols-outlined text-[16px]">check_circle</span> Saved</span>}
            {saveMutation.isError && <span className="text-label-sm text-error">Failed to save</span>}
            <button type="button" onClick={onClose} className="rounded-full border border-outline-variant px-5 py-2 text-label-md">
              Close
            </button>
            <button type="button" onClick={handleSave} disabled={saveMutation.isPending || isLoading} className="rounded-full bg-primary px-6 py-2 text-label-md font-semibold text-on-primary hover:opacity-90 disabled:opacity-50">
              Save Permissions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
