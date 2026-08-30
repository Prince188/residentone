import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import { getSurveys, extractApiError, formatEndDate } from "../../lib/surveys";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";

export default function SurveysPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const membership = useSocietyStore(selectActiveMembership);
  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canCreateSurvey = hasPermission(membership?.role, "create_survey", permissionsQuery.data);

  const q = useQuery({
    queryKey: ["surveys", activeSociety?.id],
    queryFn: async () => (await getSurveys()).data.data,
    enabled: Boolean(activeSociety),
  });

  const surveys = q.data || [];

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
      {q.isSuccess && surveys.length === 0 && (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant">assignment</span>
          <p className="mt-3 font-semibold">No surveys yet</p>
          <p className="text-body-sm text-on-surface-variant">{canCreateSurvey ? "Create the first survey." : "Admin has not created any survey."}</p>
        </div>
      )}
      <div className="space-y-3">
        {surveys.map((s) => (
          <Link key={s.id} to={`/surveys/${s.id}`} className="block rounded-xl border border-outline-variant bg-surface-container-lowest p-5 hover:border-primary/40 hover:shadow-sm no-underline">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-body-lg font-semibold text-on-surface">{s.title}</h3>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-label-sm font-semibold ${s.isClosed ? "bg-outline-variant text-on-surface-variant" : "bg-primary-fixed text-on-primary-fixed"}`}>{s.isClosed ? "Closed" : "Active"}</span>
            </div>
            {s.description && <p className="mt-1 text-body-sm text-on-surface-variant line-clamp-2">{s.description}</p>}
            <p className="mt-2 text-label-sm text-outline">{s.questionCount} questions · {formatEndDate(s.endDate)} · {s.responseCount} responses {s.hasResponded && <span className="ml-2 text-primary font-semibold">✓ Submitted (per flat)</span>}</p>
            <p className="mt-1 text-label-sm text-outline">by {s.createdByName}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
