import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { markSeen, markSeenBulk, PATH_TO_FEATURE } from "../lib/dashboard";

/**
 * Call this hook inside a page to mark its badge as seen on mount.
 * After visiting the page, the dashboard badge disappears.
 * @param {string|string[]} featureOrPath - feature key(s) or route path(s) like "/notices"
 */
export default function useBadgeSeen(featureOrPath) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!featureOrPath) return;
    const rawList = Array.isArray(featureOrPath) ? featureOrPath : [featureOrPath];
    // Normalize via PATH_TO_FEATURE if looks like path
    const features = rawList
      .map((v) => {
        if (!v) return null;
        const key = String(v).trim();
        if (PATH_TO_FEATURE[key]) return PATH_TO_FEATURE[key];
        return key;
      })
      .filter(Boolean);

    if (features.length === 0) return;

    const doMark = async () => {
      try {
        if (features.length === 1) await markSeen(features[0]);
        else await markSeenBulk(features);
        // Invalidate dashboard badges so badge gone on next dashboard visit
        queryClient.invalidateQueries({ queryKey: ["dashboard-badges"] });
      } catch (_) {
        // silent - badge clear is best effort
      }
    };
    doMark();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(featureOrPath)]);
}
