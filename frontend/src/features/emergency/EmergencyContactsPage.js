import { Link } from "react-router-dom";

export default function EmergencyContactsPage() {
  const emergencyServices = [
    { name: "National Emergency Helpline", number: "112", icon: "emergency", color: "bg-red-500 text-white" },
    { name: "Police", number: "100", icon: "local_police", color: "bg-blue-600 text-white" },
    { name: "Ambulance", number: "102 / 108", icon: "ambulance", color: "bg-emerald-600 text-white" },
    { name: "Fire Department", number: "101", icon: "fire_truck", color: "bg-orange-600 text-white" },
    { name: "Women Helpline", number: "1091", icon: "shield", color: "bg-purple-600 text-white" },
    { name: "Disaster Management", number: "1077", icon: "warning", color: "bg-amber-600 text-white" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Dashboard
      </Link>

      <section>
        <h1 className="page-title">Emergency Contacts</h1>
        <p className="page-subtitle">
          Essential emergency contacts, helpline numbers, and local society medical assistance.
        </p>
      </section>

      {/* Society Doctors & Professionals Callout */}
      <section className="rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 via-rose-50/70 to-surface-container-lowest p-5 sm:p-6 shadow-sm dark:border-rose-900/60 dark:from-rose-950/40 dark:via-surface-container-lowest">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm">
              <span className="material-symbols-outlined text-[26px]">medical_services</span>
            </span>
            <div>
              <h2 className="text-title-sm font-semibold text-on-surface">
                Need Medical Help in Society?
              </h2>
              <p className="mt-1 text-body-sm text-on-surface-variant max-w-xl">
                Find resident doctors, nurses, healthcare specialists, or electricians living right in your society who can provide immediate assistance during an emergency.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
            <Link
              to="/directory?search=doctor"
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2.5 text-label-md font-semibold text-white shadow-sm transition hover:bg-rose-700"
            >
              <span className="material-symbols-outlined text-[18px]">stethoscope</span>
              Find Society Doctors
            </Link>
            <Link
              to="/directory?search=electrician"
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-label-md font-semibold text-on-surface transition hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              Find Electricians
            </Link>
          </div>
        </div>
      </section>

      {/* General Emergency Numbers */}
      <section className="space-y-3">
        <h2 className="text-title-sm font-semibold text-on-surface">
          Public Emergency Numbers
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {emergencyServices.map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${service.color}`}>
                  <span className="material-symbols-outlined text-[20px]">{service.icon}</span>
                </span>
                <div>
                  <p className="text-body-sm font-semibold text-on-surface">{service.name}</p>
                  <p className="text-title-sm font-bold text-primary">{service.number}</p>
                </div>
              </div>
              <a
                href={`tel:${service.number.split(" ")[0]}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-high text-primary hover:bg-primary hover:text-on-primary transition"
                title={`Call ${service.name}`}
              >
                <span className="material-symbols-outlined text-[18px]">call</span>
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
