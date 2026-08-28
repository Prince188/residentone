import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAuthStore from "../../stores/auth.store";
import useSocietyStore, { selectActiveSociety } from "../../stores/society.store";
import api from "../../lib/api";

export default function ProfilePage() {
  const authUser = useAuthStore((s) => s.user);
  const activeSociety = useSocietyStore(selectActiveSociety);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState("");

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await api.get("/users/profile")).data.data,
    initialData: authUser,
  });

  const membershipsQuery = useQuery({
    queryKey: ["my-societies"],
    queryFn: async () => (await api.get("/memberships/my-societies")).data.data,
  });

  const user = profileQuery.data || authUser;

  const updateMut = useMutation({
    mutationFn: (payload) => api.patch("/users/profile", payload).then((r) => r.data.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      useAuthStore.setState({ user: data });
      setEditing(false);
      setMsg("Profile updated");
      setTimeout(() => setMsg(""), 3000);
    },
  });

  const startEdit = () => {
    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      occupation: user.occupation || "",
      familyMembers: user.familyMembers ?? "",
      vehicles: (user.vehicles || []).join(", "),
    });
    setEditing(true);
  };

  const handleSave = () => {
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      occupation: form.occupation.trim(),
      familyMembers: form.familyMembers === "" ? null : Number(form.familyMembers),
      vehicles: form.vehicles.split(",").map((v) => v.trim().toUpperCase()).filter(Boolean),
    };
    updateMut.mutate(payload);
  };

  if (profileQuery.isLoading) return <div className="mx-auto max-w-3xl p-10 text-center">Loading profile...</div>;
  if (!user) return <div className="mx-auto max-w-3xl p-10 text-center">No user data. <Link to="/login" className="text-primary">Login</Link></div>;

  const memberships = membershipsQuery.data || [];

  return (
    <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
        <span className="material-symbols-outlined text-[16px]">arrow_back</span> Dashboard
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="page-title">Profile</h1>
        {!editing && (
          <button type="button" onClick={startEdit} className="rounded-full border border-outline-variant px-4 py-1.5 text-label-sm font-medium hover:border-primary hover:text-primary">Edit</button>
        )}
      </div>

      {msg && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-label-md text-emerald-800">{msg}</p>}

      <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
        <div className="bg-gradient-to-br from-primary via-primary-container to-on-primary-fixed p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary text-title-lg font-bold">{user.name?.charAt(0)?.toUpperCase() || "?"}</span>
            <div>
              <p className="text-title-lg font-bold text-white">{user.name}</p>
              <p className="text-body-sm text-white/80">{user.email} · {user.phone}</p>
              <p className="mt-1 inline-flex rounded-full bg-white/20 px-2 py-0.5 text-label-sm text-white">{user.role?.join(", ") || "resident"}</p>
            </div>
          </div>
        </div>

        {!editing ? (
          <div className="p-5 space-y-0 divide-y divide-outline-variant">
            <Row label="Name" value={user.name} icon="person" />
            <Row label="Email" value={user.email} icon="mail" />
            <Row label="Phone" value={user.phone} icon="call" />
            <Row label="Occupation" value={user.occupation || "—"} icon="work" />
            <Row label="Family Members" value={user.familyMembers ?? "—"} icon="group" />
            <Row label="Vehicles" value={user.vehicles?.length ? user.vehicles.join(", ") : "— No vehicles"} icon="directions_car" isMono />
            <Row label="Active" value={user.isActive ? "Yes" : "No"} icon="verified_user" />
            <Row label="Member since" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"} icon="event" />
            {activeSociety && <Row label="Current Society" value={activeSociety.name} icon="apartment" />}
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <label className="text-label-md font-medium">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-body-sm" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-label-md font-medium">Email</label>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-body-sm" />
              </div>
              <div>
                <label className="text-label-md font-medium">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-body-sm" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-label-md font-medium">Occupation</label>
                <input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder="e.g. Engineer" className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-body-sm" />
              </div>
              <div>
                <label className="text-label-md font-medium">Family Members</label>
                <input type="number" min="0" max="50" value={form.familyMembers} onChange={(e) => setForm({ ...form, familyMembers: e.target.value })} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-body-sm" />
              </div>
            </div>
            <div>
              <label className="text-label-md font-medium">Vehicles (comma separated)</label>
              <input value={form.vehicles} onChange={(e) => setForm({ ...form, vehicles: e.target.value })} placeholder="GJ01AB1234, MH12CD5678" className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-body-sm font-mono" />
            </div>
            {updateMut.isError && <p className="rounded-lg bg-error-container px-3 py-2 text-label-sm text-on-error-container">{updateMut.error?.response?.data?.error?.message || "Update failed"}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={handleSave} disabled={updateMut.isPending} className="rounded-full bg-primary px-5 py-2 text-label-md text-on-primary disabled:opacity-50">{updateMut.isPending ? "Saving..." : "Save"}</button>
              <button type="button" onClick={() => setEditing(false)} className="rounded-full border border-outline-variant px-4 py-2 text-label-md">Cancel</button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
        <h3 className="text-body-lg font-semibold">My Societies & Houses</h3>
        {membershipsQuery.isLoading && <p className="mt-2 text-body-sm text-on-surface-variant">Loading...</p>}
        {memberships.length === 0 && <p className="mt-2 text-body-sm text-on-surface-variant">No society linked yet.</p>}
        <div className="mt-3 space-y-2">
          {memberships.map((m) => (
            <div key={m.membershipId} className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
              <p className="text-body-md font-semibold">{m.society.name} · {m.society.city}</p>
              <p className="text-label-sm text-on-surface-variant capitalize">Role: {m.role.replace("_", " ")} · {m.units.length} house(s)</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {m.units.map((u) => (
                  <span key={u.id} className="rounded-full bg-primary/10 px-2 py-0.5 text-label-sm font-mono">House {u.label}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Row({ label, value, icon, isMono }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="flex items-center gap-2 text-label-md text-on-surface-variant">
        <span className="material-symbols-outlined text-[16px]">{icon}</span> {label}
      </span>
      <span className={`text-body-sm font-semibold text-on-surface text-right truncate max-w-[60%] ${isMono ? "font-mono tracking-widest" : ""}`}>{String(value)}</span>
    </div>
  );
}
