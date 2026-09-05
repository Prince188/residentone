import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import {
  getAmenities,
  createAmenity,
  updateAmenity,
  deleteAmenity,
  extractApiError,
  getAmenityMeta,
} from "../../lib/amenities";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

function EditAmenityModal({ amenity, open, onClose, onSave, isSaving, error }) {
  const [form, setForm] = useState({
    name: amenity?.name || "",
    description: amenity?.description || "",
    type: amenity?.type || "free",
    price: amenity?.price || 0,
    bookingMode: amenity?.bookingMode || "slot",
    slots: (amenity?.slots || []).join(", "),
  });

  if (!open || !amenity) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      type: form.type,
      price: form.type === "paid" ? Number(form.price) : 0,
      bookingMode: form.bookingMode,
    };
    if (form.bookingMode === "slot") {
      payload.slots = form.slots.split(",").map((s) => s.trim()).filter(Boolean);
    }
    onSave({ id: amenity.id, payload });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={isSaving ? undefined : onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[20px]">edit</span>
            </span>
            <h2 className="text-title-md font-bold text-on-surface">Edit Amenity</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container-high cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-error-container p-3 text-label-md text-on-error-container">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-label-md font-semibold text-on-surface">Amenity Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-label-md font-semibold text-on-surface">Billing Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="mt-1 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="free">Free for all members</option>
                <option value="paid">Paid reservation</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-label-md font-semibold text-on-surface">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Olympic size, heated pool with dedicated lanes"
              className="mt-1 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-label-md font-semibold text-on-surface">Booking Model *</label>
            <div className="mt-1.5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, bookingMode: "slot" })}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center transition-all cursor-pointer ${
                  form.bookingMode === "slot"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary"
                    : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">schedule</span>
                <span className="text-label-md">Hourly Slots</span>
                <span className="text-[11px] text-outline font-normal">Gym, Pool, Tennis</span>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, bookingMode: "full_day" })}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center transition-all cursor-pointer ${
                  form.bookingMode === "full_day"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary"
                    : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">calendar_month</span>
                <span className="text-label-md">Whole Day</span>
                <span className="text-[11px] text-outline font-normal">Clubhouse, Banquet</span>
              </button>
            </div>
          </div>

          {form.type === "paid" && (
            <div>
              <label className="text-label-md font-semibold text-on-surface">
                Price (₹ {form.bookingMode === "full_day" ? "per whole day" : "per slot"})
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-on-surface-variant font-bold text-body-sm">₹</span>
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-8 pr-3.5 py-2.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {form.bookingMode === "slot" && (
            <div>
              <label className="text-label-md font-semibold text-on-surface">Slots (comma separated)</label>
              <input
                value={form.slots}
                onChange={(e) => setForm({ ...form, slots: e.target.value })}
                placeholder="06:00-07:00, 07:00-08:00, 18:00-19:00"
                className="mt-1 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-body-sm font-mono text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-[11px] text-outline">Example: 06:00-07:00, 07:00-08:00, 18:00-19:00</p>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-outline-variant/60">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-outline-variant px-4 py-2.5 text-label-md font-semibold text-on-surface hover:bg-surface-container-low cursor-pointer disabled:opacity-60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !form.name.trim()}
              className="rounded-xl bg-primary px-5 py-2.5 text-label-md font-semibold text-on-primary hover:bg-primary/90 cursor-pointer disabled:opacity-60 shadow-xs transition-colors"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
  const [editingAmenity, setEditingAmenity] = useState(null);
  const [deletingAmenity, setDeletingAmenity] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "free",
    price: 0,
    slots: "06:00-07:00, 07:00-08:00, 18:00-19:00, 19:00-20:00",
    bookingMode: "slot",
  });
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
      setForm({
        name: "",
        description: "",
        type: "free",
        price: 0,
        slots: "06:00-07:00, 07:00-08:00, 18:00-19:00, 19:00-20:00",
        bookingMode: "slot",
      });
      setError("");
    },
    onError: (e) => setError(extractApiError(e, "Failed to create amenity")),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => updateAmenity(id, payload).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["amenities"] });
      setEditingAmenity(null);
      setError("");
    },
    onError: (e) => setError(extractApiError(e, "Failed to update amenity")),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteAmenity(id).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["amenities"] });
      setDeletingAmenity(null);
    },
    onError: (e) => setError(extractApiError(e, "Failed to delete amenity")),
  });

  if (!canManageAmenities) {
    return (
      <div className="mx-auto max-w-2xl p-10 text-center rounded-2xl border border-outline-variant bg-surface-container-low shadow-sm">
        <span className="material-symbols-outlined text-[48px] text-error">lock</span>
        <h2 className="mt-2 text-title-md font-bold text-on-surface">Access Restricted</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">You don’t have permission to manage society amenities.</p>
        <p className="mt-1 text-body-sm text-outline">Contact your Society Admin to grant <strong>Manage Amenities</strong> permission.</p>
        <Link to="/dashboard" className="mt-4 inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-label-md font-semibold text-on-primary hover:bg-primary/90">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const handleCreate = (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Name required");
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      type: form.type,
      price: form.type === "paid" ? Number(form.price) : 0,
      bookingMode: form.bookingMode,
    };
    if (form.bookingMode === "slot") {
      const slotsArr = form.slots.split(",").map((s) => s.trim()).filter(Boolean);
      if (slotsArr.length === 0) {
        setError("Add at least one slot for slot-based booking");
        return;
      }
      payload.slots = slotsArr;
    }
    createMut.mutate(payload);
  };

  const amenities = query.data || [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Navigation & Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to="/amenities"
            className="mb-1.5 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Resident Amenities View
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="page-title">Manage Amenities</h1>
            <span className="rounded-full bg-primary/10 px-3 py-0.5 text-label-sm font-bold text-primary">
              {amenities.length} {amenities.length === 1 ? "Amenity" : "Amenities"}
            </span>
          </div>
          <p className="page-subtitle mt-0.5">{activeSociety?.name} · Configure facilities, reservation modes, and pricing</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError("");
            setShowForm((v) => !v);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-label-md font-bold text-on-primary hover:bg-primary/90 shadow-sm cursor-pointer transition-all active:scale-98"
        >
          <span className="material-symbols-outlined text-[20px]">
            {showForm ? "close" : "add_circle"}
          </span>
          {showForm ? "Close Form" : "Add Amenity"}
        </button>
      </section>

      {/* Add Amenity Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-primary/30 bg-surface-container-lowest p-6 shadow-md space-y-5 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-2 border-b border-outline-variant/60 pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[20px]">add_business</span>
            </span>
            <h2 className="text-title-md font-bold text-on-surface">Create New Society Amenity</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-label-md font-semibold text-on-surface">Amenity Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Swimming Pool, Gymnasium, Clubhouse"
                className="mt-1 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-label-md font-semibold text-on-surface">Pricing Model</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="mt-1 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="free">Free (Complimentary)</option>
                <option value="paid">Paid (Charged per booking)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-label-md font-semibold text-on-surface">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief details about facility timings, capacity or guidelines"
              className="mt-1 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-label-md font-semibold text-on-surface">Booking Type *</label>
            <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, bookingMode: "slot" })}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  form.bookingMode === "slot"
                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                    : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[22px]">schedule</span>
                </span>
                <div>
                  <p className="text-label-md font-bold text-on-surface">Hourly Slots</p>
                  <p className="text-[12px] text-outline">Multiple time intervals per day (Gym, Pool, Tennis)</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, bookingMode: "full_day" })}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  form.bookingMode === "full_day"
                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                    : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[22px]">calendar_month</span>
                </span>
                <div>
                  <p className="text-label-md font-bold text-on-surface">Whole Day</p>
                  <p className="text-[12px] text-outline">Single booking per calendar day (Clubhouse, Banquet)</p>
                </div>
              </button>
            </div>
          </div>

          {form.type === "paid" && (
            <div>
              <label className="text-label-md font-semibold text-on-surface">
                Price (₹ {form.bookingMode === "full_day" ? "per whole day" : "per slot"})
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-on-surface-variant font-bold text-body-sm">₹</span>
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0"
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-9 pr-3.5 py-2.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {form.bookingMode === "slot" && (
            <div>
              <label className="text-label-md font-semibold text-on-surface">
                Available Slots (comma-separated 24h format)
              </label>
              <input
                value={form.slots}
                onChange={(e) => setForm({ ...form, slots: e.target.value })}
                placeholder="06:00-07:00, 07:00-08:00, 18:00-19:00"
                className="mt-1 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-body-sm font-mono text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-[11px] text-outline">
                Define the time windows residents can select when reserving this amenity.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-error-container p-3 text-label-md text-on-error-container">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={createMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-label-md font-bold text-on-primary hover:bg-primary/90 disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
              {createMut.isPending ? "Creating..." : "Save Amenity"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-outline-variant px-4 py-2.5 text-label-md font-semibold text-on-surface hover:bg-surface-container-low cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Loading Skeleton */}
      {query.isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-surface-container-high" />
          ))}
        </div>
      )}

      {/* Error State */}
      {query.isError && (
        <div className="rounded-2xl border border-error/30 bg-error-container/20 p-5 text-center text-error">
          <span className="material-symbols-outlined text-[32px]">warning</span>
          <p className="mt-1 text-body-md font-semibold">{extractApiError(query.error, "Failed to load amenities")}</p>
        </div>
      )}

      {/* Amenities Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {amenities.map((a) => {
          const meta = getAmenityMeta(a.name, a.type);
          const isWholeDay = a.bookingMode === "full_day";

          return (
            <div
              key={a.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs transition-all hover:border-primary/50 hover:shadow-md"
            >
              {/* Left Stripe */}
              <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${meta.stripe}`} />

              <div>
                {/* Top Badges */}
                <div className="flex items-center justify-between gap-2 pl-1">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-sm font-semibold ${meta.pricePill}`}>
                    <span className="material-symbols-outlined text-[13px]">payments</span>
                    {a.type === "paid" ? `₹${a.price}${isWholeDay ? "/day" : "/slot"}` : "Free"}
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-0.5 text-label-sm font-medium text-on-surface-variant">
                    <span className="material-symbols-outlined text-[13px]">
                      {isWholeDay ? "calendar_month" : "schedule"}
                    </span>
                    {isWholeDay ? "Whole Day" : `${a.slots?.length || 0} Slots`}
                  </span>
                </div>

                {/* Amenity Title & Facility Icon */}
                <div className="mt-4 flex items-start gap-3 pl-1">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${meta.iconBg}`}>
                    <span className="material-symbols-outlined text-[24px]">{meta.icon}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-title-md font-bold text-on-surface">{a.name}</h3>
                    <p className="mt-1 line-clamp-2 text-body-sm text-on-surface-variant">
                      {a.description || "No description provided."}
                    </p>
                  </div>
                </div>

                {/* Slot preview chips if slot mode */}
                {!isWholeDay && a.slots?.length > 0 && (
                  <div className="mt-3.5 flex flex-wrap gap-1.5 pl-1">
                    {a.slots.slice(0, 3).map((s, idx) => (
                      <span key={idx} className="rounded-md bg-surface-container-high px-2 py-0.5 font-mono text-[11px] text-on-surface-variant">
                        {s}
                      </span>
                    ))}
                    {a.slots.length > 3 && (
                      <span className="rounded-md bg-surface-container-high px-1.5 py-0.5 text-[11px] font-medium text-outline">
                        +{a.slots.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-outline-variant/60 pt-3 pl-1">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setEditingAmenity(a);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/80 px-3 py-1.5 text-label-sm font-semibold text-on-surface hover:bg-surface-container-low hover:border-primary/40 hover:text-primary transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setDeletingAmenity(a);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-label-sm font-semibold text-error hover:bg-error-container/40 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {query.isSuccess && amenities.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center shadow-xs">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
            <span className="material-symbols-outlined text-[36px]">pool</span>
          </span>
          <h3 className="text-title-md font-bold text-on-surface">No Amenities Configured</h3>
          <p className="mt-1 max-w-md text-body-sm text-on-surface-variant">
            Set up society facilities like Gymnasium, Swimming Pool, Clubhouse, or Tennis Courts for resident bookings.
          </p>
          <button
            type="button"
            onClick={() => {
              setError("");
              setShowForm(true);
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-label-md font-bold text-on-primary hover:bg-primary/90 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create Your First Amenity
          </button>
        </div>
      )}

      {/* Edit Modal */}
      <EditAmenityModal
        amenity={editingAmenity}
        open={Boolean(editingAmenity)}
        onClose={() => {
          setEditingAmenity(null);
          setError("");
        }}
        onSave={(data) => updateMut.mutate(data)}
        isSaving={updateMut.isPending}
        error={error}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deletingAmenity)}
        title={`Delete Amenity "${deletingAmenity?.name}"?`}
        message="Are you sure you want to delete this amenity? Existing booking logs will remain, but members will no longer be able to book this amenity."
        confirmLabel="Delete Amenity"
        danger
        busy={deleteMut.isPending}
        error={error}
        onConfirm={() => deleteMut.mutate(deletingAmenity?.id)}
        onClose={() => {
          setDeletingAmenity(null);
          setError("");
        }}
      />
    </div>
  );
}
