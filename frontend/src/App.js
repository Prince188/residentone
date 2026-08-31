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
import PayMaintenancePage from "./features/maintenance/PayMaintenancePage";
import SocietyDuesPage from "./features/maintenance/SocietyDuesPage";
import SocietyDueDetailPage from "./features/maintenance/SocietyDueDetailPage";
import MaintenanceHistoryPage from "./features/maintenance/MaintenanceHistoryPage";
import MaintenanceCycleDetailPage from "./features/maintenance/MaintenanceCycleDetailPage";
import ComplaintsPage from "./features/complaints/ComplaintsPage";
import CreateComplaintPage from "./features/complaints/CreateComplaintPage";
import ComplaintDetailPage from "./features/complaints/ComplaintDetailPage";
import VisitorsPage from "./features/visitors/VisitorsPage";
import NoticesPage from "./features/notices/NoticesPage";
import CreateNoticePage from "./features/notices/CreateNoticePage";
import AmenitiesPage from "./features/amenities/AmenitiesPage";
import ManageAmenitiesPage from "./features/amenities/ManageAmenitiesPage";
import AmenityHistoryPage from "./features/amenities/AmenityHistoryPage";
import ManageCommitteePage from "./features/committee/ManageCommitteePage";
import FamilyMembersPage from "./features/family-members/FamilyMembersPage";
import DocumentsPage from "./features/documents/DocumentsPage";
import PollsPage from "./features/polls/PollsPage";
import CreatePollPage from "./features/polls/CreatePollPage";
import DirectoryPage from "./features/directory/DirectoryPage";
import ChatPage from "./features/chat/ChatPage";
import SurveysPage from "./features/surveys/SurveysPage";
import CreateSurveyPage from "./features/surveys/CreateSurveyPage";
import SurveyDetailPage from "./features/surveys/SurveyDetailPage";
import ManageHousesPage from "./features/houses/ManageHousesPage";
import HouseDetailPage from "./features/houses/HouseDetailPage";
import HouseInvitePage from "./features/houses/HouseInvitePage";
import MyUnitPage from "./features/my-unit/MyUnitPage";
import VehiclesPage from "./features/vehicles/VehiclesPage";
import EmergencyContactsPage from "./features/emergency/EmergencyContactsPage";
import ProfilePage from "./features/profile/ProfilePage";
import SettingsPage from "./features/settings/SettingsPage";
import HelpPage from "./features/help/HelpPage";
import CollectionsPage from "./features/collections/CollectionsPage";
import CreateCollectionPage from "./features/collections/CreateCollectionPage";
import CollectionDetailPage from "./features/collections/CollectionDetailPage";
import CollectionUnitPayPage from "./features/collections/CollectionUnitPayPage";
import ManageCollectionsPage from "./features/collections/ManageCollectionsPage";
import CollectionsHistoryPage from "./features/collections/CollectionsHistoryPage";
import PayCollectionsPage from "./features/collections/PayCollectionsPage";
import ManageSocietyPage from "./features/society/ManageSocietyPage";
import CreateSocietyModal from "./features/society/CreateSocietyModal";

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
            <Route
              path="/create-society"
              element={
                <ProtectedRoute>
                  <PublicLayout>
                    <CreateSocietyPage />
                  </PublicLayout>
                </ProtectedRoute>
              }
            />
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
              <Route path="/maintenance/:unitId/pay" element={<PayMaintenancePage />} />
              <Route path="/dues" element={<SocietyDuesPage />} />
              <Route path="/dues/history" element={<MaintenanceHistoryPage />} />
              <Route path="/dues/cycles/:cycleId" element={<MaintenanceCycleDetailPage />} />
              <Route path="/dues/:unitId" element={<SocietyDueDetailPage />} />
              <Route path="/complaints" element={<ComplaintsPage />} />
              <Route path="/complaints/new" element={<CreateComplaintPage />} />
              <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
              <Route path="/visitors" element={<VisitorsPage />} />
              <Route path="/notices" element={<NoticesPage />} />
              <Route path="/notices/new" element={<CreateNoticePage />} />
              <Route path="/amenities" element={<AmenitiesPage />} />
              <Route path="/amenities/manage" element={<ManageAmenitiesPage />} />
              <Route path="/amenities/history" element={<AmenityHistoryPage />} />
              <Route path="/committee" element={<ManageCommitteePage />} />
              <Route path="/family-members" element={<FamilyMembersPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/polls" element={<PollsPage />} />
              <Route path="/polls/new" element={<CreatePollPage />} />
              <Route path="/directory" element={<DirectoryPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/surveys" element={<SurveysPage />} />
              <Route path="/surveys/new" element={<CreateSurveyPage />} />
              <Route path="/surveys/:id" element={<SurveyDetailPage />} />
              <Route path="/collections" element={<CollectionsPage />} />
              <Route path="/collections/manage" element={<ManageCollectionsPage />} />
              <Route path="/collections/history" element={<CollectionsHistoryPage />} />
              <Route path="/collections/pay" element={<PayCollectionsPage />} />
              <Route path="/society/manage" element={<ManageSocietyPage />} />
              <Route path="/collections/new" element={<CreateCollectionPage />} />
              <Route path="/collections/:id" element={<CollectionDetailPage />} />
              <Route path="/collections/:id/units/:unitId" element={<CollectionUnitPayPage />} />
              <Route path="/vehicles" element={<VehiclesPage />} />
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
          <CreateSocietyModal />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
