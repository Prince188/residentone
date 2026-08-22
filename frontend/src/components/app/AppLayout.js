import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleCollapse = () => setIsCollapsed((prev) => !prev);
  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

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
