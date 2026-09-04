import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAuthStore from "../../stores/auth.store";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import { getFamilyMembers, addFamilyMember, updateFamilyMember, removeFamilyMember, extractApiError } from "../../lib/familyMembers";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import PhoneInput from "../../components/ui/PhoneInput";

const RELATIONS = ["spouse", "child", "parent", "sibling", "relative", "other"];

function EditFamilyMemberModal({ member, open, onClose, onSave, isSaving, error }) {
  const [form, setForm] = useState({
    name: member?.name || "",
    relation: member?.relation || "other",
    phone: member?.phone || "",
    occupation: member?.occupation || "",
  });

  if (!open || !member) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.name.trim().length < 2) return;
    onSave({
      id: member.id,
      payload: {
        name: form.name.trim(),
        relation: form.relation,
        phone: form.phone.trim(),
        occupation: form.occupation.trim(),
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={isSaving ? undefined : onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xl sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-title-md font-bold text-on-surface">Edit Family Member</h3>
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container-high cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && <p className="rounded-lg bg-error-container p-3 text-label-md text-on-error-container">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-label-md font-medium text-on-surface">Full Name *</label>
            <input
              required
              minLength={2}
              maxLength={100}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-label-md font-medium text-on-surface">Relation *</label>
              <select
                value={form.relation}
                onChange={(e) => setForm({ ...form, relation: e.target.value })}
                className="mt-1 w-full rounded-xl border border-outline-variant bg-white px-3 py-2 text-body-sm capitalize focus:border-primary focus:outline-none"
              >
                {RELATIONS.map((r) => (
                  <option key={r} value={r} className="capitalize">{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-label-md font-medium text-on-surface">Phone (Optional)</label>
              <PhoneInput
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                size="sm"
                showDigitCounter={true}
              />
            </div>
          </div>

          <div>
            <label className="text-label-md font-medium text-on-surface">Occupation / Profession (Optional)</label>
            <input
              type="text"
              maxLength={100}
              value={form.occupation}
              onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              placeholder="e.g. Doctor, Electrician, Student, Engineer"
              className="mt-1 w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={isSaving} className="rounded-lg border border-outline-variant px-4 py-2 text-label-md text-on-surface hover:bg-surface-container-low cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !form.name.trim()}
              className="rounded-lg bg-primary px-5 py-2 text-label-md font-semibold text-on-primary hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FamilyMembersPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const membership = useSocietyStore(selectActiveMembership);
  const myHouses = membership?.units || [];
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", relation: "other", phone: "", occupation: "" });
  const [editingMember, setEditingMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const listQuery = useQuery({
    queryKey: ["family-members", "mine", user?.id || user?._id],
    queryFn: async () => (await getFamilyMembers({ mine: true })).data.data,
    enabled: Boolean(user),
  });

  const addMut = useMutation({
    mutationFn: (payload) => addFamilyMember(payload).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      queryClient.invalidateQueries({ queryKey: ["directory"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setMsg("Family member added");
      setErr("");
      setForm({ name: "", relation: "other", phone: "", occupation: "" });
      setTimeout(() => setMsg(""), 3000);
    },
    onError: (e) => setErr(extractApiError(e, "Failed to add")),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => updateFamilyMember(id, payload).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      queryClient.invalidateQueries({ queryKey: ["directory"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditingMember(null);
      setMsg("Family member details updated");
      setErr("");
      setTimeout(() => setMsg(""), 3000);
    },
    onError: (e) => setErr(extractApiError(e, "Failed to update")),
  });

  const removeMut = useMutation({
    mutationFn: (id) => removeFamilyMember(id).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      queryClient.invalidateQueries({ queryKey: ["directory"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setDeletingMember(null);
      setMsg("Family member removed");
      setTimeout(() => setMsg(""), 3000);
    },
    onError: (e) => setErr(extractApiError(e, "Failed to remove")),
  });

  const members = listQuery.data || [];

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.name.trim().length < 2) { setErr("Enter valid name (min 2 chars)"); return; }
    setErr("");
    addMut.mutate({
      name: form.name.trim(),
      relation: form.relation,
      phone: form.phone.trim(),
      occupation: form.occupation.trim(),
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
        <span className="material-symbols-outlined text-[16px]">arrow_back</span> Dashboard
      </Link>
      <div>
        <h1 className="page-title">Add Family Members</h1>
        <p className="page-subtitle">{activeSociety?.name} · General for all your houses{myHouses.length > 1 ? ` (${myHouses.length} houses)` : ""}</p>
      </div>

      {msg && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-label-md text-emerald-800">{msg}</p>}
      {err && <p className="rounded-lg bg-error-container px-3 py-2 text-label-md text-on-error-container">{err}</p>}

      <form onSubmit={handleAdd} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 space-y-4 shadow-sm">
        <div>
          <label className="text-label-md font-medium text-on-surface">Family Member Name *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sunita Patel" className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-body-sm" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-label-md font-medium text-on-surface">Role / Relation *</label>
            <select value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} className="mt-1 w-full rounded-xl border border-outline-variant px-3 py-2 text-body-sm capitalize">
              {RELATIONS.map((r) => (
                <option key={r} value={r} className="capitalize">{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-label-md font-medium text-on-surface">Phone (Optional)</label>
            <PhoneInput
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              size="sm"
              showDigitCounter={true}
            />
          </div>
        </div>
        <div>
          <label className="text-label-md font-medium text-on-surface">Occupation / Profession (Optional)</label>
          <input
            type="text"
            maxLength={100}
            value={form.occupation}
            onChange={(e) => setForm({ ...form, occupation: e.target.value })}
            placeholder="e.g. Doctor, Electrician, Student, Engineer"
            className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-body-sm"
          />
          <p className="mt-1 text-label-xs text-on-surface-variant">
            Helps neighbors discover community doctors, electricians, teachers, etc.
          </p>
        </div>
        <button type="submit" disabled={addMut.isPending} className="rounded-full bg-primary px-5 py-2 text-label-md text-on-primary hover:opacity-90 disabled:opacity-50 cursor-pointer">
          {addMut.isPending ? "Adding..." : "Add Member"}
        </button>
      </form>

      <section className="space-y-3">
        <h3 className="text-body-lg font-semibold text-on-surface">Your Family Members ({members.length})</h3>
        {listQuery.isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-container-high" />)}</div>}
        {members.length === 0 && !listQuery.isLoading && <p className="rounded-xl border border-dashed p-8 text-center text-body-sm text-on-surface-variant">No family members added yet.</p>}
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">{m.name.charAt(0).toUpperCase()}</span>
              <div>
                <p className="text-body-md font-semibold text-on-surface flex items-center gap-2 flex-wrap">
                  <span>{m.name}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-label-sm font-medium capitalize text-primary">
                    {m.relation}
                  </span>
                  {m.occupation && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-secondary-fixed px-2 py-0.5 text-label-xs font-semibold text-on-secondary-fixed">
                      <span className="material-symbols-outlined text-[13px]">work</span>
                      {m.occupation}
                    </span>
                  )}
                </p>
                <p className="text-label-sm text-on-surface-variant">General · All houses {m.phone ? `· ${m.phone}` : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setErr("");
                  setEditingMember(m);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-3 py-1 text-label-sm text-primary hover:bg-primary/10 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setErr("");
                  setDeletingMember(m);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-3 py-1 text-label-sm text-error hover:border-error hover:bg-error-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
                Remove
              </button>
            </div>
          </div>
        ))}
      </section>

      <EditFamilyMemberModal
        member={editingMember}
        open={Boolean(editingMember)}
        onClose={() => setEditingMember(null)}
        onSave={(data) => updateMut.mutate(data)}
        isSaving={updateMut.isPending}
        error={err}
      />

      <ConfirmDialog
        open={Boolean(deletingMember)}
        title={`Remove ${deletingMember?.name}?`}
        message="Are you sure you want to remove this family member from your household?"
        confirmLabel="Remove Member"
        danger
        busy={removeMut.isPending}
        error={err}
        onConfirm={() => removeMut.mutate(deletingMember?.id)}
        onClose={() => setDeletingMember(null)}
      />
    </div>
  );
}
