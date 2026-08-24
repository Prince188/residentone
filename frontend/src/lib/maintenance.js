const STORAGE_KEY = "residentone.maintenance";

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function getMaintenances() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveMaintenance(record) {
  const list = getMaintenances();
  const next = [
    ...list,
    { id: Date.now(), createdAt: new Date().toISOString(), ...record },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next[next.length - 1];
}

// Most recently created maintenance — drives the dashboard alert
export function getActiveMaintenance() {
  const list = getMaintenances();
  return list.length ? list[list.length - 1] : null;
}
