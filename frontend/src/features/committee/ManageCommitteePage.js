import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety } from "../../stores/society.store";
import { getSocietyDirectory } from "../../lib/directory";
import api from "../../lib/api";

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
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [role, setRole] = useState("committee_member");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const membersQuery = useQuery({
    queryKey: ["committee-full", activeSociety?.id],
    queryFn: async () => {
      const res = await api.get("/memberships", { headers: { "x-society-id": activeSociety.id } });
      return res.data.data || [];
    },
    enabled: Boolean(activeSociety),
  });

  const directoryQuery = useQuery({
    queryKey: ["directory", activeSociety?.id],
    queryFn: async () => (await getSocietyDirectory()).data.data,
    enabled: Boolean(activeSociety),
  });

  const allMemberships = membersQuery.data || [];
  const committeeRolesSet = new Set(COMMITTEE_ROLES.map((r) => r.value).concat(["society_admin", "super_admin"]));
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
  }, [allMemberships]);

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

  // Search only from your society members (memberships) - contains real ids
  const filteredMemberships = useMemo(() => {
    if (!search.trim()) return allMemberships.slice(0, 8);
    const q = search.trim().toLowerCase();
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
        <button type="button" onClick={() => setShowForm((v) => !v)} className="rounded-full bg-primary px-4 py-2 text-label-md text-on-primary hover:opacity-90">
          <span className="material-symbols-outlined text-[18px] align-middle mr-1">add</span> {showForm ? "Close" : "Create Committee"}
        </button>
      </section>

      {msg && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-label-md text-emerald-800">{msg}</p>}
      {err && <p className="rounded-lg bg-error-container px-3 py-2 text-label-md text-on-error-container">{err}</p>}

      {showForm && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 space-y-4">
          <h3 className="text-body-lg font-semibold">Create Committee</h3>
          <p className="text-body-sm text-on-surface-variant">Search only from your society members, then pick a role.</p>

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
              {filteredMemberships.length === 0 && <p className="p-3 text-body-sm text-on-surface-variant">No members found in your society.</p>}
              {filteredMemberships.map((m) => {
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

          <button
            type="button"
            onClick={() => createMut.mutate()}
            disabled={!selected || createMut.isPending}
            className="rounded-full bg-primary px-5 py-2 text-label-md text-on-primary disabled:opacity-50 hover:opacity-90"
          >
            {createMut.isPending ? "Saving..." : "Create Committee Member"}
          </button>
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
              <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-4">
                {members.map((m) => {
                  const name = m.userId?.name || "Unknown";
                  return (
                    <div key={m._id} className="flex flex-col items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary font-bold text-body-md">{name.charAt(0).toUpperCase()}</span>
                      <p className="w-full truncate text-body-sm font-semibold text-on-surface sm:text-body-md">{name}</p>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold capitalize text-primary sm:text-label-sm">{m.role.replace("_", " ")}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
