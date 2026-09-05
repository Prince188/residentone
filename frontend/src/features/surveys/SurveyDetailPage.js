import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveMembership, selectActiveSociety } from "../../stores/society.store";
import { getSurvey, submitSurvey, updateSurvey, closeSurvey, deleteSurvey, extractApiError } from "../../lib/surveys";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

function EditSurveyModal({ survey, open, onClose, onSave, isSaving, error }) {
  const [title, setTitle] = useState(survey?.title || "");
  const [description, setDescription] = useState(survey?.description || "");
  const [endDate, setEndDate] = useState(
    survey?.endDate ? new Date(survey.endDate).toISOString().slice(0, 16) : ""
  );

  const hasResponses = (survey?.responseCount || 0) > 0;

  useEffect(() => {
    if (survey) {
      setTitle(survey.title || "");
      setDescription(survey.description || "");
      setEndDate(survey.endDate ? new Date(survey.endDate).toISOString().slice(0, 16) : "");
    }
  }, [survey, open]);

  if (!open || !survey) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      endDate: endDate ? new Date(endDate).toISOString() : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={isSaving ? undefined : onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xl sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-title-md font-bold text-on-surface">Edit Survey</h3>
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container-high cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && <p className="rounded-lg bg-error-container p-3 text-label-md text-on-error-container">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-label-sm font-semibold text-on-surface mb-1 block">Title *</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="text-label-sm font-semibold text-on-surface mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="text-label-sm font-semibold text-on-surface mb-1 block">Closing Date & Time *</label>
            <input
              type="datetime-local"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none"
            />
          </div>

          {hasResponses && (
            <p className="text-[12px] text-outline bg-surface-container-low p-2.5 rounded-lg">
              ℹ️ Questions are locked because responses have already been submitted. You can still adjust the title, description, and closing date.
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={isSaving} className="rounded-lg border border-outline-variant px-4 py-2 text-label-md text-on-surface hover:bg-surface-container-low cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim() || !endDate}
              className="rounded-lg bg-primary px-5 py-2 text-label-md font-semibold text-on-primary hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SurveyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const membership = useSocietyStore(selectActiveMembership);
  const activeSociety = useSocietyStore(selectActiveSociety);
  const [editingSurvey, setEditingSurvey] = useState(false);
  const [closingSurvey, setClosingSurvey] = useState(false);
  const [deletingSurvey, setDeletingSurvey] = useState(false);
  const [actionError, setActionError] = useState("");

  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canCreateSurvey = hasPermission(membership?.role, "create_survey", permissionsQuery.data);

  const q = useQuery({ queryKey: ["survey", id], queryFn: async () => (await getSurvey(id)).data.data, enabled: Boolean(id) });
  const survey = q.data;

  const [answers, setAnswers] = useState({});

  const submitMut = useMutation({
    mutationFn: (payload) => submitSurvey(id, payload).then((r) => r.data.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["survey", id] }); queryClient.invalidateQueries({ queryKey: ["surveys"] }); },
  });

  const updateMut = useMutation({
    mutationFn: (payload) => updateSurvey(id, payload).then((r) => r.data.data),
    onSuccess: () => {
      setEditingSurvey(false);
      setActionError("");
      queryClient.invalidateQueries({ queryKey: ["survey", id] });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
    onError: (err) => setActionError(extractApiError(err, "Failed to update survey")),
  });

  const closeMut = useMutation({
    mutationFn: () => closeSurvey(id).then((r) => r.data.data),
    onSuccess: () => {
      setClosingSurvey(false);
      queryClient.invalidateQueries({ queryKey: ["survey", id] });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteSurvey(id).then((r) => r.data.data),
    onSuccess: () => {
      setDeletingSurvey(false);
      navigate("/surveys");
    },
  });

  if (q.isLoading) return <div className="mx-auto max-w-6xl p-6 text-center">Loading...</div>;
  if (q.isError) return <div className="mx-auto max-w-6xl p-6 text-center text-error">{extractApiError(q.error,"Failed to load")}</div>;
  if (!survey) return null;

  const handleSingle = (qid, idx) => setAnswers((prev) => ({ ...prev, [qid]: { selectedOptions: [idx], textAnswer: "" } }));
  const handleMultiple = (qid, idx) => setAnswers((prev) => {
    const cur = prev[qid]?.selectedOptions || [];
    const next = cur.includes(idx) ? cur.filter((x)=>x!==idx) : [...cur, idx];
    return { ...prev, [qid]: { selectedOptions: next, textAnswer: "" } };
  });
  const handleText = (qid, val) => setAnswers((prev) => ({ ...prev, [qid]: { selectedOptions: [], textAnswer: val } }));
  const handleRating = (qid, star) => setAnswers((prev) => ({ ...prev, [qid]: { selectedOptions: [star-1], textAnswer: String(star), rating: star } }));

  const handleSubmit = () => {
    const payload = survey.questions.map((qq) => {
      const a = answers[qq.id] || { selectedOptions: [], textAnswer: "", rating: undefined };
      if (qq.type === "rating") return { questionId: qq.id, selectedOptions: a.selectedOptions || [], textAnswer: a.textAnswer || "", rating: a.rating || (a.selectedOptions?.[0] != null ? a.selectedOptions[0]+1 : undefined) };
      return { questionId: qq.id, selectedOptions: a.selectedOptions || [], textAnswer: a.textAnswer || "" };
    });
    submitMut.mutate(payload);
  };

  const canSubmit = !survey.isClosed && !survey.hasResponded;
  const showResults = survey.isClosed || survey.hasResponded;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link to="/surveys" className="inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to Surveys</Link>
      
      {actionError && <p className="rounded-lg bg-error-container p-3 text-body-sm text-on-error-container">{actionError}</p>}

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-headline-sm font-semibold text-on-surface">{survey.title}</h1>
          <span className={`rounded-full px-2.5 py-1 text-label-sm ${survey.isClosed ? "bg-outline-variant" : "bg-primary-fixed text-on-primary-fixed"}`}>{survey.isClosed ? "Closed" : "Active"}</span>
        </div>
        {survey.description && <p className="mt-2 text-body-sm text-on-surface-variant whitespace-pre-wrap">{survey.description}</p>}
        <p className="mt-3 text-label-sm text-outline">by {survey.createdByName} · {survey.questions.length} questions · {survey.responseCount} responses</p>
        {canCreateSurvey && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                setActionError("");
                setEditingSurvey(true);
              }}
              className="rounded-full border border-outline-variant px-4 py-1.5 text-label-sm font-medium text-on-surface hover:bg-surface-container-high cursor-pointer"
            >
              Edit Survey
            </button>
            {!survey.isClosed && (
              <button
                onClick={() => setClosingSurvey(true)}
                className="rounded-full border border-outline-variant px-4 py-1.5 text-label-sm font-medium text-on-surface hover:bg-surface-container-high cursor-pointer"
              >
                Close Now
              </button>
            )}
            <button
              onClick={() => setDeletingSurvey(true)}
              className="rounded-full border border-error/30 px-4 py-1.5 text-label-sm text-error hover:bg-error-container cursor-pointer"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {survey.hasResponded && <div className="rounded-lg bg-primary-fixed p-3 text-body-sm text-on-primary-fixed">Your flat has already submitted. One response per flat. Results below.</div>}
      {survey.isClosed && !survey.hasResponded && <div className="rounded-lg bg-outline-variant p-3 text-body-sm">Survey closed - no more submissions.</div>}
      {submitMut.isError && <p className="rounded-lg bg-error/10 p-3 text-body-sm text-error">{extractApiError(submitMut.error,"Failed to submit")}</p>}

      <div className="space-y-4">
        {survey.questions.map((qq, idx) => (
          <div key={qq.id} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
            <p className="font-semibold text-on-surface">Q{idx+1}. {qq.text}</p>
            <p className="text-label-sm text-outline">{qq.type === "single" ? "Pick one" : qq.type === "multiple" ? "Pick many" : qq.type === "rating" ? "Rate 1-5 stars" : "Text answer"}</p>

            {!showResults ? (
              <div className="mt-3 space-y-2">
                {qq.type === "single" && qq.options.map((opt, oIdx) => (
                  <label key={oIdx} className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer ${answers[qq.id]?.selectedOptions?.[0]===oIdx ? "border-primary bg-primary-fixed/60" : "border-outline-variant hover:bg-surface-container-low"}`}>
                    <input type="radio" name={qq.id} checked={answers[qq.id]?.selectedOptions?.[0]===oIdx} onChange={()=>handleSingle(qq.id, oIdx)} />
                    <span className="text-body-sm">{opt}</span>
                  </label>
                ))}
                {qq.type === "multiple" && qq.options.map((opt, oIdx) => (
                  <label key={oIdx} className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer ${answers[qq.id]?.selectedOptions?.includes(oIdx) ? "border-primary bg-primary-fixed/60" : "border-outline-variant hover:bg-surface-container-low"}`}>
                    <input type="checkbox" checked={answers[qq.id]?.selectedOptions?.includes(oIdx) || false} onChange={()=>handleMultiple(qq.id, oIdx)} />
                    <span className="text-body-sm">{opt}</span>
                  </label>
                ))}
                {qq.type === "rating" && (
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map((star) => (
                      <button key={star} type="button" onClick={() => handleRating(qq.id, star)} className={`flex h-12 w-12 items-center justify-center rounded-xl border text-[24px] cursor-pointer ${answers[qq.id]?.rating === star || answers[qq.id]?.selectedOptions?.[0] === star-1 ? "border-primary bg-primary-fixed text-primary" : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-high"}`}>
                        {answers[qq.id]?.rating === star || answers[qq.id]?.selectedOptions?.[0] === star-1 ? "★" : "☆"}
                      </button>
                    ))}
                  </div>
                )}
                {qq.type === "text" && <textarea value={answers[qq.id]?.textAnswer || ""} onChange={(e)=>handleText(qq.id, e.target.value)} placeholder="Your answer" maxLength={500} rows={3} className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm" />}
              </div>
            ) : (
              <div className="mt-3">
                {survey.results ? (() => {
                  const res = survey.results.questions.find((r)=>String(r.questionId)===String(qq.id));
                  if (!res) return null;
                  if (qq.type === "text") {
                    return <div className="space-y-2"><p className="text-label-sm text-outline">{res.textCount} text responses</p>{res.texts.map((t,i)=><p key={i} className="rounded-lg bg-surface-container-low px-3 py-2 text-body-sm">"{t}"</p>)} {res.textCount===0 && <p className="text-body-sm text-outline">No responses</p>}</div>;
                  } else if (qq.type === "rating") {
                    return <div className="space-y-2"><p className="text-label-md font-semibold text-primary">Average: {res.avg} ⭐ ({res.total} votes)</p>{res.options.map((opt,oIdx)=><div key={oIdx} className="relative overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"><div className="absolute inset-y-0 left-0 bg-amber-200/50" style={{ width: `${opt.percent}%` }} /><span className="relative flex justify-between gap-2"><span>{opt.text}</span><span className="font-semibold">{opt.votes} · {opt.percent}%</span></span></div>)}<p className="text-label-sm text-outline">Total {res.total} responses</p></div>;
                  } else {
                    return <div className="space-y-2">{res.options.map((opt,oIdx)=><div key={oIdx} className="relative overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"><div className="absolute inset-y-0 left-0 bg-primary/10" style={{ width: `${opt.percent}%` }} /><span className="relative flex justify-between gap-2"><span>{opt.text}</span><span className="font-semibold">{opt.votes} · {opt.percent}%</span></span></div>)}<p className="text-label-sm text-outline">Total {res.total} responses</p></div>;
                  }
                })() : <p className="text-label-sm text-outline">Results hidden</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {canSubmit && <button onClick={handleSubmit} disabled={submitMut.isPending} className="w-full rounded-full bg-primary py-3 text-label-md font-semibold text-on-primary disabled:opacity-50 cursor-pointer">{submitMut.isPending ? "Submitting..." : "Submit Survey (one per flat)"}</button>}

      <EditSurveyModal
        survey={survey}
        open={editingSurvey}
        onClose={() => {
          setEditingSurvey(false);
          setActionError("");
        }}
        onSave={(payload) => updateMut.mutate(payload)}
        isSaving={updateMut.isPending}
        error={actionError}
      />

      <ConfirmDialog
        open={closingSurvey}
        title="Close this survey now?"
        message="No more responses will be allowed once the survey is closed."
        confirmLabel="Close Survey"
        busy={closeMut.isPending}
        onConfirm={() => closeMut.mutate()}
        onClose={() => setClosingSurvey(false)}
      />

      <ConfirmDialog
        open={deletingSurvey}
        title="Delete this survey?"
        message="Are you sure you want to delete this survey? All associated responses will be removed."
        confirmLabel="Delete Survey"
        danger
        busy={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
        onClose={() => setDeletingSurvey(false)}
      />
    </div>
  );
}
