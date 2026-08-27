import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, {
  selectActiveSociety,
} from "../../stores/society.store";
import {
  getSocietyDirectory,
  extractApiError,
} from "../../lib/directory";

function MemberCard({ member }) {
  const isAdmin = member.role === "society_admin" || member.role === "super_admin";
  const initial = (member.name || "?").trim().charAt(0).toUpperCase();

  return (
    <article className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-body-md font-bold ${
          isAdmin ? "bg-primary text-on-primary" : "bg-secondary-fixed text-primary"
        }`}
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-body-sm font-semibold text-on-surface sm:text-body-md">
          <span className="truncate">{member.name}</span>
          {isAdmin && (
            <span
              className="material-symbols-outlined shrink-0 text-[15px] text-primary"
              title="Society admin"
            >
              shield_person
            </span>
          )}
        </p>
        {member.house ? (
          <span className="mt-1 inline-block rounded-full bg-secondary-fixed px-2 py-0.5 text-label-sm font-semibold text-on-secondary-fixed">
            House {member.house}
          </span>
        ) : (
          <span className="mt-1 inline-block text-label-sm text-outline">
            No house linked
          </span>
        )}
      </div>
    </article>
  );
}

export default function DirectoryPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const [search, setSearch] = useState("");

  const directoryQuery = useQuery({
    queryKey: ["directory", activeSociety?.id],
    queryFn: async () => (await getSocietyDirectory()).data.data,
    enabled: Boolean(activeSociety),
  });

  const members = directoryQuery.data || [];

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.trim().toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        String(m.house || "").toLowerCase().includes(q)
    );
  }, [members, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-stack-lg">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            to="/dashboard"
            className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Dashboard
          </Link>
          <h1 className="page-title">Society Directory</h1>
          <p className="page-subtitle">
            {directoryQuery.isLoading
              ? "Loading members..."
              : `${members.length} residents listed`}
          </p>
        </div>
        <div className="w-full max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or house no..."
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </section>

      {directoryQuery.isError && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center text-body-md text-error">
          {extractApiError(directoryQuery.error, "Failed to load directory.")}
        </div>
      )}

      {directoryQuery.isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-[76px] animate-pulse rounded-xl bg-surface-container-high"
            />
          ))}
        </div>
      )}

      {directoryQuery.isSuccess &&
        (filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-10 text-center text-body-md text-on-surface-variant">
            {members.length === 0
              ? "No members found in your society yet."
              : "No members match your search."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {filtered.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        ))}
    </div>
  );
}
