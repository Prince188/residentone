import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import { getAmenities, createAmenity, deleteAmenity, extractApiError } from "../../lib/amenities";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";

export default function ManageAmenitiesPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const membership = useSocietyStore(selectActiveMembership);
  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canManageAmenities = hasPermission(membership?.role, "manage_amenities", permissionsQuery.data);
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", type: "free", price: 0, slots: "06:00-07:00, 07:00-08:00, 18:00-19:00", bookingMode: "slot" });
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["amenities", activeSociety?.id],
    queryFn: async () => (await getAmenities()).data.data,
    enabled: Boolean(activeSociety),
  });

  const createMut = useMutation({
    mutationFn: (payload) => createAmenity(payload).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["amenities"] });
      setShowForm(false);
      setForm({ name: "", description: "", type: "free", price: 0, slots: "06:00-07:00, 07:00-08:00, 18:00-19:00", bookingMode: "slot" });
      setError("");
    },
    onError: (e) => setError(extractApiError(e, "Failed to create amenity")),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteAmenity(id).then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["amenities"] }),
  });

  if (!canManageAmenities) {
    return (
      <div className="mx-auto max-w-3xl p-10 text-center rounded-xl border border-outline-variant bg-surface-container-low">
        <span className="material-symbols-outlined text-[40px] text-error">lock</span>
        <p className="mt-2 text-body-md">You don’t have permission to manage amenities.</p>
        <p className="mt-1 text-body-sm text-on-surface-variant">Ask your Society Admin for <strong>Manage Amenities</strong> permission.</p>
        <Link to="/dashboard" className="mt-3 inline-block text-primary hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  const handleCreate = (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) { setError("Name required"); return; }
    const payload = { name: form.name.trim(), description: form.description.trim(), type: form.type, price: Number(form.price), bookingMode: form.bookingMode };
    if (form.bookingMode === "slot") {
      const slotsArr = form.slots.split(",").map((s) => s.trim()).filter(Boolean);
      if (slotsArr.length === 0) { setError("Add at least one slot for slot booking"); return; }
      payload.slots = slotsArr;
    }
    createMut.mutate(payload);
  };

  const amenities = query.data || [];

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/dashboard" className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Dashboard
          </Link>
          <h1 className="page-title">Manage Amenities</h1>
          <p className="page-subtitle">{activeSociety?.name} · {amenities.length} amenitie(s)</p>
        </div>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="rounded-full bg-primary px-4 py-2 text-label-md text-on-primary hover:opacity-90">
          <span className="material-symbols-outlined text-[18px] align-middle mr-1">add</span> Add Amenity
        </button>
      </section>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-label-md font-medium">Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Clubhouse, Gym, Pool" className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-body-sm" />
            </div>
            <div>
              <label className="text-label-md font-medium">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-body-sm">
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-label-md font-medium">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-body-sm" />
          </div>
          <div>
            <label className="text-label-md font-medium">Booking Type *</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setForm({ ...form, bookingMode: "slot" })} className={`rounded-lg border px-3 py-2 text-body-sm font-medium ${form.bookingMode === "slot" ? "border-primary bg-primary/10 text-primary" : "border-outline-variant bg-surface-container-lowest"}`}>
                🕐 Hourly Slots
              </button>
              <button type="button" onClick={() => setForm({ ...form, bookingMode: "full_day" })} className={`rounded-lg border px-3 py-2 text-body-sm font-medium ${form.bookingMode === "full_day" ? "border-primary bg-primary/10 text-primary" : "border-outline-variant bg-surface-container-lowest"}`}>
                📅 Whole Day
              </button>
            </div>
            <p className="mt-1 text-label-sm text-outline">{form.bookingMode === "full_day" ? "Clubhouse: one booking per day (no slots)" : "Gym/Pool: hourly slots like 06:00-07:00"}</p>
          </div>
          <div>
            <label className="text-label-md font-medium">Price ({form.bookingMode === "full_day" ? "per day" : "per slot"})</label>
            <input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-body-sm" disabled={form.type === "free"} />
          </div>
          {form.bookingMode === "slot" && (
            <div>
              <label className="text-label-md font-medium">Slots (comma separated e.g. 06:00-07:00)</label>
              <input value={form.slots} onChange={(e) => setForm({ ...form, slots: e.target.value })} placeholder="06:00-07:00, 07:00-08:00" className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-body-sm" />
            </div>
          )}
          {error && <p className="rounded-lg bg-error-container px-3 py-2 text-label-md text-on-error-container">{error}</p>}
          <button type="submit" disabled={createMut.isPending} className="rounded-full bg-primary px-5 py-2 text-label-md text-on-primary disabled:opacity-50">
            {createMut.isPending ? "Creating..." : "Create"}
          </button>
        </form>
      )}

      {query.isLoading && <div className="grid grid-cols-2 gap-3 sm:gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-surface-container-high" />)}</div>}
      {query.isError && <p className="text-error">{extractApiError(query.error, "Failed to load")}</p>}

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {amenities.map((a) => (
          <div key={a.id} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 flex flex-col min-h-[120px]">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate text-body-md font-semibold leading-tight sm:text-body-lg">{a.name}</h3>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-label-sm font-semibold ${a.type === "paid" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{a.type === "paid" ? `₹${a.price}` : "Free"}</span>
            </div>
            <p className="mt-1 text-body-sm text-on-surface-variant line-clamp-2">{a.description || "No description"}</p>
            <p className="mt-auto pt-1 text-label-sm text-outline truncate">
              {a.bookingMode === "full_day" ? `Whole Day` : `${a.slots.length} slots`}
            </p>
            <button type="button" onClick={() => { if (window.confirm(`Delete ${a.name}?`)) deleteMut.mutate(a.id); }} className="mt-1 text-left text-label-sm text-error hover:underline">Delete</button>
          </div>
        ))}
      </div>
      {query.isSuccess && amenities.length === 0 && <div className="rounded-xl border border-dashed border-outline-variant p-10 text-center text-body-md text-on-surface-variant">No amenities yet. Add your first one.</div>}
    </div>
  );
}
