import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import queryClient from "./lib/queryClient";
import AuthProvider from "./providers/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicLayout from "./components/PublicLayout";
import AppLayout from "./components/app/AppLayout";
import LandingPage from "./features/landing/LandingPage";
import AboutPage from "./features/landing/AboutPage";
import PricingPage from "./features/landing/PricingPage";
import ContactPage from "./features/landing/ContactPage";
import FeaturesPage from "./features/landing/FeaturesPage";
import LoginPage from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";
import CreateSocietyPage from "./features/society/CreateSocietyPage";
import SuperAdminRoute from "./components/SuperAdminRoute";
import AdminSocietiesPage from "./features/admin/AdminSocietiesPage";
import PendingApprovalsPage from "./features/admin/PendingApprovalsPage";
import AdminCreateSocietyPage from "./features/admin/AdminCreateSocietyPage";
import AdminSocietyDetailPage from "./features/admin/AdminSocietyDetailPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import MaintenancePage from "./features/maintenance/MaintenancePage";
import MaintenanceDetailPage from "./features/maintenance/MaintenanceDetailPage";
import SocietyDuesPage from "./features/maintenance/SocietyDuesPage";
import SocietyDueDetailPage from "./features/maintenance/SocietyDueDetailPage";
import ComplaintsPage from "./features/complaints/ComplaintsPage";
import VisitorsPage from "./features/visitors/VisitorsPage";
import NoticesPage from "./features/notices/NoticesPage";
import AmenitiesPage from "./features/amenities/AmenitiesPage";
import DocumentsPage from "./features/documents/DocumentsPage";
import PollsPage from "./features/polls/PollsPage";
import DirectoryPage from "./features/directory/DirectoryPage";
import ManageHousesPage from "./features/houses/ManageHousesPage";
import HouseDetailPage from "./features/houses/HouseDetailPage";
import HouseInvitePage from "./features/houses/HouseInvitePage";
import MyUnitPage from "./features/my-unit/MyUnitPage";
import EmergencyContactsPage from "./features/emergency/EmergencyContactsPage";
import ProfilePage from "./features/profile/ProfilePage";
import SettingsPage from "./features/settings/SettingsPage";
import HelpPage from "./features/help/HelpPage";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PublicLayout><LandingPage /></PublicLayout>} />
            <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
            <Route path="/pricing" element={<PublicLayout><PricingPage /></PublicLayout>} />
            <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
            <Route path="/features" element={<PublicLayout><FeaturesPage /></PublicLayout>} />
            <Route path="/login" element={<PublicLayout><LoginPage /></PublicLayout>} />
            <Route path="/register" element={<PublicLayout><RegisterPage /></PublicLayout>} />
            <Route path="/create-society" element={<PublicLayout><CreateSocietyPage /></PublicLayout>} />
            <Route path="/house-invite/:token" element={<PublicLayout><HouseInvitePage /></PublicLayout>} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/houses" element={<ManageHousesPage />} />
              <Route path="/houses/:unitId" element={<HouseDetailPage />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/maintenance/:unitId" element={<MaintenanceDetailPage />} />
              <Route path="/dues" element={<SocietyDuesPage />} />
              <Route path="/dues/:unitId" element={<SocietyDueDetailPage />} />
              <Route path="/complaints" element={<ComplaintsPage />} />
              <Route path="/visitors" element={<VisitorsPage />} />
              <Route path="/notices" element={<NoticesPage />} />
              <Route path="/amenities" element={<AmenitiesPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/polls" element={<PollsPage />} />
              <Route path="/directory" element={<DirectoryPage />} />
              <Route path="/my-unit" element={<MyUnitPage />} />
              <Route path="/emergency-contacts" element={<EmergencyContactsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route
                path="/admin/societies"
                element={<SuperAdminRoute><AdminSocietiesPage /></SuperAdminRoute>}
              />
              <Route
                path="/admin/societies/pending"
                element={<SuperAdminRoute><PendingApprovalsPage /></SuperAdminRoute>}
              />
              <Route
                path="/admin/societies/new"
                element={<SuperAdminRoute><AdminCreateSocietyPage /></SuperAdminRoute>}
              />
              <Route
                path="/admin/societies/:id"
                element={<SuperAdminRoute><AdminSocietyDetailPage /></SuperAdminRoute>}
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
