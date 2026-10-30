import api from "./api";

export const SOS_TYPES = [
  {
    type: "medical",
    label: "Medical Emergency",
    icon: "medical_services",
    color: "text-rose-700",
    bg: "bg-rose-50 border-rose-200",
    desc: "Ambulance, health collapse, injury",
  },
  {
    type: "fire",
    label: "Fire & Gas Leak",
    icon: "local_fire_department",
    color: "text-orange-700",
    bg: "bg-orange-50 border-orange-200",
    desc: "Fire outbreak, smoke, or gas leak",
  },
  {
    type: "lift",
    label: "Lift Entrapment",
    icon: "elevator",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    desc: "Trapped inside elevator / power blackout",
  },
  {
    type: "security",
    label: "Intruder / Threat",
    icon: "shield_with_heart",
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
    desc: "Suspicious person, fight, or safety threat",
  },
  {
    type: "general",
    label: "General Emergency",
    icon: "warning",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    desc: "Immediate on-duty guard desk assistance",
  },
];

const unwrap = (res) => (res && res.data && "data" in res.data ? res.data.data : res?.data);

export const triggerSOS = async ({
  emergencyType = "general",
  locationDescription = "",
  unitId = null,
}) => {
  const res = await api.post("/sos/trigger", {
    emergencyType,
    locationDescription,
    unitId,
  });
  return unwrap(res);
};

export const getMyActiveSOS = async () => {
  const res = await api.get("/sos/my-active");
  const d = unwrap(res);
  return d && (d._id || d.id) ? d : null;
};

export const getActiveSOSList = async () => {
  const res = await api.get("/sos/active");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const acknowledgeSOS = async (id) => {
  const res = await api.post(`/sos/${id}/acknowledge`);
  return unwrap(res);
};

export const resolveSOS = async (
  id,
  { resolutionNote = "", isFalseAlarm = false } = {}
) => {
  const res = await api.post(`/sos/${id}/resolve`, {
    resolutionNote,
    isFalseAlarm,
  });
  return unwrap(res);
};

export const getSOSHistory = async (params = {}) => {
  const res = await api.get("/sos/history", { params });
  return unwrap(res);
};
