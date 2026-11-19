import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import { hasPermissionForMembership } from "../../lib/permissions";
import api from "../../lib/api";

export default function SocietyBankDetailsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);

  // Permissions check
  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });

  const canManageBank =
    activeMembership?.role === "society_admin" ||
    activeMembership?.role === "super_admin" ||
    hasPermissionForMembership(activeMembership, "manage_bank_details", permissionsQuery.data);

  // Fetch Society data
  const societyQuery = useQuery({
    queryKey: ["society-me", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/me")).data.data,
    enabled: Boolean(activeSociety),
  });

  const society = societyQuery.data;

  // Form State
  const [form, setForm] = useState({
    accountHolderName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifsc: "",
    bankName: "",
    pan: "",
  });

  const [ifscInfo, setIfscInfo] = useState(null);
  const [ifscLoading, setIfscLoading] = useState(false);
  const [ifscError, setIfscError] = useState("");
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Populate existing bank details
  useEffect(() => {
    if (society) {
      const bank = society.bankDetails || {};
      setForm({
        accountHolderName: bank.accountHolderName || society.name || "",
        accountNumber: bank.accountNumber || "",
        confirmAccountNumber: bank.accountNumber || "",
        ifsc: bank.ifsc || "",
        bankName: bank.bankName || "",
        pan: bank.pan || "",
      });
      if (bank.ifsc && bank.ifsc.length === 11) {
        lookupIfsc(bank.ifsc);
      }
    }
  }, [society]);

  // Real-time IFSC lookup
  const lookupIfsc = async (code) => {
    const clean = code.trim().toUpperCase();
    if (clean.length !== 11) {
      setIfscInfo(null);
      setIfscError("");
      return;
    }
    setIfscLoading(true);
    setIfscError("");
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${clean}`);
      if (res.ok) {
        const data = await res.json();
        setIfscInfo(data);
        if (!form.bankName || form.bankName !== data.BANK) {
          setForm((p) => ({ ...p, bankName: data.BANK || "" }));
        }
      } else {
        setIfscInfo(null);
        setIfscError("Invalid IFSC code. Please verify with your bank cheque/passbook.");
      }
    } catch {
      setIfscInfo(null);
    } finally {
      setIfscLoading(false);
    }
  };

  const handleIfscChange = (val) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
    setForm((p) => ({ ...p, ifsc: clean }));
    if (clean.length === 11) {
      lookupIfsc(clean);
    } else {
      setIfscInfo(null);
      setIfscError("");
    }
  };

  const handlePanChange = (val) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    setForm((p) => ({ ...p, pan: clean }));
  };

  // Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      return (await api.patch("/societies/me", { bankDetails: payload })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["society-me"]);
      queryClient.invalidateQueries(["society-permissions"]);
      setSuccessMsg("Bank details saved successfully! Direct settlement via Cashfree Easy Split is active.");
      setErr("");
      setTimeout(() => setSuccessMsg(""), 6000);
    },
    onError: (e) => {
      setErr(e?.response?.data?.error?.message || e.message || "Failed to update bank details");
      setSuccessMsg("");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr("");
    setSuccessMsg("");

    if (!form.accountHolderName.trim()) {
      setErr("Account holder name is required.");
      return;
    }
    if (!form.accountNumber.trim()) {
      setErr("Bank account number is required.");
      return;
    }
    if (form.accountNumber.trim() !== form.confirmAccountNumber.trim()) {
      setErr("Account number and Confirm Account Number do not match!");
      return;
    }
    if (!form.ifsc.trim() || form.ifsc.trim().length !== 11) {
      setErr("A valid 11-character IFSC code is required.");
      return;
    }
    if (!form.pan.trim() || form.pan.trim().length !== 10) {
      setErr("A valid 10-character PAN is required for RBI/Cashfree settlement compliance.");
      return;
    }

    saveMutation.mutate({
      accountHolderName: form.accountHolderName.trim(),
      accountNumber: form.accountNumber.trim(),
      ifsc: form.ifsc.trim().toUpperCase(),
      bankName: form.bankName.trim() || ifscInfo?.BANK || "Bank Account",
      pan: form.pan.trim().toUpperCase(),
    });
  };

  if (!canManageBank) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <span className="material-symbols-outlined text-[32px]">lock</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
        <p className="text-sm text-slate-600 mt-2">
          Only the Society Admin or committee members with "Manage Bank Details" permission can configure bank settlement accounts.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-6 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const isConfigured = Boolean(society?.bankDetails?.accountNumber && society?.bankDetails?.ifsc);
  const isVendorActive = Boolean(society?.cashfreeVendorId);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
        <button onClick={() => navigate("/dashboard")} className="hover:text-primary transition-colors">
          Dashboard
        </button>
        <span>/</span>
        <button onClick={() => navigate("/society/manage")} className="hover:text-primary transition-colors">
          Society Admin
        </button>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Bank & Settlement Details</span>
      </div>

      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100 shadow-xs">
              <span className="material-symbols-outlined text-[22px]">account_balance</span>
            </span>
            <span>Bank & Direct Settlement</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1.5">
            Configure your society's official bank account for automated, direct T+1 settlements via Cashfree Easy Split.
          </p>
        </div>
      </div>

      {/* Easy Split Status Banner */}
      <div
        className={`mb-6 p-5 rounded-3xl border transition-all ${
          isVendorActive
            ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
            : isConfigured
            ? "bg-amber-50/70 border-amber-200 text-amber-950"
            : "bg-blue-50/70 border-blue-200 text-blue-950"
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 text-white ${
              isVendorActive ? "bg-emerald-600 shadow-xs" : isConfigured ? "bg-amber-600" : "bg-blue-600"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isVendorActive ? "verified" : isConfigured ? "pending" : "info"}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold">
                {isVendorActive
                  ? "Direct Bank Settlement Active (Cashfree Easy Split)"
                  : isConfigured
                  ? "Bank Saved • Syncing Easy Split Vendor"
                  : "Direct Settlement Not Connected"}
              </h3>
              {isVendorActive && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 font-semibold">
                  Vendor ID: {society.cashfreeVendorId}
                </span>
              )}
            </div>
            <p className="text-xs mt-1 leading-relaxed opacity-90">
              {isVendorActive
                ? "All resident maintenance dues, UPI collections, and festival drives are settled directly into this bank account on standard T+1 banking cycles."
                : "Enter your official society bank account and IFSC below. When residents pay, funds will route directly into your bank without passing through platform wallets."}
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {err && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{err}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Account Type Notice */}
      <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-start gap-2.5">
        <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">verified_user</span>
        <div className="leading-relaxed">
          <span className="font-bold text-slate-900">Personal & Society Accounts Supported: </span>
          If your society doesn't have an official society bank account, you can add any designated resident's personal bank account (e.g. Secretary, Chairman, or Treasurer). Enter their personal Account Holder Name and personal PAN. Cashfree Easy Split will settle resident payments directly into that account.
        </div>
      </div>

      {/* Main Bank Details Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-black/[0.07] p-6 sm:p-8 shadow-sm space-y-5">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-black/[0.05] pb-3">
          <span className="material-symbols-outlined text-primary text-[20px]">account_balance_wallet</span>
          <span>Settlement Bank Account</span>
        </h2>

        {/* Account Holder Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center justify-between" htmlFor="accHolder">
            <span>Account Holder Name (As per Bank Records) <span className="text-rose-500">*</span></span>
            <span className="text-[11px] font-normal text-slate-400">Society Name or Resident Name</span>
          </label>
          <input
            id="accHolder"
            type="text"
            required
            value={form.accountHolderName}
            onChange={(e) => setForm((p) => ({ ...p, accountHolderName: e.target.value }))}
            placeholder="e.g. Prince Patel OR Shree Ram Housing Society"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all"
          />
        </div>

        {/* Account Number & Confirm Account Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700" htmlFor="accNum">
              Bank Account Number <span className="text-rose-500">*</span>
            </label>
            <input
              id="accNum"
              type="text"
              required
              value={form.accountNumber}
              onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value.replace(/\D/g, "") }))}
              placeholder="e.g. 50200012345678"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-mono text-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700" htmlFor="confirmAccNum">
              Confirm Account Number <span className="text-rose-500">*</span>
            </label>
            <input
              id="confirmAccNum"
              type="password"
              required
              value={form.confirmAccountNumber}
              onChange={(e) => setForm((p) => ({ ...p, confirmAccountNumber: e.target.value.replace(/\D/g, "") }))}
              placeholder="Re-enter to confirm"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-mono text-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all"
            />
          </div>
        </div>

        {/* IFSC Code with Auto Detection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center justify-between" htmlFor="ifscCode">
            <span>Bank IFSC Code <span className="text-rose-500">*</span></span>
            <span className="text-[11px] font-normal text-slate-400">11 characters (e.g. HDFC0000240)</span>
          </label>
          <div className="relative">
            <input
              id="ifscCode"
              type="text"
              maxLength={11}
              required
              value={form.ifsc}
              onChange={(e) => handleIfscChange(e.target.value)}
              placeholder="e.g. HDFC0000240"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-mono uppercase text-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all"
            />
            {ifscLoading && (
              <div className="absolute right-3.5 top-3.5 text-primary">
                <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
              </div>
            )}
          </div>

          {/* Auto-detected Bank / Branch Badge */}
          {ifscInfo && (
            <div className="mt-2 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-950 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-700 text-[18px]">domain</span>
              <div>
                <span className="font-bold">{ifscInfo.BANK}</span> • {ifscInfo.BRANCH}, {ifscInfo.CITY}
              </div>
            </div>
          )}
          {ifscError && (
            <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              {ifscError}
            </p>
          )}
        </div>

        {/* Society PAN or Authorized Signatory PAN */}
        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-semibold text-slate-700 flex items-center justify-between" htmlFor="panCode">
            <span>PAN (Society PAN or Account Holder's Personal PAN) <span className="text-rose-500">*</span></span>
            <span className="text-[11px] font-normal text-slate-400">10 characters (e.g. HCLPP1234R)</span>
          </label>
          <input
            id="panCode"
            type="text"
            maxLength={10}
            required
            value={form.pan}
            onChange={(e) => handlePanChange(e.target.value)}
            placeholder="e.g. HCLPP1234R or AAATG1234F"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-mono uppercase text-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Required for Cashfree settlement KYC. If using a resident's personal bank account, enter that resident's personal PAN.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-black/[0.05]">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all shadow-[0_4px_16px_rgba(0,105,72,0.25)] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                <span>Connecting with Cashfree...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>Save & Connect Direct Settlement</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
