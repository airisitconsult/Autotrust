import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { AdvisorWidget } from "./components/AdvisorWidget";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdvisorChatProvider } from "./context/AdvisorChatContext";
import { AuthProvider } from "./context/AuthContext";
import { AdvisorPage } from "./pages/AdvisorPage";
import { DashboardOverviewPage } from "./pages/DashboardOverviewPage";
import { InspectorDashboardPage } from "./pages/InspectorDashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { MyListingsPage } from "./pages/MyListingsPage";
import { RegisterPage } from "./pages/RegisterPage";
import { VehicleDetailPage } from "./pages/VehicleDetailPage";
import { TeamPage } from "./pages/TeamPage";
import { UsersPage } from "./pages/UsersPage";
import { VehicleFormPage } from "./pages/VehicleFormPage";
import { canInspect, hasPermission, isSuperAdmin } from "./lib/access";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
});

function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold text-slate-900">404</h1>
      <p className="mt-2 text-slate-500">That page doesn't exist.</p>
    </div>
  );
}

// Storefront pages (marketplace, vehicle detail, auth) share the public
// top navbar + footer. Dashboard pages (below) render their own sidebar
// layout via <DashboardLayout> instead, so they're routed outside this.
function PublicLayout() {
  return (
    <AdvisorChatProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <AdvisorWidget />
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-400">
          AutoTrust &mdash; AI-powered vehicle certification marketplace
        </footer>
      </div>
    </AdvisorChatProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<MarketplacePage />} />
              <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
              <Route path="/advisor" element={<AdvisorPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/create-listing"
                element={
                  <ProtectedRoute>
                    <VehicleFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/edit-listing/:id"
                element={
                  <ProtectedRoute>
                    <VehicleFormPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardOverviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-listings"
              element={
                <ProtectedRoute>
                  <MyListingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspector"
              element={
                <ProtectedRoute
                  allow={canInspect}
                  restrictedMessage="The inspection queue is for inspectors and admins with the manage inspections permission."
                >
                  <InspectorDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute
                  allow={(u) => hasPermission(u, "manage_users")}
                  restrictedMessage="You need the manage users permission to view this page."
                >
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/team"
              element={
                <ProtectedRoute
                  allow={isSuperAdmin}
                  restrictedMessage="Only the super admin can manage the admin team."
                >
                  <TeamPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<PublicLayout />}>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
