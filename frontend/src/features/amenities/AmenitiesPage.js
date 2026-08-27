import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety } from "../../stores/society.store";
import { getAmenities, getSlots, bookAmenity, extractApiError } from "../../lib/amenities";

function SlotButton({ slot, onBook, disabled }) {
  const display = slot.slot === "full_day" ? "Whole Day" : slot.slot;
  return (
    <button
      type="button"
      onClick={() => onBook(slot.slot)}
      disabled={disabled || slot.isFull}
      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-body-sm ${slot.isFull ? "border-outline-variant bg-surface-container-high text-outline cursor-not-allowed" : "border-primary/30 bg-primary/5 text-on-surface hover:bg-primary/10"}`}
    >
      <span className="font-mono font-semibold">{display}</span>
      <span className={`rounded-full px-2 py-0.5 text-label-sm font-semibold ${slot.isFull ? "bg-red-100 text-red-700" : slot.available <= 1 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
        {slot.isFull ? "Full" : `${slot.available}/${slot.capacity} left`}
      </span>
    </button>
  );
}

export default function AmenitiesPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const listQuery = useQuery({
    queryKey: ["amenities", activeSociety?.id],
    queryFn: async () => (await getAmenities()).data.data,
    enabled: Boolean(activeSociety),
  });

  const slotsQuery = useQuery({
    queryKey: ["amenity-slots", selected?.id, date],
    queryFn: async () => (await getSlots(selected.id, date)).data.data,
    enabled: Boolean(selected && date),
  });

  const bookMut = useMutation({
    mutationFn: ({ amenityId, payload }) => bookAmenity(amenityId, payload).then((r) => r.data.data),
    onSuccess: () => {
      setMsg("Booked successfully!");
      setErr("");
      queryClient.invalidateQueries({ queryKey: ["amenity-slots"] });
      setTimeout(() => setMsg(""), 3000);
    },
    onError: (e) => { setErr(extractApiError(e, "Booking failed")); setMsg(""); },
  });

  const amenities = listQuery.data || [];

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/dashboard" className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Dashboard
          </Link>
          <h1 className="page-title">Amenities</h1>
          <p className="page-subtitle">{activeSociety?.name} · Book slots — defaulter check included</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/amenities/history" className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-label-sm font-medium text-on-surface hover:border-primary hover:text-primary">
            <span className="material-symbols-outlined text-[16px]">history</span> History
          </Link>
          <Link to="/amenities/manage" className="text-label-md text-primary hover:underline">Manage (Admin)</Link>
        </div>
      </section>

      {msg && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-label-md text-emerald-800">{msg}</p>}
      {err && <p className="rounded-lg bg-error-container px-3 py-2 text-label-md text-on-error-container">{err}</p>}

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {listQuery.isLoading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-surface-container-high" />)}
        {amenities.map((a) => (
          <button key={a.id} type="button" onClick={() => { setSelected(a); setErr(""); setMsg(""); }} className={`text-left rounded-xl border p-4 transition-all hover:shadow-md flex flex-col min-h-[120px] ${selected?.id === a.id ? "border-primary bg-primary/5" : "border-outline-variant bg-surface-container-lowest"}`}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate text-body-md font-semibold leading-tight text-on-surface sm:text-body-lg">{a.name}</h3>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-label-sm font-semibold ${a.type === "paid" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{a.type === "paid" ? `₹${a.price}` : "Free"}</span>
            </div>
            <p className="mt-1 text-body-sm text-on-surface-variant line-clamp-2">{a.description || "Tap to book"}</p>
            <p className="mt-auto pt-1 text-label-sm text-outline">
              {a.bookingMode === "full_day" ? `Whole Day${a.type === "paid" ? ` · ₹${a.price}/day` : ""}` : `${a.slots.length} slots`}
            </p>
          </button>
        ))}
      </div>
      {listQuery.isSuccess && amenities.length === 0 && <div className="rounded-xl border border-dashed p-10 text-center text-body-md text-on-surface-variant">No amenities yet. Admin can add at Manage.</div>}

      {selected && (
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <h2 className="text-body-md sm:text-body-lg font-semibold leading-tight">Book: {selected.name} {selected.bookingMode === "full_day" ? "(Whole Day)" : ""}</h2>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} className="w-full sm:w-auto rounded-lg border border-outline-variant px-3 py-1.5 text-body-sm" />
          </div>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            {selected.bookingMode === "full_day" ? `Whole Day` : `${selected.slots.length} slots`} · {selected.type === "paid" ? `Paid ₹${selected.price}${selected.bookingMode === "full_day" ? "/day" : ""}` : "Free"}
          </p>
          {selected.bookingMode === "full_day" ? (
            <div className="mt-4">
              {slotsQuery.isLoading ? (
                <div className="h-12 animate-pulse rounded-lg bg-surface-container-high" />
              ) : (
                (() => {
                  const s = slotsQuery.data?.[0];
                  if (!s) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => bookMut.mutate({ amenityId: selected.id, payload: { date, slot: "full_day" } })}
                      disabled={bookMut.isPending || s.isFull}
                      className={`w-full rounded-xl border-2 p-4 text-center ${s.isFull ? "border-outline-variant bg-surface-container-high text-outline cursor-not-allowed" : "border-primary bg-primary text-on-primary hover:opacity-90"}`}
                    >
                      <span className="material-symbols-outlined text-[24px]">event</span>
                      <p className="mt-1 text-body-md font-semibold">Book Whole Day — {date}</p>
                      <p className="text-label-sm opacity-80">{s.isFull ? "Fully Booked" : `${s.available}/${s.capacity} left · ${selected.type === "paid" ? `₹${selected.price}/day` : "Free"}`}</p>
                    </button>
                  );
                })()
              )}
              {bookMut.isPending && <p className="mt-3 text-label-sm text-primary">Booking...</p>}
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {slotsQuery.isLoading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-container-high" />)}
                {slotsQuery.data?.map((s) => (
                  <SlotButton key={s.slot} slot={s} disabled={bookMut.isPending} onBook={(slot) => bookMut.mutate({ amenityId: selected.id, payload: { date, slot } })} />
                ))}
              </div>
              {bookMut.isPending && <p className="mt-3 text-label-sm text-primary">Booking...</p>}
            </>
          )}
        </section>
      )}


    </div>
  );
}
