import React, { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import CustomerRoute from "./routes/CustomerRoute";
import Navbar from "./components/common/Navbar";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AppointmentsProvider } from "./context/AppointmentsContext";

const Home = lazy(() => import("./pages/auth/Home"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const Dashboard = lazy(() => import("./pages/customer/Dashboard"));
const Onboarding = lazy(() => import("./pages/customer/Onboarding"));
const RoleProfile = lazy(() => import("./pages/shared/RoleProfile"));
const BookAppointment = lazy(() => import("./pages/customer/BookAppointment"));
const History = lazy(() => import("./pages/customer/History"));
const Layout = lazy(() => import("./pages/admin/Layout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AppointmentsPage = lazy(() => import("./pages/admin/AppointmentsPage"));
const StaffPage = lazy(() => import("./pages/admin/StaffPage"));
const ServicesPage = lazy(() => import("./pages/admin/ServicesPage"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const ReviewManagement = lazy(() => import("./pages/admin/ReviewManagement"));
const AdminGallery = lazy(() => import("./pages/admin/AdminGallery"));
const AdminMessages = lazy(() => import("./components/admin/AdminMessages"));
const StaffDashboard = lazy(() => import("./pages/staff/StaffDashboard"));
const RosterShifts = lazy(() => import("./pages/staff/RosterShifts"));
const StaffEarnings = lazy(() => import("./pages/staff/StaffEarnings"));

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#07090d] px-4 text-white">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#d4af37]/20 border-t-[#d4af37]" />
        <p className="font-brand text-lg text-[#d4af37]">SalonDEES</p>
        <p className="text-xs uppercase tracking-[0.28em] text-white/45">Preparing your space</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <>
      <ToastContainer position="top-right" autoClose={3000}  />
      <AppointmentsProvider>
        <BrowserRouter>
          <Navbar />

          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              {/* First, show the home page */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route
                path="/onboarding"
                element={
                  <CustomerRoute>
                    <Onboarding />
                  </CustomerRoute>
                }
              />

              <Route
                element={
                  <CustomerRoute>
                    <Layout />
                  </CustomerRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/customer/dashboard" element={<Dashboard />} />
                <Route path="/book" element={<BookAppointment />} />
                <Route path="/booking" element={<BookAppointment />} />
                <Route path="/customer/book" element={<BookAppointment />} />
                <Route path="/history" element={<History />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute allowedRoles={["customer", "staff", "admin"]}>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/profile" element={<RoleProfile />} />
              </Route>

              {/* Admin routes */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Layout />
                  </ProtectedRoute>
                } 
              >
                <Route index element={<AdminDashboard />} />
                <Route path="appointments" element={<AppointmentsPage />} />
                {/* <Route path="clients" element={<ClientsPage />} /> */}
                <Route path="staff" element={<StaffPage />} />
                <Route path="services" element={<ServicesPage />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="reviews" element={<ReviewManagement />} />
                <Route path="gallery" element={<AdminGallery />} />
                <Route path="messages" element={<AdminMessages />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              <Route 
                path="/staff" 
                element={
                  <ProtectedRoute allowedRoles={["staff"]}>
                    <Layout />
                  </ProtectedRoute>
                } 
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<StaffDashboard />} />
                <Route path="appointments" element={<AppointmentsPage />} />
                <Route path="roster-shifts" element={<RosterShifts />} />
                <Route path="earnings" element={<StaffEarnings />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>

        </BrowserRouter>
      </AppointmentsProvider>
    </>
  );
}

export default App;
