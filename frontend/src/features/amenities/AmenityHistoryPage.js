import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety } from "../../stores/society.store";
import { getMyBookings, cancelBooking, extractApiError } from "../../lib/amenities";

function BookingCard({ b, onCancel, cancelling }) {
  const isBooked = b.status === "booked";
  const isWholeDay = b.slot === "full_day";
  return (
    <article
      className={`group relative flex gap-3 overflow-hidden rounded-xl border p-4 pl-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        isBooked ? "border-emerald-200 bg-emerald-50/40 hover:border-emerald-300" : "border-outline-variant bg-surface-container-lowest"
      }`}
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${isBooked ? "bg-emerald-500" : "bg-zinc-300"}`} />
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[18px] ${isBooked ? "bg-emerald-600 text-white" : "bg-surface-container-high text-on-surface-variant"}`}>
        <span className="material-symbols-outlined text-[20px]">{isWholeDay ? "event" : "schedule"}</span>
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="truncate text-body-md font-semibold text-on-surface">{b.amenityId?.name || "Amenity"}</h3>
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-label-sm font-semibold ${isBooked ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-600"}`}>
            <span className="material-symbols-outlined text-[13px]">{isBooked ? "check_circle" : "cancel"}</span>
            {isBooked ? "Booked" : "Cancelled"}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2 py-0.5 text-label-sm font-medium text-on-surface-variant">
            <span className="material-symbols-outlined text-[13px]">calendar_today</span> {b.date}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-semibold ${isWholeDay ? "bg-primary/10 text-primary" : "bg-secondary-fixed text-on-secondary-fixed"}`}>
            <span className="material-symbols-outlined text-[13px]">{isWholeDay ? "event" : "schedule"}</span> {isWholeDay ? "Whole Day" : b.slot}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-semibold ${b.amount ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
            <span className="material-symbols-outlined text-[13px]">payments</span> {b.amount ? `₹${b.amount}${isWholeDay ? "/day" : ""}` : "Free"}
          </span>
        </div>
        <p className="mt-2 flex items-center gap-1 text-label-sm text-outline">
          <span className="material-symbols-outlined text-[12px]">schedule</span>
          Booked {new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      {isBooked && (
        <button
          type="button"
          onClick={() => { if (window.confirm("Cancel this booking? Slot will be freed.")) onCancel(b._id); }}
          disabled={cancelling}
          className="self-center shrink-0 rounded-full border border-outline-variant bg-surface-container-lowest px-3.5 py-1.5 text-label-sm font-semibold text-on-surface transition-colors hover:border-error hover:bg-error hover:text-on-error disabled:opacity-50"
        >
          Cancel
        </button>
      )}
    </article>
  );
}

export default function AmenityHistoryPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["amenity-my-bookings", activeSociety?.id],
    queryFn: async () => (await getMyBookings()).data.data,
    enabled: Boolean(activeSociety),
  });

  const cancelMut = useMutation({
    mutationFn: (bookingId) => cancelBooking(bookingId).then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["amenity-my-bookings"] }),
  });

  const bookings = query.data || [];
  const bookedCount = bookings.filter((b) => b.status === "booked").length;
  const cancelledCount = bookings.length - bookedCount;

  return (
    <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
      <Link to="/amenities" className="inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
        <span className="material-symbols-outlined text-[16px]">arrow_back</span> Amenities
      </Link>

      <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
        <div className="bg-gradient-to-br from-primary via-primary-container to-on-primary-fixed p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-label-md uppercase tracking-[0.14em] text-white/70">History</p>
              <h1 className="mt-1 text-headline-sm font-bold text-white">Booking History</h1>
              <p className="mt-1 text-label-md text-white/80">{activeSociety?.name} · {bookings.length} total</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
              <span className="material-symbols-outlined">history</span>
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
              <p className="text-headline-sm font-bold text-white">{bookings.length}</p>
              <p className="text-label-sm text-white/70">Total</p>
            </div>
            <div className="rounded-xl bg-emerald-500/90 p-3 text-center">
              <p className="text-headline-sm font-bold text-white">{bookedCount}</p>
              <p className="text-label-sm text-white/90">Booked</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
              <p className="text-headline-sm font-bold text-white">{cancelledCount}</p>
              <p className="text-label-sm text-white/70">Cancelled</p>
            </div>
          </div>
        </div>
      </section>

      {query.isLoading && <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-container-high" />)}</div>}

      {query.isError && <p className="rounded-xl border border-error bg-error-container px-4 py-3 text-label-md text-on-error-container">{extractApiError(query.error, "Failed to load history")}</p>}

      {query.isSuccess && bookings.length === 0 && (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-[44px] text-outline">event_busy</span>
          <p className="mt-3 text-body-md font-semibold text-on-surface">No bookings yet</p>
          <p className="mt-1 text-body-sm text-on-surface-variant">Book a Gym slot or Clubhouse whole day to see it here.</p>
          <Link to="/amenities" className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-label-md text-on-primary no-underline hover:opacity-90">
            <span className="material-symbols-outlined text-[18px]">add</span> Book now
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {bookings.map((b) => (
          <BookingCard key={b._id} b={b} onCancel={(id) => cancelMut.mutate(id)} cancelling={cancelMut.isPending} />
        ))}
      </div>
    </div>
  );
}
