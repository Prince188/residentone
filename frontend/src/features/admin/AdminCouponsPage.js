import { useState, useEffect } from "react";
import {
  getAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  deleteAdminCoupon,
} from "../../lib/coupons";

const EMPTY_COUPON = {
  code: "",
  description: "",
  discountType: "FLAT",
  discountValue: 100,
  maxDiscountAmount: "",
  minOrderAmount: 0,
  validFrom: new Date().toISOString().split("T")[0],
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  globalUsageLimit: "",
  perSocietyUsageLimit: 1,
  isActive: true,
};

export default function AdminCouponsPage() {
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formValues, setFormValues] = useState(EMPTY_COUPON);
  const [saving, setSaving] = useState(false);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await getAdminCoupons({ search, status: statusFilter });
      setCoupons(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch coupons:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [search, statusFilter]);

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setFormValues(EMPTY_COUPON);
    setShowModal(true);
  };

  const handleOpenEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormValues({
      code: coupon.code,
      description: coupon.description || "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscountAmount: coupon.maxDiscountAmount ?? "",
      minOrderAmount: coupon.minOrderAmount ?? 0,
      validFrom: coupon.validFrom ? new Date(coupon.validFrom).toISOString().split("T")[0] : "",
      validUntil: coupon.validUntil ? new Date(coupon.validUntil).toISOString().split("T")[0] : "",
      globalUsageLimit: coupon.globalUsageLimit ?? "",
      perSocietyUsageLimit: coupon.perSocietyUsageLimit ?? 1,
      isActive: coupon.isActive,
    });
    setShowModal(true);
  };

  const handleToggleActive = async (coupon) => {
    try {
      await updateAdminCoupon(coupon._id, { isActive: !coupon.isActive });
      fetchCoupons();
    } catch (err) {
      alert("Failed to toggle coupon state");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coupon code?")) return;
    try {
      await deleteAdminCoupon(id);
      fetchCoupons();
    } catch (err) {
      alert(err.response?.data?.error?.message || "Failed to delete coupon");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formValues,
        discountValue: Number(formValues.discountValue),
        maxDiscountAmount: formValues.maxDiscountAmount ? Number(formValues.maxDiscountAmount) : null,
        minOrderAmount: Number(formValues.minOrderAmount) || 0,
        globalUsageLimit: formValues.globalUsageLimit ? Number(formValues.globalUsageLimit) : null,
        perSocietyUsageLimit: Number(formValues.perSocietyUsageLimit) || 1,
      };

      if (editingCoupon) {
        await updateAdminCoupon(editingCoupon._id, payload);
      } else {
        await createAdminCoupon(payload);
      }
      setShowModal(false);
      fetchCoupons();
    } catch (err) {
      alert(err.response?.data?.error?.message || "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl">confirmation_number</span>
            Coupon Code Manager
          </h1>
          <p className="text-sm text-on-surface-variant">
            Create and manage promotional discount coupons for society onboarding & subscriptions.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm text-sm"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Create New Coupon
        </button>
      </div>

      {/* Filters & Search */}
      <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {["all", "active", "expired", "inactive"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                statusFilter === st
                  ? "bg-primary text-on-primary shadow-sm"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {st === "all" ? "All Coupons" : st}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[20px]">search</span>
          <input
            type="text"
            placeholder="Search coupon code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-sm focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Coupons Grid */}
      {loading ? (
        <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
          <p>Loading coupon codes...</p>
        </div>
      ) : coupons.length === 0 ? (
        <div className="p-12 text-center text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-2xl">
          <span className="material-symbols-outlined text-4xl text-outline mb-2">confirmation_number</span>
          <p className="font-semibold text-on-surface">No coupon codes found</p>
          <p className="text-xs text-outline mt-1">Click "Create New Coupon" to set up your first promo code.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((item) => {
            const isExpired = item.validUntil && new Date(item.validUntil) < new Date();
            return (
              <div
                key={item._id}
                className={`p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-sm space-y-3 flex flex-col justify-between transition-all ${
                  !item.isActive || isExpired ? "opacity-75" : ""
                }`}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-base font-bold px-3 py-1 rounded-xl bg-primary-container text-on-primary-container border border-primary/20 tracking-wider">
                      {item.code}
                    </span>

                    {/* Status Badge */}
                    {isExpired ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container text-xs font-semibold">
                        Expired
                      </span>
                    ) : item.isActive ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-semibold">
                        Active
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-surface-variant text-on-surface-variant text-xs font-semibold">
                        Inactive
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-xs text-on-surface-variant mb-2 line-clamp-2">{item.description}</p>
                  )}

                  {/* Value */}
                  <div className="text-lg font-bold text-on-surface flex items-baseline gap-1">
                    {item.discountType === "PERCENTAGE" ? (
                      <>
                        <span>{item.discountValue}% OFF</span>
                        {item.maxDiscountAmount && (
                          <span className="text-xs font-normal text-outline">(Max ₹{item.maxDiscountAmount})</span>
                        )}
                      </>
                    ) : (
                      <span>₹{item.discountValue} FLAT OFF</span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="mt-3 pt-3 border-t border-outline-variant space-y-1 text-xs text-on-surface-variant">
                    <div className="flex justify-between">
                      <span className="text-outline">Usage Count:</span>
                      <span className="font-semibold text-on-surface">
                        {item.usedCount} / {item.globalUsageLimit ? item.globalUsageLimit : "∞"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-outline">Min Purchase:</span>
                      <span>₹{item.minOrderAmount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-outline">Valid Until:</span>
                      <span>{new Date(item.validUntil).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-outline-variant flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleActive(item)}
                    className="text-xs font-medium text-outline hover:text-on-surface flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {item.isActive ? "toggle_on" : "toggle_off"}
                    </span>
                    {item.isActive ? "Deactivate" : "Activate"}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-container hover:bg-surface-container-high text-on-surface"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-error-container/20 hover:bg-error-container/40 text-error"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h3 className="text-lg font-bold text-on-surface">
                {editingCoupon ? "Edit Coupon Code" : "Create New Coupon Code"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WELCOME100 or FESTIVAL20"
                  value={formValues.code}
                  onChange={(e) => setFormValues({ ...formValues, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant text-sm font-mono font-bold uppercase focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Short description for campaign..."
                  value={formValues.description}
                  onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Discount Type *</label>
                  <select
                    value={formValues.discountType}
                    onChange={(e) => setFormValues({ ...formValues, discountType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="FLAT">Flat Amount (₹)</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Discount Value ({formValues.discountType === "PERCENTAGE" ? "%" : "₹"}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formValues.discountValue}
                    onChange={(e) => setFormValues({ ...formValues, discountValue: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {formValues.discountType === "PERCENTAGE" && (
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    placeholder="Leave blank for no limit (e.g. 1000)"
                    value={formValues.maxDiscountAmount}
                    onChange={(e) => setFormValues({ ...formValues, maxDiscountAmount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Min Order Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formValues.minOrderAmount}
                    onChange={(e) => setFormValues({ ...formValues, minOrderAmount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Total Global Usage Limit</label>
                  <input
                    type="number"
                    placeholder="Leave blank for unlimited"
                    value={formValues.globalUsageLimit}
                    onChange={(e) => setFormValues({ ...formValues, globalUsageLimit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Valid From *</label>
                  <input
                    type="date"
                    required
                    value={formValues.validFrom}
                    onChange={(e) => setFormValues({ ...formValues, validFrom: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Valid Until (Expiry) *</label>
                  <input
                    type="date"
                    required
                    value={formValues.validUntil}
                    onChange={(e) => setFormValues({ ...formValues, validUntil: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeCheckCoupon"
                  checked={formValues.isActive}
                  onChange={(e) => setFormValues({ ...formValues, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
                />
                <label htmlFor="activeCheckCoupon" className="text-xs font-medium text-on-surface">
                  Coupon Code Active
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingCoupon ? "Update Coupon" : "Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
