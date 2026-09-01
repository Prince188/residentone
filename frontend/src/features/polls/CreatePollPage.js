import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import { createPoll, extractApiError } from "../../lib/polls";
import { getHouseCards } from "../../lib/houses";
import api from "../../lib/api";
import { hasPermissionForMembership, getMembershipRoles } from "../../lib/permissions";

export default function CreatePollPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const membership = useSocietyStore(selectActiveMembership);
  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canCreatePoll = hasPermissionForMembership(membership, "create_poll", permissionsQuery.data);

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [type, setType] = useState("open");
  const [scope, setScope] = useState("society");
  const [wing, setWing] = useState("");
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(23, 59, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [error, setError] = useState("");

  const housesQuery = useQuery({
    queryKey: ["house-cards", activeSociety?.id],
    queryFn: async () => (await getHouseCards()).data.data,
    enabled: Boolean(activeSociety),
  });
  const roles = getMembershipRoles(membership);
  const isPureWingAdmin = roles.includes("wing_admin") && !roles.includes("society_admin") && !roles.includes("super_admin");
  const availableWings = useMemo(() => {
    const houses = housesQuery.data || [];
    const set = new Set();
    houses.forEach((h) => { if (h.block) set.add(String(h.block).toUpperCase()); });
    const all = Array.from(set).sort();
    // wing_admin sees only assigned wings
    const isSocietyAdmin = roles.includes("society_admin") || roles.includes("super_admin");
    if (!isSocietyAdmin && roles.includes("wing_admin")) {
      const assigned = (membership.assignedWings || []).map((w) => String(w).toUpperCase());
      return all.filter((w) => assigned.includes(w));
    }
    return all;
  }, [housesQuery.data, membership, roles]);

  useEffect(() => {
    if (isPureWingAdmin && scope !== "wing") setScope("wing");
    if (isPureWingAdmin && availableWings.length === 1 && !wing) setWing(availableWings[0]);
  }, [isPureWingAdmin, availableWings, scope, wing]);

  const mutation = useMutation({
    mutationFn: (payload) => createPoll(payload).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      navigate("/polls");
    },
    onError: (err) => setError(extractApiError(err, "Failed to create poll")),
  });

  if (!canCreatePoll) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <p className="text-body-md text-error">You don’t have permission to create polls.</p>
        <p className="text-body-sm text-on-surface-variant">Ask your Society Admin for <strong>Create Poll</strong> permission.</p>
        <Link to="/polls" className="mt-4 inline-block text-primary hover:underline">Back to Polls</Link>
      </div>
    );
  }

  const addOption = () => {
    if (options.length < 4) setOptions([...options, ""]);
  };
  const removeOption = (idx) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };
  const updateOption = (idx, val) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const cleaned = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || question.trim().length < 5) return setError("Question must be at least 5 characters");
    if (cleaned.length < 2) return setError("At least 2 options required");
    if (new Set(cleaned.map((o) => o.toLowerCase())).size !== cleaned.length) return setError("Options must be unique");
    if (!endDate) return setError("End date is required");
    if (new Date(endDate) <= new Date()) return setError("End date must be in future");
    if (scope === "wing" && !wing) return setError("Select a wing for wing poll");

    mutation.mutate({ question: question.trim(), options: cleaned, type, endDate: new Date(endDate).toISOString(), scope, wing: scope === "wing" ? wing : null });
  };

  // Default min for datetime-local
  const minDate = new Date().toISOString().slice(0, 16);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/polls" className="inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Back to Polls
      </Link>

      <div>
        <h1 className="page-title flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">ballot</span>
          Create Poll
        </h1>
        <p className="page-subtitle">Ask your society a question. Residents will vote till close date.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 space-y-5 shadow-sm">
        {error && <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-body-sm text-error">{error}</div>}

        <div>
          <label className="text-label-md font-medium text-on-surface">Question *</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., Should we increase maintenance by ₹500 for new gym?"
            rows={3}
            maxLength={500}
            className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="mt-1 text-label-sm text-outline">{question.length}/500</p>
        </div>

        <div>
          <label className="text-label-md font-medium text-on-surface">Options * (2-4)</label>
          <div className="mt-2 space-y-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  maxLength={200}
                  className="flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOption(idx)} className="rounded-lg border border-outline-variant px-3 py-2 text-label-md text-error hover:bg-error/10">
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 4 && (
            <button type="button" onClick={addOption} className="mt-2 inline-flex items-center gap-1 text-label-md text-primary hover:underline">
              <span className="material-symbols-outlined text-[18px]">add</span> Add Option
            </button>
          )}
        </div>

        <div>
          <label className="text-label-md font-medium text-on-surface">Poll Scope *</label>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={isPureWingAdmin} onClick={() => setScope("society")} className={`flex-1 rounded-xl border px-4 py-3 text-left ${scope==="society" ? "border-primary bg-primary/10" : "border-outline-variant bg-white"} ${isPureWingAdmin ? "opacity-50 cursor-not-allowed bg-surface-container" : ""}`}>
              <div className="text-body-sm font-semibold">Society-wide {isPureWingAdmin && "(not allowed)"}</div>
              <div className="text-label-sm text-on-surface-variant">All residents can vote</div>
            </button>
            <button type="button" onClick={() => setScope("wing")} className={`flex-1 rounded-xl border px-4 py-3 text-left ${scope==="wing" ? "border-primary bg-primary/10" : "border-outline-variant bg-white"}`}>
              <div className="text-body-sm font-semibold">Wing only</div>
              <div className="text-label-sm text-on-surface-variant">Only wing members {isPureWingAdmin ? "• Locked" : ""}</div>
            </button>
          </div>
          {scope==="wing" && (
            <div className="mt-3">
              <label className="text-label-md font-medium text-on-surface">Select Wing *</label>
              {availableWings.length===0 ? (
                <p className="mt-1 text-body-sm text-outline border rounded-lg p-3 bg-surface-container-low">No wings found — this society has no wing structure. Create apartment wings first.</p>
              ) : (
                <select value={wing} onChange={(e)=>setWing(e.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-body-md focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">Select wing</option>
                  {availableWings.map((w)=><option key={w} value={w}>Wing {w}</option>)}
                </select>
              )}
              <p className="mt-1 text-label-sm text-outline">Only residents of Wing {wing || "—"} can see and vote. {getMembershipRoles(membership).includes("wing_admin") && !getMembershipRoles(membership).includes("society_admin") ? "You can only create for your assigned wing." : ""}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-label-md font-medium text-on-surface">Type *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="open">Open - live results visible</option>
              <option value="secret">Secret - results hidden till closed</option>
            </select>
            <p className="mt-1 text-label-sm text-outline">{type === "secret" ? "Secret: votes hidden until poll closed" : "Open: everyone sees live count"}</p>
          </div>
          <div>
            <label className="text-label-md font-medium text-on-surface">Close Date *</label>
            <input
              type="datetime-local"
              value={endDate}
              min={minDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-label-sm text-outline">Auto-closes after this time. Admin can close early.</p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Link to="/polls" className="flex-1 rounded-full border border-outline-variant py-2.5 text-center text-label-md font-medium text-on-surface no-underline hover:bg-surface-container-high">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 rounded-full bg-primary py-2.5 text-label-md font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
          >
            {mutation.isPending ? "Creating..." : "Create Poll"}
          </button>
        </div>
      </form>
    </div>
  );
}
