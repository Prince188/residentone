import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { getAccessToken } from "../../lib/api";
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

    const socketUrl = window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : window.location.origin;

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

    return () => {
      socket.disconnect();
    };
  }, [queryClient, activeSocietyId]);

  return (
    <div className="min-h-screen bg-surface">
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
