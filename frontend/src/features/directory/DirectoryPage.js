/* eslint-disable */
import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, {
  selectActiveSociety,
} from "../../stores/society.store";
import {
  getSocietyDirectory,
  extractApiError,
} from "../../lib/directory";

function MemberDetailModal({ member, onClose }) {
  if (!member) return null;

  const isAdmin = member.role === "society_admin" || member.role === "super_admin";
  const initial = (member.name || "?").trim().charAt(0).toUpperCase();
  const houses = member.houses && member.houses.length > 0 ? member.houses : (member.house ? [member.house] : []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant/60 pb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <span
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-title-lg font-bold ${
                isAdmin
                  ? "bg-primary text-on-primary"
                  : member.isStaff
                  ? "bg-amber-100 text-amber-900 border border-amber-200"
                  : member.isFamily
                  ? "bg-purple-100 text-purple-900 border border-purple-200"
                  : "bg-secondary-fixed text-primary"
              }`}
            >
              {initial}
            </span>
            <div className="min-w-0">
              <h3 className="text-title-md font-bold text-on-surface truncate flex items-center gap-1.5">
                <span>{member.name}</span>
                {isAdmin && (
                  <span
                    className="material-symbols-outlined text-[18px] text-primary"
                    title="Society Administrator"
                  >
                    shield_person
                  </span>
                )}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="inline-flex items-center rounded-full bg-surface-container-high px-2.5 py-0.5 text-label-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  {member.role?.replace(/_/g, " ")}
                </span>
                {member.isStaff && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-label-xs font-bold text-amber-700">
                    <span className="material-symbols-outlined text-[12px]">badge</span>
                    Staff
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="space-y-4">
          {/* Occupation / Profession */}
          {member.occupation && (
            <div className="rounded-2xl border border-outline-variant/70 bg-surface-container-low p-3.5 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[20px]">
                  {member.isStaff ? "badge" : "work"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-label-xs font-medium text-on-surface-variant uppercase tracking-wider">
                  Profession / Occupation
                </p>
                <p className="text-body-md font-bold text-on-surface truncate">
                  {member.occupation}
                </p>
              </div>
            </div>
          )}

          {/* Contact Phone */}
          {member.phoneMasked && (
            <div className="rounded-2xl border border-outline-variant/70 bg-surface-container-low p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[20px]">call</span>
                </div>
                <div className="min-w-0">
                  <p className="text-label-xs font-medium text-on-surface-variant uppercase tracking-wider">
                    Contact Number
                  </p>
                  <p className="text-body-md font-semibold text-on-surface">
                    {member.phoneMasked}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Staff Specific Details */}
          {member.isStaff && (
            <div className="rounded-2xl border border-outline-variant/70 bg-surface-container-low p-4 space-y-3">
              <p className="text-label-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">badge</span>
                Staff & Duty Details
              </p>
              <div className="grid grid-cols-2 gap-3 text-body-sm">
                {member.department && (
                  <div>
                    <span className="text-label-xs text-outline block">Department</span>
                    <span className="font-semibold text-on-surface">{member.department}</span>
                  </div>
                )}
                {member.gate && (
                  <div>
                    <span className="text-label-xs text-outline block">Assigned Gate / Post</span>
                    <span className="font-semibold text-on-surface">{member.gate}</span>
                  </div>
                )}
                {member.shift && (
                  <div className="col-span-2">
                    <span className="text-label-xs text-outline block">Shift Schedule</span>
                    <span className="font-semibold text-on-surface">{member.shift}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Family Member Info */}
          {member.isFamily && (
            <div className="rounded-2xl border border-outline-variant/70 bg-surface-container-low p-4 space-y-2">
              <p className="text-label-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">diversity_3</span>
                Household Family Member
              </p>
              <div className="flex items-center gap-2 text-body-sm">
                <span className="text-outline">Relation:</span>
                <span className="font-semibold capitalize text-on-surface">{member.relation || "Family"}</span>
                {member.addedByName && (
                  <span className="text-outline text-label-xs">
                    (Added by {member.addedByName})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Houses Section */}
          {!member.isStaff && (
            <div className="rounded-2xl border border-outline-variant/70 bg-surface-container-low p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-label-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">home</span>
                  {houses.length > 1 ? `Linked Houses (${houses.length})` : "House / Flat"}
                </p>
              </div>

              {houses.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {houses.map((h, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-body-sm font-bold text-primary shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">apartment</span>
                      House {h}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-body-sm text-outline italic">No house linked to this member.</p>
              )}
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl bg-surface-container-high px-5 py-2 text-label-md font-semibold text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberCard({ member, onClick }) {
  const isAdmin = member.role === "society_admin" || member.role === "super_admin";
  const initial = (member.name || "?").trim().charAt(0).toUpperCase();
  const houses = member.houses && member.houses.length > 0 ? member.houses : (member.house ? [member.house] : []);
  const hasMultipleHouses = houses.length > 1;

  return (
    <article
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer group"
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-body-md font-bold transition-transform group-hover:scale-105 ${
          isAdmin
            ? "bg-primary text-on-primary"
            : member.isStaff
            ? "bg-amber-100 text-amber-900 border border-amber-200"
            : member.isFamily
            ? "bg-purple-100 text-purple-900 border border-purple-200"
            : "bg-secondary-fixed text-primary"
        }`}
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-body-sm font-semibold text-on-surface sm:text-body-md">
          <span className="truncate group-hover:text-primary transition-colors">{member.name}</span>
          {isAdmin && (
            <span
              className="material-symbols-outlined shrink-0 text-[15px] text-primary"
              title="Society admin"
            >
              shield_person
            </span>
          )}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {member.isStaff ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-label-sm font-semibold text-amber-800">
              <span className="material-symbols-outlined text-[13px]">badge</span>
              {member.gate || member.department || "Staff"}
            </span>
          ) : hasMultipleHouses ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-secondary-fixed px-2 py-0.5 text-label-sm font-semibold text-on-secondary-fixed"
              title={houses.join(", ")}
            >
              House {houses[0]} (+{houses.length - 1})
            </span>
          ) : member.house ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary-fixed px-2 py-0.5 text-label-sm font-semibold text-on-secondary-fixed">
              House {member.house}
            </span>
          ) : (
            <span className="inline-block text-label-sm text-outline">
              No house linked
            </span>
          )}

          {member.occupation && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2 py-0.5 text-label-sm font-medium text-on-surface-variant truncate max-w-full"
              title={member.occupation}
            >
              <span className="material-symbols-outlined text-[13px] text-primary">
                {member.isStaff ? "badge" : "work"}
              </span>
              <span className="truncate">{member.occupation}</span>
            </span>
          )}
        </div>
        {member.phoneMasked && (
          <p className="mt-1 flex items-center gap-1 truncate text-label-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]">call</span>
            {member.phoneMasked}
          </p>
        )}
      </div>
    </article>
  );
}

export default function DirectoryPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch =
    searchParams.get("search") ||
    searchParams.get("occupation") ||
    searchParams.get("q") ||
    "";
  const [search, setSearch] = useState(initialSearch);
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    const urlQuery =
      searchParams.get("search") ||
      searchParams.get("occupation") ||
      searchParams.get("q") ||
      "";
    if (urlQuery !== search) setSearch(urlQuery);
  }, [searchParams]);

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
        (m.name || "").toLowerCase().includes(q) ||
        String(m.house || "").toLowerCase().includes(q) ||
        (Array.isArray(m.houses) && m.houses.some((h) => String(h).toLowerCase().includes(q))) ||
        (m.occupation || "").toLowerCase().includes(q) ||
        (m.role || "").toLowerCase().includes(q) ||
        (m.department || "").toLowerCase().includes(q) ||
        (m.gate || "").toLowerCase().includes(q)
    );
  }, [members, search]);

  const handleSearchChange = (val) => {
    setSearch(val);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val.trim()) {
        next.set("search", val);
      } else {
        next.delete("search");
        next.delete("occupation");
        next.delete("q");
      }
      return next;
    });
  };

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
              : `${members.length} members & staff listed`}
          </p>
        </div>
        <div className="w-full max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search name, house, occupation, staff..."
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
              <MemberCard
                key={member.id}
                member={member}
                onClick={() => setSelectedMember(member)}
              />
            ))}
          </div>
        ))}

      {/* Member / Staff Detail Overlay Modal */}
      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
}
