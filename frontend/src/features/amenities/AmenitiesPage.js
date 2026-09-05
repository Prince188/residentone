import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import { getAmenities, getSlots, bookAmenity, extractApiError, getAmenityMeta } from "../../lib/amenities";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";

function SlotButton({ slot, onBook, disabled }) {
  const isWholeDay = slot.slot === "full_day";
  const display = isWholeDay ? "Whole Day" : slot.slot;
  const isFull = slot.isFull || slot.available <= 0;

  return (
    <button
      type="button"
      onClick={() => onBook(slot.slot)}
      disabled={disabled || isFull}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 text-left transition-all ${
        isFull
          ? "border-outline-variant/60 bg-surface-container-low/60 text-outline cursor-not-allowed opacity-60"
          : "border-outline-variant bg-surface-container-lowest hover:border-primary hover:bg-primary/5 hover:shadow-xs cursor-pointer"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-body-sm font-bold text-on-surface">
          {display}
        </span>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${
            isFull
              ? "bg-zinc-200 text-zinc-600"
              : slot.available <= 1
              ? "bg-amber-100 text-amber-800"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {isFull ? "Booked" : `${slot.available}/${slot.capacity} left`}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between text-[12px] text-outline">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">
            {isWholeDay ? "calendar_month" : "schedule"}
          </span>
          {isFull ? "Unavailable" : "Instant Book"}
        </span>
        <span className="font-semibold text-primary group-hover:underline">
          {!isFull && "Select →"}
        </span>
      </div>
    </button>
  );
}

function AmenityCard({ amenity, isSelected, onSelect }) {
  const meta = getAmenityMeta(amenity.name, amenity.type);
  const isWholeDay = amenity.bookingMode === "full_day";

  return (
    <div
      onClick={() => onSelect(amenity)}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 transition-all duration-200 cursor-pointer ${
        isSelected
          ? "border-primary bg-primary-fixed/20 shadow-md ring-2 ring-primary"
          : "border-outline-variant bg-surface-container-lowest hover:-translate-y-0.5 hover:shadow-md hover:border-primary/50"
      }`}
    >
      {/* Category Stripe */}
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${meta.stripe}`} />

      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 pl-1">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-sm font-semibold ${meta.pricePill}`}>
            <span className="material-symbols-outlined text-[13px]">payments</span>
            {amenity.type === "paid" ? `₹${amenity.price}${isWholeDay ? "/day" : "/slot"}` : "Free"}
          </span>

          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-0.5 text-label-sm font-medium text-on-surface-variant">
            <span className="material-symbols-outlined text-[13px]">
              {isWholeDay ? "event" : "schedule"}
            </span>
            {isWholeDay ? "Whole Day" : `${amenity.slots?.length || 0} Slots`}
          </span>
        </div>

        {/* Icon & Name */}
        <div className="mt-4 flex items-start gap-3.5 pl-1">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 ${meta.iconBg}`}>
            <span className="material-symbols-outlined text-[26px]">{meta.icon}</span>
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-1 text-title-md font-bold text-on-surface">
              {amenity.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-body-sm text-on-surface-variant">
              {amenity.description || "Community facility available for booking by residents."}
            </p>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="mt-4 flex items-center justify-between border-t border-outline-variant/60 pt-3.5 pl-1">
        <span className="text-[12px] font-medium text-outline flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">info</span>
          {isWholeDay ? "Day-wise reservation" : "Hourly slot reservation"}
        </span>

        <span className={`inline-flex items-center gap-1 text-label-sm font-bold ${isSelected ? "text-primary" : "text-primary group-hover:underline"}`}>
          {isSelected ? "Booking Open" : "Book Slots →"}
        </span>
      </div>
    </div>
  );
}

export default function AmenitiesPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const membership = useSocietyStore(selectActiveMembership);
  const queryClient = useQueryClient();

  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canManage = hasPermission(membership?.role, "manage_amenities", permissionsQuery.data);

  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const listQuery = useQuery({
    queryKey: ["amenities", activeSociety?.id],
    queryFn: async () => (await getAmenities()).data.data,
    enabled: Boolean(activeSociety),
  });

  const amenities = useMemo(() => listQuery.data || [], [listQuery.data]);

  // Default select first amenity when loaded if none selected
  useMemo(() => {
    if (!selected && amenities.length > 0) {
      setSelected(amenities[0]);
    }
  }, [amenities, selected]);

  const slotsQuery = useQuery({
    queryKey: ["amenity-slots", selected?.id, date],
    queryFn: async () => (await getSlots(selected.id, date)).data.data,
    enabled: Boolean(selected && date),
  });

  const bookMut = useMutation({
    mutationFn: ({ amenityId, payload }) => bookAmenity(amenityId, payload).then((r) => r.data.data),
    onSuccess: () => {
      setMsg("Booking confirmed successfully! You can view it in your history.");
      setErr("");
      queryClient.invalidateQueries({ queryKey: ["amenity-slots"] });
      setTimeout(() => setMsg(""), 3500);
    },
    onError: (e) => {
      setErr(extractApiError(e, "Booking failed. Please check your society dues or try another slot."));
      setMsg("");
    },
  });

  const minDate = new Date().toISOString().slice(0, 10);

  // Quick date jump helpers
  const handleSetQuickDate = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setDate(d.toISOString().slice(0, 10));
  };

  const selectedMeta = selected ? getAmenityMeta(selected.name, selected.type) : null;
  const isSelectedWholeDay = selected?.bookingMode === "full_day";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            to="/dashboard"
            className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Dashboard
          </Link>
          <h1 className="page-title flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">sports_tennis</span>
            Amenities & Facilities
          </h1>
          <p className="page-subtitle">
            {activeSociety ? `${activeSociety.name} · ` : ""}
            Explore society club facilities and reserve time slots.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/amenities/history"
            className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-label-md font-semibold text-on-surface no-underline hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">history</span>
            My Bookings
          </Link>
          {canManage && (
            <Link
              to="/amenities/manage"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-label-md font-semibold text-on-primary no-underline hover:opacity-90 shadow-sm transition-opacity"
            >
              <span className="material-symbols-outlined text-[18px]">settings</span>
              Manage
            </Link>
          )}
        </div>
      </section>

      {/* Notifications */}
      {msg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200/60 px-4 py-3 text-body-sm font-medium text-emerald-800 shadow-xs">
          <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
          {msg}
        </div>
      )}
      {err && (
        <div className="flex items-center gap-2 rounded-xl bg-error-container/50 border border-error/30 px-4 py-3 text-body-sm font-medium text-on-error-container">
          <span className="material-symbols-outlined text-[18px] text-error">error</span>
          {err}
        </div>
      )}

      {/* Loading Skeletons */}
      {listQuery.isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-surface-container-high" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {listQuery.isSuccess && amenities.length === 0 && (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center shadow-xs">
          <span className="material-symbols-outlined text-[48px] text-outline">sports_tennis</span>
          <h3 className="mt-3 text-title-md font-semibold text-on-surface">No amenities configured</h3>
          <p className="mt-1 text-body-sm text-on-surface-variant max-w-md mx-auto">
            Your society administration has not added any bookable facilities yet.
          </p>
          {canManage && (
            <Link
              to="/amenities/manage"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-label-md font-semibold text-on-primary no-underline hover:opacity-90 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span> Add First Amenity
            </Link>
          )}
        </div>
      )}

      {/* Amenities Grid */}
      {amenities.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-title-sm font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">grid_view</span>
              Select an Amenity ({amenities.length})
            </h2>
            <span className="text-label-sm text-outline">Click an amenity to pick a date & time</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {amenities.map((a) => (
              <AmenityCard
                key={a.id}
                amenity={a}
                isSelected={selected?.id === a.id}
                onSelect={(item) => {
                  setSelected(item);
                  setErr("");
                  setMsg("");
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Selected Amenity Booking Section */}
      {selected && (
        <section className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6 shadow-sm space-y-5">
          <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-2 ${selectedMeta?.stripe || "bg-primary"}`} />

          {/* Header of Booking Panel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-1 border-b border-outline-variant/60 pb-4">
            <div className="flex items-center gap-3">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${selectedMeta?.iconBg}`}>
                <span className="material-symbols-outlined text-[26px]">{selectedMeta?.icon}</span>
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-title-md font-bold text-on-surface">
                    Book {selected.name}
                  </h2>
                  <span className={`rounded-full px-2.5 py-0.5 text-label-sm font-semibold ${selectedMeta?.pricePill}`}>
                    {selected.type === "paid" ? `₹${selected.price}${isSelectedWholeDay ? "/day" : "/slot"}` : "Free"}
                  </span>
                </div>
                <p className="text-[12px] text-outline mt-0.5">
                  {isSelectedWholeDay ? "Whole-day exclusive reservation" : `Choose from available hourly slots`}
                </p>
              </div>
            </div>

            {/* Date Picker & Quick Buttons */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(0)}
                  className={`rounded-full px-3 py-1 text-label-sm font-semibold border transition-colors cursor-pointer ${
                    date === minDate
                      ? "bg-primary text-on-primary border-primary shadow-xs"
                      : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(1)}
                  className="rounded-full px-3 py-1 text-label-sm font-semibold border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Tomorrow
                </button>
              </div>
              <input
                type="date"
                value={date}
                min={minDate}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-1.5 text-body-sm font-semibold text-on-surface focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Slots View */}
          <div className="pl-1">
            {isSelectedWholeDay ? (
              <div className="mt-2">
                {slotsQuery.isLoading ? (
                  <div className="h-28 animate-pulse rounded-2xl bg-surface-container-high" />
                ) : (
                  (() => {
                    const s = slotsQuery.data?.[0];
                    const isFull = s?.isFull || (s && s.available <= 0);
                    return (
                      <div className="rounded-2xl border border-outline-variant/80 bg-surface-container-low/40 p-6 text-center space-y-3">
                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <span className="material-symbols-outlined text-[32px]">event_available</span>
                        </div>
                        <div>
                          <h3 className="text-title-md font-bold text-on-surface">
                            Whole Day Reservation for {new Date(date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                          </h3>
                          <p className="mt-1 text-body-sm text-on-surface-variant">
                            {isFull
                              ? "This facility is fully booked on this date. Please pick another date."
                              : `Entire venue is reserved for your event · ${selected.type === "paid" ? `₹${selected.price} per day` : "Free of charge"}`}
                          </p>
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => bookMut.mutate({ amenityId: selected.id, payload: { date, slot: "full_day" } })}
                            disabled={bookMut.isPending || isFull}
                            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-label-md font-bold text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {bookMut.isPending ? "hourglass_top" : "event"}
                            </span>
                            {bookMut.isPending ? "Reserving..." : isFull ? "Fully Booked" : `Book Whole Day (${selected.type === "paid" ? `₹${selected.price}` : "Free"})`}
                          </button>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-label-md font-semibold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
                    Available Time Slots for {new Date(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                  </h3>
                  <span className="text-[12px] text-outline">Click any slot to book</span>
                </div>

                {slotsQuery.isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-container-high" />
                    ))}
                  </div>
                ) : (slotsQuery.data || []).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-outline-variant p-6 text-center text-body-sm text-on-surface-variant">
                    No time slots configured for this amenity.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {slotsQuery.data?.map((s) => (
                      <SlotButton
                        key={s.slot}
                        slot={s}
                        disabled={bookMut.isPending}
                        onBook={(slot) =>
                          bookMut.mutate({ amenityId: selected.id, payload: { date, slot } })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
