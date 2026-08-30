import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import { getSocietyDirectory } from "../../lib/directory";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";

const COMMITTEE_ROLES = [
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
  const canManageCommittee = hasPermission(activeMembership?.role, "manage_committee", permissionsQuery.data);
  const canManagePermissions = ["society_admin", "super_admin"].includes(activeMembership?.role);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [role, setRole] = useState("committee_member");
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("committee_member");
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

  // Strictly scoped to selected society: memoize to prevent mixing when switching societies
  const allMemberships = useMemo(() => membersQuery.data || [], [membersQuery.data]);
  const committeeRolesSet = useMemo(
    () => new Set(COMMITTEE_ROLES.map((r) => r.value).concat(["society_admin", "super_admin"])),
    []
  );
  // One card per user per role only - Prince Patel with 3 houses = 1 card, but if 2 different roles = 2 cards
  const committeeMembers = useMemo(() => {
    const filtered = allMemberships.filter((m) => committeeRolesSet.has(m.role));
    const map = new Map();
    filtered.forEach((m) => {
      const uid = String(m.userId?._id || m.userId || m._id);
      const key = `${uid}-${m.role}`;
      if (!map.has(key)) map.set(key, m);
    });
    return Array.from(map.values());
  }, [allMemberships, committeeRolesSet]);

  // Group by role for headings: Society Admin, Manager, etc. One person with 2 roles appears in 2 groups
  const ROLE_ORDER = ["super_admin", "society_admin", "manager", "treasurer", "accountant", "helpdesk_manager", "auditor", "committee_member"];
  const ROLE_LABELS = { super_admin: "Super Admin", society_admin: "Society Admin", manager: "Manager", treasurer: "Treasurer", accountant: "Accountant", helpdesk_manager: "Helpdesk Manager", auditor: "Auditor", committee_member: "Committee Member" };
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
      const update = await api.patch(`/memberships/${membershipId}`, { role }, { headers: { "x-society-id": activeSociety.id } });
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
    mutationFn: async ({ id, newRole }) => {
      const res = await api.patch(`/memberships/${id}`, { role: newRole }, { headers: { "x-society-id": activeSociety.id } });
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
    mutationFn: async (id) => {
      const res = await api.patch(`/memberships/${id}`, { role: "owner" }, { headers: { "x-society-id": activeSociety.id } });
      return res.data.data;
    },
    onSuccess: () => {
      setMsg("Removed from committee — now Owner");
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
                <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-lg border border-outline-variant px-3 py-2 text-body-sm">
                  {COMMITTEE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-label-sm text-outline">Manager, Treasurer, Accountant etc as in MyGate.</p>
              </div>

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
                  const isEditing = editingId === String(m._id);
                  return (
                    <div key={m._id} className="flex flex-col items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary font-bold text-body-md">{name.charAt(0).toUpperCase()}</span>
                      <p className="w-full truncate text-body-sm font-semibold text-on-surface sm:text-body-md">{name}</p>
                      {!isEditing ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold capitalize text-primary sm:text-label-sm">{m.role.replace("_", " ")}</span>
                      ) : (
                        <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="w-full rounded-lg border border-primary bg-white px-2 py-1 text-label-sm">
                          {COMMITTEE_ROLES.concat([{ value: "society_admin", label: "Society Admin" }]).map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      )}
                      {!isEditing ? (
                        canManageCommittee ? (
                          <div className="mt-1 flex gap-1">
                            <button type="button" onClick={() => { setEditingId(String(m._id)); setEditRole(m.role); }} className="rounded-full border border-outline-variant px-2 py-1 text-[11px] font-medium hover:border-primary hover:text-primary">Change</button>
                            <button type="button" onClick={() => { if (window.confirm(`Remove ${name} from committee? Will become Owner.`)) removeMut.mutate(m._id); }} className="rounded-full border border-outline-variant px-2 py-1 text-[11px] font-medium hover:border-error hover:text-error">Remove</button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-outline">View only</span>
                        )
                      ) : (
                        <div className="mt-1 flex gap-1">
                          <button type="button" onClick={() => updateMut.mutate({ id: m._id, newRole: editRole })} disabled={updateMut.isPending || !canManageCommittee} className="rounded-full bg-primary px-2 py-1 text-[11px] text-on-primary disabled:opacity-50">Save</button>
                          <button type="button" onClick={() => setEditingId(null)} className="rounded-full border border-outline-variant px-2 py-1 text-[11px]">Cancel</button>
                        </div>
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

const PERMISSIONS = [
  { key: "manage_committee", label: "Manage Committee", desc: "Add / remove roles", icon: "groups" },
  { key: "manage_houses", label: "Manage Houses", desc: "Assign owner / renter", icon: "home" },
  { key: "manage_maintenance", label: "Manage Maintenance", desc: "Billing & dues", icon: "request_quote" },
  { key: "create_notice", label: "Create Notice", desc: "Publish notices", icon: "campaign" },
  { key: "manage_amenities", label: "Manage Amenities", desc: "Facility setup", icon: "event_available" },
  { key: "manage_bookings", label: "Manage Bookings", desc: "Approve amenities", icon: "event" },
  { key: "create_poll", label: "Create Poll", desc: "Voting", icon: "how_to_vote" },
  { key: "create_survey", label: "Create Survey", desc: "Feedback", icon: "assignment" },
  { key: "manage_complaints", label: "Manage Complaints", desc: "Resolve complaints", icon: "report" },
  { key: "manage_visitors", label: "Manage Visitors", desc: "Gate & visitors", icon: "badge" },
  { key: "view_financials", label: "View Financials", desc: "Reports, dues", icon: "account_balance" },
  { key: "manage_directory", label: "View Directory", desc: "Resident list", icon: "contacts" },
];

const ROLE_PERMISSIONS_DEFAULT = {
  society_admin: PERMISSIONS.map((p) => p.key),
  super_admin: PERMISSIONS.map((p) => p.key),
  manager: ["manage_houses", "manage_maintenance", "create_notice", "manage_amenities", "manage_bookings", "create_poll", "create_survey", "manage_complaints", "manage_visitors", "view_financials", "manage_directory"],
  treasurer: ["manage_maintenance", "view_financials", "manage_directory"],
  accountant: ["manage_maintenance", "view_financials"],
  helpdesk_manager: ["manage_complaints", "manage_visitors", "manage_directory"],
  auditor: ["view_financials", "manage_directory"],
  committee_member: ["create_notice", "create_poll", "create_survey", "manage_directory"],
};

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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="sticky top-0 z-10 bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wide text-on-surface">Permission</th>
                  {Object.keys(ROLE_PERMISSIONS_DEFAULT).filter((r) => r !== "super_admin").map((role) => (
                    <th key={role} className="px-3 py-3 text-center">
                      <span className="block text-label-sm font-bold capitalize text-on-surface">{role.replace("_", " ")}</span>
                      <span className="block text-[10px] font-normal normal-case text-outline">{(permissions[role] || []).length} perms</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {PERMISSIONS.map((perm) => (
                  <tr key={perm.key} className="hover:bg-surface-container-low/50">
                    <td className="px-4 py-3">
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
          </div>
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
