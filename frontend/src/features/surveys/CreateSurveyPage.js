import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveMembership, selectActiveSociety } from "../../stores/society.store";
import { createSurvey, extractApiError } from "../../lib/surveys";
import { getHouseCards } from "../../lib/houses";
import api from "../../lib/api";
import { hasPermissionForMembership, getMembershipRoles } from "../../lib/permissions";

export default function CreateSurveyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const membership = useSocietyStore(selectActiveMembership);
  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canCreateSurvey = hasPermissionForMembership(membership, "create_survey", permissionsQuery.data);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [endDate, setEndDate] = useState(() => { const d = new Date(); d.setDate(d.getDate()+7); d.setHours(23,59,0,0); return d.toISOString().slice(0,16); });
  const [questions, setQuestions] = useState([{ text: "", type: "single", options: ["", ""] }]);
  const [scope, setScope] = useState("society");
  const [wing, setWing] = useState("");
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
    mutationFn: (payload) => createSurvey(payload).then((r) => r.data.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["surveys"] }); navigate("/surveys"); },
    onError: (e) => setError(extractApiError(e, "Failed to create survey")),
  });

  if (!canCreateSurvey) return <div className="mx-auto max-w-2xl py-12 text-center"><p className="text-error">You don’t have permission to create surveys.</p><p className="text-body-sm text-on-surface-variant">Ask your Society Admin for <strong>Create Survey</strong> permission.</p><Link to="/surveys" className="mt-4 inline-block text-primary hover:underline">Back to Surveys</Link></div>;

  const updateQ = (idx, patch) => setQuestions((prev) => prev.map((q,i) => i===idx ? { ...q, ...patch } : q));
  const addQuestion = () => { if (questions.length < 10) setQuestions([...questions, { text: "", type: "single", options: ["",""] }]); };
  const removeQuestion = (idx) => { if (questions.length > 1) setQuestions(questions.filter((_,i)=>i!==idx)); };
  const addOption = (qIdx) => { const q = questions[qIdx]; if (q.options.length < 4) updateQ(qIdx, { options: [...q.options, ""] }); };
  const removeOption = (qIdx, oIdx) => { const q = questions[qIdx]; if (q.options.length > 2) updateQ(qIdx, { options: q.options.filter((_,i)=>i!==oIdx) }); };
  const updateOption = (qIdx, oIdx, val) => { const q = questions[qIdx]; const opts = [...q.options]; opts[oIdx]=val; updateQ(qIdx,{ options: opts }); };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || title.trim().length < 5) return setError("Title must be at least 5 characters");
    if (new Date(endDate) <= new Date()) return setError("End date must be in future");
    if (scope === "wing" && !wing) return setError("Select a wing for wing survey");
    for (let i=0;i<questions.length;i++) {
      const q = questions[i];
      if (!q.text.trim() || q.text.trim().length < 5) return setError(`Question ${i+1} must be at least 5 characters`);
      if (q.type !== "text" && q.type !== "rating" && q.options.filter((o)=>o.trim()).length < 2) return setError(`Question ${i+1} needs at least 2 options`);
    }
    const payload = {
      title: title.trim(),
      description: description.trim(),
      endDate: new Date(endDate).toISOString(),
      questions: questions.map((q) => ({
        text: q.text.trim(),
        type: q.type,
        options: q.type === "text" || q.type === "rating" ? [] : q.options.map((o)=>o.trim()).filter(Boolean),
      })),
      scope,
      wing: scope === "wing" ? wing : null,
    };
    mutation.mutate(payload);
  };

  const minDate = new Date().toISOString().slice(0,16);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/surveys" className="inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to Surveys</Link>
      <div>
        <h1 className="page-title flex items-center gap-2"><span className="material-symbols-outlined text-primary">assignment</span> Create Survey</h1>
        <p className="page-subtitle">Multiple questions - single, multiple, text or rating 1-5 stars. One response per flat.</p>
      </div>
      <form onSubmit={handleSubmit} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 space-y-6 shadow-sm">
        {error && <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-body-sm text-error">{error}</div>}
        <div>
          <label className="text-label-md font-medium">Title *</label>
          <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="e.g., Diwali Feedback" maxLength={150} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2.5 text-body-md focus:border-primary focus:outline-none" />
        </div>
        <div>
          <label className="text-label-md font-medium">Description</label>
          <textarea value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Optional details" rows={2} maxLength={500} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2.5 text-body-md focus:border-primary focus:outline-none" />
        </div>
        <div>
          <label className="text-label-md font-medium">Close Date *</label>
          <input type="datetime-local" value={endDate} min={minDate} onChange={(e)=>setEndDate(e.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2.5 text-body-md focus:border-primary focus:outline-none" />
        </div>
        <div>
          <label className="text-label-md font-medium">Scope *</label>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={isPureWingAdmin} onClick={() => setScope("society")} className={`flex-1 rounded-xl border px-4 py-3 text-left ${scope==="society" ? "border-primary bg-primary/10" : "border-outline-variant bg-white"} ${isPureWingAdmin ? "opacity-50 cursor-not-allowed bg-surface-container" : ""}`}>
              <div className="text-body-sm font-semibold">Society-wide {isPureWingAdmin && "(not allowed)"}</div>
              <div className="text-label-sm text-on-surface-variant">All residents</div>
            </button>
            <button type="button" onClick={() => setScope("wing")} className={`flex-1 rounded-xl border px-4 py-3 text-left ${scope==="wing" ? "border-primary bg-primary/10" : "border-outline-variant bg-white"}`}>
              <div className="text-body-sm font-semibold">Wing only {isPureWingAdmin ? "• Locked" : ""}</div>
              <div className="text-label-sm text-on-surface-variant">Only wing members</div>
            </button>
          </div>
          {scope==="wing" && (
            <div className="mt-3">
              <label className="text-label-md font-medium">Select Wing *</label>
              {availableWings.length===0 ? (
                <p className="mt-1 text-body-sm text-outline border rounded-lg p-3 bg-surface-container-low">No wings found.</p>
              ) : (
                <select value={wing} onChange={(e)=>setWing(e.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-body-md">
                  <option value="">Select wing</option>
                  {availableWings.map((w)=><option key={w} value={w}>Wing {w}</option>)}
                </select>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-title-sm font-semibold">Questions ({questions.length}/10)</h3>
            {questions.length < 10 && <button type="button" onClick={addQuestion} className="inline-flex items-center gap-1 rounded-full border border-primary px-3 py-1 text-label-sm text-primary hover:bg-primary-fixed">Add Question <span className="material-symbols-outlined text-[16px]">add</span></button>}
          </div>
          {questions.map((q, qIdx) => (
            <div key={qIdx} className="rounded-xl border border-outline-variant bg-surface-container-low p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-label-md font-semibold">Q{qIdx+1}</p>
                {questions.length > 1 && <button type="button" onClick={()=>removeQuestion(qIdx)} className="text-label-sm text-error hover:underline">Remove</button>}
              </div>
              <input value={q.text} onChange={(e)=>updateQ(qIdx,{ text: e.target.value })} placeholder="Question text" maxLength={300} className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm focus:border-primary focus:outline-none" />
              <select value={q.type} onChange={(e)=>updateQ(qIdx,{ type: e.target.value, options: e.target.value==="text" || e.target.value==="rating" ? [] : ["",""] })} className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm">
                <option value="single">Single choice (pick one)</option>
                <option value="multiple">Multiple choice (pick many)</option>
                <option value="text">Text answer</option>
                <option value="rating">Rating (1-5 stars)</option>
              </select>
              {q.type === "rating" && <p className="text-label-sm text-outline">Residents will rate 1-5 stars ⭐</p>}
              {q.type !== "text" && q.type !== "rating" && (
                <div className="space-y-2">
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex gap-2">
                      <input value={opt} onChange={(e)=>updateOption(qIdx,oIdx,e.target.value)} placeholder={`Option ${oIdx+1}`} maxLength={100} className="flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm" />
                      {q.options.length > 2 && <button type="button" onClick={()=>removeOption(qIdx,oIdx)} className="text-error">✕</button>}
                    </div>
                  ))}
                  {q.options.length < 4 && <button type="button" onClick={()=>addOption(qIdx)} className="text-label-sm text-primary">+ Add Option</button>}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Link to="/surveys" className="flex-1 rounded-full border border-outline-variant py-2.5 text-center text-label-md">Cancel</Link>
          <button type="submit" disabled={mutation.isPending} className="flex-1 rounded-full bg-primary py-2.5 text-label-md font-semibold text-on-primary disabled:opacity-50">{mutation.isPending ? "Creating..." : "Create Survey"}</button>
        </div>
      </form>
    </div>
  );
}
