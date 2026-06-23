import React, { useMemo } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/auth/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/customer/Dashboard";
import Onboarding from "./pages/customer/Onboarding";
import RoleProfile from "./pages/shared/RoleProfile";
import BookAppointment from "./pages/customer/BookAppointment";
import History from "./pages/customer/History";
import AdminDashboard from "./pages/admin/AdminDashboard";
import StaffDashboard from "./pages/staff/StaffDashboard";
import RosterShifts from "./pages/staff/RosterShifts";
import StaffEarnings from "./pages/staff/StaffEarnings";
import ProtectedRoute from "./routes/ProtectedRoute";
import CustomerRoute from "./routes/CustomerRoute";
import Navbar from "./components/common/Navbar";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminMessages from "./components/admin/AdminMessages";
import Layout from "./pages/admin/Layout";
import AppointmentsPage from "./pages/admin/AppointmentsPage";
import ClientsPage from "./pages/admin/ClientsPage";
import StaffPage from "./pages/admin/StaffPage";
import ServicesPage from "./pages/admin/ServicesPage";
import SettingsPage from "./pages/admin/SettingsPage";
import Analytics from "./pages/admin/Analytics";
import ReviewManagement from "./pages/admin/ReviewManagement";
import { AppointmentsProvider } from "./context/AppointmentsContext";

function App() {
  const userProfile = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("userProfile")) || null;
    } catch {
      return null;
    }
  }, []);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000}  />
      <AppointmentsProvider>
        <BrowserRouter>
          <Navbar />

          <Routes>
            {/* First, show the home page */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
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
              <Route path="/book" element={<BookAppointment userProfile={userProfile} />} />
              <Route path="/booking" element={<BookAppointment userProfile={userProfile} />} />
              <Route path="/customer/book" element={<BookAppointment userProfile={userProfile} />} />
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
              <Route path="clients" element={<ClientsPage />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="reviews" element={<ReviewManagement />} />
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
            <Route 
              path="/admin/messages" 
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminMessages />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

        </BrowserRouter>
      </AppointmentsProvider>
    </>
  );
}

export default App;
