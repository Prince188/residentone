import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import Sidebar from "./Sidebar";
import Header from "./Header";
import SEO from "../SEO";
import { showNotificationToast } from "../notifications/NotificationToastContainer";
import { getAccessToken, getSocketUrl } from "../../lib/api";
import useSocietyStore from "../../stores/society.store";

export default function AppLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const queryClient = useQueryClient();
  const activeSocietyId = useSocietyStore((state) => state.activeSocietyId);

  const toggleCollapse = () => setIsCollapsed((prev) => !prev);
  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const socketUrl = getSocketUrl();

    const socket = io(socketUrl, {
      auth: { token, societyId: activeSocietyId },
      transports: ["websocket"],
    });

    socket.on("unit:change", (data) => {
      queryClient.invalidateQueries({ queryKey: ["house-cards"] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ["house-detail", data.id] });
      }
    });

    socket.on("notice:change", () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
    });

    socket.on("complaint:change", (data) => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      queryClient.invalidateQueries({ queryKey: ["complaint-stats"] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ["complaint-detail", data.id] });
      }
    });

    socket.on("familymember:change", () => {
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
    });

    socket.on("maintenancecycle:change", () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-cycle-units"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-unit-detail"] });
    });

    socket.on("maintenancepayment:change", () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-cycle-units"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-unit-detail"] });
    });

    socket.on("membership:change", () => {
      queryClient.invalidateQueries({ queryKey: ["directory"] });
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
    });

    socket.on("booking:change", () => {
      queryClient.invalidateQueries({ queryKey: ["amenities"] });
      queryClient.invalidateQueries({ queryKey: ["amenity-slots"] });
      queryClient.invalidateQueries({ queryKey: ["amenity-my-bookings"] });
    });

    socket.on("amenity:change", () => {
      queryClient.invalidateQueries({ queryKey: ["amenities"] });
      queryClient.invalidateQueries({ queryKey: ["amenity-slots"] });
    });

    socket.on("poll:change", () => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    });

    socket.on("survey:change", () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      queryClient.invalidateQueries({ queryKey: ["survey"] });
    });

    socket.on("chat:change", () => {
      queryClient.invalidateQueries({ queryKey: ["chat-groups"] });
      queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
    });

    socket.on("chat:direct", () => {
      queryClient.invalidateQueries({ queryKey: ["chat-direct-list"] });
      queryClient.invalidateQueries({ queryKey: ["chat-direct-messages"] });
    });

    socket.on("collection:change", (data) => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ["collection", String(data.id)] });
        queryClient.invalidateQueries({ queryKey: ["collection-units", String(data.id)] });
      }
    });

    socket.on("society:change", (data) => {
      queryClient.invalidateQueries({ queryKey: ["societies"] });
      queryClient.invalidateQueries({ queryKey: ["society"] });
      queryClient.invalidateQueries({ queryKey: ["society-stats"] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ["society", String(data.id)] });
      }
      if (data?.society?._id) {
        queryClient.invalidateQueries({ queryKey: ["society", String(data.society._id)] });
      }
      // For society members: reload my-societies so suspend/activate/approve/reject reflects without refresh
      const action = data?.action || data?.society?.status;
      const societyId = String(data?.id || data?.society?._id || "");
      const isMembershipChangingAction = [
        "suspend",
        "suspended",
        "activate",
        "active",
        "approve",
        "reject",
        "rejected",
        "create",
      ].includes(action);
      if (isMembershipChangingAction) {
        const store = useSocietyStore.getState();
        // Approve/activate can make a previously hidden (pending/suspended) society appear;
        // suspend/reject can make an active society disappear. Always reload to reflect.
        // We do it for any such action, but optimistically check if user is affected.
        const shouldReload =
          societyId === String(store.activeSocietyId || "") ||
          store.societies.some((s) => String(s.society.id) === societyId) ||
          ["approve", "activate", "active", "create"].includes(action);
        if (shouldReload || societyId) {
          store.loadMySocieties().catch(() => {});
        }
        // Also invalidate society-scoped queries so UI updates immediately
        queryClient.invalidateQueries({ queryKey: ["notices"] });
        queryClient.invalidateQueries({ queryKey: ["memberships"] });
        queryClient.invalidateQueries({ queryKey: ["directory"] });
        queryClient.invalidateQueries({ queryKey: ["my-societies"] });
      }
    });

    socket.on("societies:change", () => {
      queryClient.invalidateQueries({ queryKey: ["societies"] });
      queryClient.invalidateQueries({ queryKey: ["society"] });
      queryClient.invalidateQueries({ queryKey: ["society-stats"] });
      // Fallback: reload societies for members
      useSocietyStore.getState().loadMySocieties().catch(() => {});
    });

    socket.on("permissions:change", () => {
      queryClient.invalidateQueries({ queryKey: ["society-permissions"] });
    });

    socket.on("notification:new", (data) => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-dropdown"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
      if (data) {
        showNotificationToast(data);
      }
    });

    socket.on("notification:broadcast", (data) => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-dropdown"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
      if (data) {
        showNotificationToast(data);
      }
    });

    socket.on("visitor:approval_request", (data) => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
      if (data) {
        showNotificationToast({
          title: `🚪 Gate Alert: ${data.name} at Gate`,
          message: `${data.name} (${data.visitorType?.toUpperCase()}${data.company ? ` · ${data.company}` : ""}) is requesting entry to House ${data.unitId?.label || ""}.`,
          link: "/visitors",
        });
      }
    });

    socket.on("visitor:checked_in", (data) => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
      if (data) {
        showNotificationToast({
          title: `✅ Visitor Entered Gate: ${data.name}`,
          message: `${data.name} has passed security and is heading to House ${data.unitId?.label || ""}.`,
          link: "/visitors",
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient, activeSocietyId]);

  return (
    <div className="min-h-screen bg-surface">
      <SEO title="Resident Portal" noindex={true} />
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
        isDrawerOpen={isDrawerOpen}
        onDrawerClose={closeDrawer}
      />
      <div
        className={`flex min-h-screen flex-col transition-[margin] duration-300 ease-in-out ${
          isCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        <Header onMenuClick={openDrawer} />
        <main className="flex-1 px-margin-mobile py-stack-md md:px-margin-desktop md:py-stack-lg">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
