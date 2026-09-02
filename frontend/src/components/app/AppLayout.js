import { useState, useEffect, useCallback, useRef } from "react";
import { Outlet } from "react-router-dom";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import Sidebar from "./Sidebar";
import Header from "./Header";
import SEO from "../SEO";
import { showNotificationToast } from "../notifications/NotificationToastContainer";
import { getAccessToken, getSocketUrl } from "../../lib/api";
import useSocietyStore from "../../stores/society.store";
import useAuthStore from "../../stores/auth.store";
import { respondVisitorApproval } from "../../lib/visitors";
import sound from "../../lib/sound";
import toast from "../../lib/toast";
import GateCallModal from "../visitors/GateCallModal";

export default function AppLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [incomingVisitorCall, setIncomingVisitorCall] = useState(null);
  const [isRespondingCall, setIsRespondingCall] = useState(false);

  const currentUser = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const activeSocietyId = useSocietyStore((state) => state.activeSocietyId);
  const activeMembership = useSocietyStore((state) => state.activeMembership);

  const userRef = useRef(currentUser);
  const membershipRef = useRef(activeMembership);
  const incomingCallRef = useRef(incomingVisitorCall);

  useEffect(() => {
    userRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    membershipRef.current = activeMembership;
  }, [activeMembership]);

  useEffect(() => {
    incomingCallRef.current = incomingVisitorCall;
  }, [incomingVisitorCall]);

  const toggleCollapse = () => setIsCollapsed((prev) => !prev);
  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  // Request browser desktop push permission once on initial user session
  useEffect(() => {
    sound.requestDesktopPermission().catch(() => {});
  }, []);

  const handleApproveCall = useCallback(async (visitorId) => {
    setIsRespondingCall(true);
    try {
      await respondVisitorApproval(visitorId, "approved");
      toast.success("Entry Approved", "Security gate informed.");
      setIncomingVisitorCall(null);
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
    } catch (err) {
      toast.error("Failed to approve entry");
    } finally {
      setIsRespondingCall(false);
    }
  }, [queryClient]);

  const handleLeaveAtGateCall = useCallback(async (visitorId) => {
    setIsRespondingCall(true);
    try {
      await respondVisitorApproval(visitorId, "leave_at_gate");
      toast.success("Marked: Leave at Gate", "Security guard will hold parcel.");
      setIncomingVisitorCall(null);
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setIsRespondingCall(false);
    }
  }, [queryClient]);

  const handleDenyCall = useCallback(async (visitorId) => {
    setIsRespondingCall(true);
    try {
      await respondVisitorApproval(visitorId, "rejected");
      toast.error("Entry Denied", "Security gate informed.");
      setIncomingVisitorCall(null);
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
    } catch (err) {
      toast.error("Failed to deny entry");
    } finally {
      setIsRespondingCall(false);
    }
  }, [queryClient]);

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
      useSocietyStore.getState().loadMySocieties().catch(() => {});
    });

    socket.on("society:member_joined", (data) => {
      if (data?.societyId) {
        queryClient.invalidateQueries({ queryKey: ["society-members", data.societyId] });
        queryClient.invalidateQueries({ queryKey: ["society-stats", data.societyId] });
      }
    });

    socket.on("society:role_assigned", (data) => {
      if (data?.societyId) {
        queryClient.invalidateQueries({ queryKey: ["society-members", data.societyId] });
        queryClient.invalidateQueries({ queryKey: ["society-permissions", data.societyId] });
      }
    });

    socket.on("society:role_removed", (data) => {
      if (data?.societyId) {
        queryClient.invalidateQueries({ queryKey: ["society-members", data.societyId] });
        queryClient.invalidateQueries({ queryKey: ["society-permissions", data.societyId] });
      }
    });

    socket.on("user:membership_updated", (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-memberships"] });
      queryClient.invalidateQueries({ queryKey: ["society-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["society-members"] });
      queryClient.invalidateQueries({ queryKey: ["house-cards"] });
      const store = useSocietyStore.getState();
      const societyId = data?.societyId ? String(data.societyId) : "";
      const action = data?.action || "";
      const shouldReload =
        societyId === String(store.activeSocietyId || "") ||
        store.societies.some((s) => String(s.society.id) === societyId) ||
        ["approve", "activate", "active", "create"].includes(action);
      if (shouldReload || societyId) {
        store.loadMySocieties().catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
      queryClient.invalidateQueries({ queryKey: ["directory"] });
      queryClient.invalidateQueries({ queryKey: ["my-societies"] });
    });

    socket.on("societies:change", () => {
      queryClient.invalidateQueries({ queryKey: ["societies"] });
      queryClient.invalidateQueries({ queryKey: ["society"] });
      queryClient.invalidateQueries({ queryKey: ["society-stats"] });
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
        sound.playNotification();
        showNotificationToast(data);
      }
    });

    socket.on("notification:broadcast", (data) => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-dropdown"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
      if (data) {
        sound.playNotification();
        showNotificationToast(data);
      }
    });

    socket.on("visitor:approval_request", (data) => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
      if (data) {
        const user = userRef.current;
        const membership = membershipRef.current;
        const currentUserId = String(user?._id || user?.id || "");
        const hostId = String(data.hostUserId?._id || data.hostUserId?.id || data.hostUserId || "");
        const isHost = hostId && hostId === currentUserId;
        const myUnitIds = (membership?.units || []).map((u) => String(u._id || u.id || u));
        const targetUnitId = String(data.unitId?._id || data.unitId?.id || data.unitId || "");
        const isMyUnit = targetUnitId && myUnitIds.includes(targetUnitId);
        const isGuard = membership?.role === "security_guard";

        // ONLY trigger ringing intercom and modal for the target house residents (never guards or other flats)
        if ((isHost || isMyUnit) && !isGuard) {
          setIncomingVisitorCall(data);
          sound.showDesktopNotification(
            `🚪 Gate Alert: ${data.name}`,
            `${data.name} is requesting entry to House ${data.unitId?.label || ""}`,
            { tag: `gate-call-${data._id || data.id}` },
            () => setIncomingVisitorCall(data)
          );
          showNotificationToast({
            title: `🚪 Gate Alert: ${data.name} at Gate`,
            message: `${data.name} (${data.visitorType?.toUpperCase()}${data.company ? ` · ${data.company}` : ""}) is requesting entry to House ${data.unitId?.label || ""}.`,
            link: "/visitors",
            type: "visitor",
            visitorId: data._id || data.id,
            visitor: data,
          });
        }
      }
    });

    socket.on("visitor:approval_response", (data) => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
      const currentCall = incomingCallRef.current;
      if (currentCall && (currentCall._id === data?._id || currentCall.id === data?.id)) {
        sound.stopIntercomRing();
        setIncomingVisitorCall(null);
      }
    });

    socket.on("visitor:checked_in", (data) => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
      if (data) {
        sound.playSuccess();
        showNotificationToast({
          title: `✅ Visitor Entered Gate: ${data.name}`,
          message: `${data.name} has passed security and is heading to House ${data.unitId?.label || ""}.`,
          link: "/visitors",
        });
      }
    });

    return () => {
      sound.stopIntercomRing();
      socket.disconnect();
    };
  }, [queryClient, activeSocietyId]);

  return (
    <div className="min-h-screen bg-surface">
      <SEO title="Resident Portal" noindex={true} />
      
      {/* Real-Time Audible Gate Intercom Modal */}
      {incomingVisitorCall && (
        <GateCallModal
          visitor={incomingVisitorCall}
          onApprove={handleApproveCall}
          onLeaveAtGate={handleLeaveAtGateCall}
          onDeny={handleDenyCall}
          onClose={() => {
            sound.stopIntercomRing();
            setIncomingVisitorCall(null);
          }}
          isResponding={isRespondingCall}
        />
      )}

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
