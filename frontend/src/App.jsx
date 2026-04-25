import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login'; 
import Dashboard from './Dashboard';
import ProtectedRoute from './ProtectedRoute';
import CustomerRoute from './CustomerRoute';
import Profile from './pages/Profile';
import BookAppointment from './BookAppointment';
import AdminDashboard from './AdminDashboard';
import StaffDashboard from './StaffDashboard';
import Register from './pages/Register';
import Navbar from './Navbar';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdminMessages from './components/AdminMessages';
import Layout from './pages/admin/Layout';
import AppointmentsPage from './pages/admin/AppointmentsPage';
import ClientsPage from './pages/admin/ClientsPage';
import StaffPage from './pages/admin/StaffPage';
import ServicesPage from './pages/admin/ServicesPage';

function App() {
  return (
    <>
      <ToastContainer position="top-right" autoClose={3000}  />
      <BrowserRouter>
        <Navbar />

        <Routes>
          {/* First, show the home page */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* After logging in, show the dashboard */}
          <Route 
            path="/dashboard" 
            element={
              <CustomerRoute>
                <Dashboard />
              </CustomerRoute>
            } 
          />

          <Route 
            path="/profile" 
            element={
              <CustomerRoute>
                <Profile />
              </CustomerRoute>
            } 
          />
            {/* Route for booking appointments, also protected */}  
          <Route 
            path="/book" 
            element={
              <CustomerRoute>
                <BookAppointment />
              </CustomerRoute>
            } 
          />
          <Route 
            path="/booking" 
            element={
              <CustomerRoute>
                <BookAppointment />
              </CustomerRoute>
            } 
          />

          {/* Admin routes */}  
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout />
              </ProtectedRoute>
            } 
          >
            <Route index element={<AdminDashboard />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="services" element={<ServicesPage />} />
          </Route>
          <Route 
            path="/staff/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <StaffDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/staff/appointments" 
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <AppointmentsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/messages" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminMessages />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
