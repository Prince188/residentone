import api from "./api";

export function extractApiError(error, fallback = "Operation failed") {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export function parseQrPayload(raw) {
  if (!raw) return { token: null, rid: null, sid: null, raw: "" };
  const str = String(raw).trim();

  // 1. Direct query param URL: e.g. https://residentone.app/verify-receipt?t=eyJhbG...
  if (str.includes("?")) {
    try {
      const url = new URL(str, "https://residentone.app");
      const t = url.searchParams.get("t") || url.searchParams.get("token");
      const rid = url.searchParams.get("rid");
      const sid = url.searchParams.get("sid");
      if (t) return { token: t, rid, sid, raw: str };
    } catch {}
  }

  // 2. Pure JWT format: xxx.yyy.zzz
  if (str.split(".").length === 3) {
    return { token: str, rid: null, sid: null, raw: str };
  }

  // 3. Raw receipt number or plain text token
  return { token: str, rid: str, sid: null, raw: str };
}

export async function verifyReceiptToken(token, societyId = null) {
  if (!token) throw new Error("Missing receipt token or number");
  const headers = {};
  if (societyId) headers["x-society-id"] = societyId;

  const res = await api.get("/receipts/verify", {
    params: { t: token },
    headers,
  });
  return res.data?.data ?? res.data;
}

export function formatAmount(val) {
  return `₹${Number(val || 0).toLocaleString("en-IN")}`;
}

export function formatDate(val) {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}
