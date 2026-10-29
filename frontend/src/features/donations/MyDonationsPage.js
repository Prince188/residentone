import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety } from "../../stores/society.store";
import { getMyDonations, formatAmount, formatDate, DONATION_PURPOSES } from "../../lib/donations";

export default function MyDonationsPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const societyId = activeSociety?.id || activeSociety?._id;

  const { data: donationsRes, isLoading } = useQuery({
    queryKey: ["my-donations", societyId],
    queryFn: () => getMyDonations(),
    enabled: Boolean(societyId),
  });

  const donations = donationsRes?.data || [];
  const totalContributed = donations
    .filter((d) => d.status !== "cancelled")
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        <Link to="/donations" className="hover:text-primary transition-colors">Donations</Link>
        <span>/</span>
        <span className="text-on-surface font-semibold">My Contributions</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">My Society Donations</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            View your donation receipts and contributions to society festivals, temple drives, and welfare funds.
          </p>
        </div>

        <Link
          to="/donations"
          className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          All Donation Drives
        </Link>
      </div>

      {/* KPI Card */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Your Total Contributions</span>
          <p className="mt-1 text-3xl font-extrabold text-purple-700">{formatAmount(totalContributed)}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Across {donations.length} receipts</p>
        </div>
        <span className="material-symbols-outlined text-purple-600 bg-purple-50 p-4 rounded-2xl text-[36px]">volunteer_activism</span>
      </div>

      {/* Receipts Table */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-on-surface-variant">Loading your donation history...</div>
        ) : donations.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[44px] text-outline">volunteer_activism</span>
            <h3 className="mt-2 text-base font-semibold text-on-surface">No donations recorded</h3>
            <p className="mt-1 text-sm">You haven't contributed to any society drives yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold uppercase text-on-surface-variant">
                <tr>
                  <th className="px-5 py-3.5">Cause / Purpose</th>
                  <th className="px-4 py-3.5">Receipt #</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Mode</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {donations.map((d) => {
                  const purposeMeta = DONATION_PURPOSES.find((p) => p.id === d.purpose);
                  const isCancelled = d.status === "cancelled";
                  return (
                    <tr key={d._id || d.id} className="hover:bg-surface-container-low/50">
                      <td className="px-5 py-4 font-semibold text-on-surface">
                        {purposeMeta?.label || d.purpose || "General Donation"}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-on-surface-variant">{d.receiptNo || "—"}</td>
                      <td className="px-4 py-4 text-on-surface-variant">{formatDate(d.createdAt || d.date)}</td>
                      <td className="px-4 py-4 capitalize text-on-surface-variant">{d.paymentMode || "Cash"}</td>
                      <td className="px-4 py-4 text-right font-bold text-emerald-700">{formatAmount(d.amount)}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isCancelled ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {isCancelled ? "Cancelled" : "Success"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
