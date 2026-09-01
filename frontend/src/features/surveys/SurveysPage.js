import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import { getSurveys, extractApiError, formatEndDate } from "../../lib/surveys";
import api from "../../lib/api";
import { hasPermissionForMembership } from "../../lib/permissions";
import useBadgeSeen from "../../hooks/useBadgeSeen";

export default function SurveysPage() {
  useBadgeSeen("surveys");
  const activeSociety = useSocietyStore(selectActiveSociety);
  const membership = useSocietyStore(selectActiveMembership);
  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canCreateSurvey = hasPermissionForMembership(membership, "create_survey", permissionsQuery.data);
  const [scopeFilter, setScopeFilter] = useState("all");

  const q = useQuery({
    queryKey: ["surveys", activeSociety?.id],
    queryFn: async () => (await getSurveys()).data.data,
    enabled: Boolean(activeSociety),
  });

  const surveysAll = q.data || [];
  const surveys = surveysAll.filter((s) => {
    if (scopeFilter === "society") return !s.wing && (s.scope === "society" || !s.scope);
    if (scopeFilter === "wing") return s.scope === "wing" && !!s.wing;
    return true;
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="flex items-end justify-between gap-3">
        <div>
          <Link to="/dashboard" className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined text-[16px]">arrow_back</span> Dashboard</Link>
          <h1 className="page-title flex items-center gap-2"><span className="material-symbols-outlined text-primary">assignment</span> Surveys</h1>
          <p className="page-subtitle">{activeSociety ? `${activeSociety.name} · ` : ""}{canCreateSurvey ? "Create surveys for feedback." : "Answer society surveys (one per flat)."}</p>
        </div>
        {canCreateSurvey && <Link to="/surveys/new" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-label-md text-on-primary hover:opacity-90"><span className="material-symbols-outlined text-[18px]">add</span> Create Survey</Link>}
      </section>

      {q.isLoading && <div className="space-y-3">{Array.from({length:3}).map((_,i)=><div key={i} className="h-28 animate-pulse rounded-xl bg-surface-container-high" />)}</div>}
      {q.isError && <p className="rounded-xl bg-error/10 p-4 text-body-sm text-error">{extractApiError(q.error,"Failed to load surveys")}</p>}
      {q.isSuccess && surveysAll.length > 0 && (
        <div className="flex gap-2">
          <button onClick={() => setScopeFilter("all")} className={`rounded-full px-3 py-1 text-label-sm font-semibold border ${scopeFilter==="all" ? "bg-primary text-on-primary border-primary" : "bg-white border-outline-variant"}`}>All ({surveysAll.length})</button>
          <button onClick={() => setScopeFilter("society")} className={`rounded-full px-3 py-1 text-label-sm font-semibold border ${scopeFilter==="society" ? "bg-primary text-on-primary border-primary" : "bg-white border-outline-variant"}`}>Society ({surveysAll.filter((s)=>!s.wing && (s.scope==="society"||!s.scope)).length})</button>
          <button onClick={() => setScopeFilter("wing")} className={`rounded-full px-3 py-1 text-label-sm font-semibold border ${scopeFilter==="wing" ? "bg-amber-500 text-white border-amber-500" : "bg-white border-outline-variant"}`}>Wing ({surveysAll.filter((s)=>s.scope==="wing").length})</button>
        </div>
      )}
      {q.isSuccess && surveys.length === 0 && (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant">assignment</span>
          <p className="mt-3 font-semibold">No surveys yet</p>
          <p className="text-body-sm text-on-surface-variant">{scopeFilter==="wing" ? "No wing surveys for your wing." : canCreateSurvey ? "Create the first survey." : "Admin has not created any survey."}</p>
        </div>
      )}
      <div className="space-y-3">
        {surveys.map((s) => (
          <Link key={s.id} to={`/surveys/${s.id}`} className="block rounded-xl border border-outline-variant bg-surface-container-lowest p-5 hover:border-primary/40 hover:shadow-sm no-underline">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-body-lg font-semibold text-on-surface">{s.title}</h3>
              <div className="flex items-center gap-2">
                {s.scope==="wing" && s.wing ? <span className="shrink-0 rounded-full bg-amber-100 text-amber-800 px-2.5 py-1 text-label-sm font-bold">Wing {s.wing}</span> : <span className="shrink-0 rounded-full bg-sky-100 text-sky-800 px-2.5 py-1 text-label-sm font-bold">Society</span>}
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-label-sm font-semibold ${s.isClosed ? "bg-outline-variant text-on-surface-variant" : "bg-primary-fixed text-on-primary-fixed"}`}>{s.isClosed ? "Closed" : "Active"}</span>
              </div>
            </div>
            {s.description && <p className="mt-1 text-body-sm text-on-surface-variant line-clamp-2">{s.description}</p>}
            <p className="mt-2 text-label-sm text-outline">{s.scope==="wing" && s.wing ? `Wing ${s.wing} • ` : ""}{s.questionCount} questions · {formatEndDate(s.endDate)} · {s.responseCount} responses {s.hasResponded && <span className="ml-2 text-primary font-semibold">✓ Submitted (per flat)</span>}</p>
            <p className="mt-1 text-label-sm text-outline">by {s.createdByName}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
