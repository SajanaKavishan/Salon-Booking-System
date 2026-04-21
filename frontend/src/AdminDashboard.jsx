import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import ServiceManager from './components/ServiceManager';
import StaffManager from './components/StaffManager';

function AdminDashboard() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState('Pending');
  const [dateFilter, setDateFilter] = useState('All');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    const fetchAllAppointments = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/appointments/all', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAppointments(response.data);
      } catch (error) {
        console.error("Error fetching all appointments:", error);
      }
    };

    fetchAllAppointments();
  }, [navigate]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.put(`http://localhost:5000/api/appointments/${id}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAppointments(appointments.map(appt => 
        appt._id === id ? { ...appt, status: newStatus } : appt
      ));

      toast.success(`Status changed to "${newStatus}" successfully!`);

    } catch (error) {
      console.error("Status Update Error:", error);
      toast.error("Oops! Failed to update the appointment status.");
    }
  };

  const filteredAppointments = appointments.filter((appt) => {
    const appointmentDate = new Date(appt.date);
    const now = new Date();

    const statusMatches = activeTab === 'All' ? true : appt.status === activeTab;

    let dateMatches = true;

    if (dateFilter === 'Today') {
      dateMatches =
        appointmentDate.getFullYear() === now.getFullYear() &&
        appointmentDate.getMonth() === now.getMonth() &&
        appointmentDate.getDate() === now.getDate();
    } else if (dateFilter === 'This Week') {
      const startOfWeek = new Date(now);
      const dayOfWeek = startOfWeek.getDay();
      startOfWeek.setHours(0, 0, 0, 0);
      startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      dateMatches = appointmentDate >= startOfWeek && appointmentDate <= endOfWeek;
    } else if (dateFilter === 'This Month') {
      dateMatches =
        appointmentDate.getFullYear() === now.getFullYear() &&
        appointmentDate.getMonth() === now.getMonth();
    }

    return statusMatches && dateMatches;
  });

  return (
    /* Main Container with Background Image */
    <div className="min-h-screen relative flex flex-col py-10 px-4 sm:px-6 lg:px-8 font-sans text-white selection:bg-[#d4af37] selection:text-black bg-[url('/registerBg.jpg')] bg-cover bg-center bg-no-repeat fixed bg-fixed">
      
      {/* Dark Overlay (80% Black) */}
      <div className="absolute inset-0 bg-black/80 z-0"></div>

      {/* Content Wrapper */}
      <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="bg-[#111111]/70 backdrop-blur-md rounded-xl shadow-2xl p-8 flex flex-col sm:flex-row items-center justify-between border border-white/10 border-l-4 border-l-[#d4af37]">
          <div>
            <h2 className="text-3xl font-serif text-white mb-2">
              Admin <span className="text-[#d4af37]">Dashboard</span> 
            </h2>
            <p className="text-lg text-gray-400 font-light">Overview and management of all system appointments and settings.</p>
          </div>
          
          {/* View Messages Button */}
          <div className="mt-4 sm:mt-0">
            <button 
              onClick={() => navigate('/admin/messages')}
              className="bg-[#d4af37] text-black px-6 py-2.5 rounded font-semibold hover:bg-[#b5952f] transition-colors duration-300 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
            >
              View Messages
            </button>
          </div>
        </div>

        {/* Appointments Table Section */}
        <div className="bg-[#111111]/70 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h3 className="text-2xl font-serif text-[#d4af37]">All Appointments</h3>
          </div>

          <div className="flex flex-col gap-4 p-4 border-b border-white/10 bg-[#0a0a0a]/50 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {['Pending', 'Approved', 'Completed', 'Rejected', 'All'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={activeTab === tab
                    ? 'bg-[#d4af37] text-black font-semibold shadow-[0_0_10px_rgba(212,175,55,0.3)] px-4 py-2 rounded-full text-sm transition-all duration-300'
                    : 'text-gray-400 hover:text-white hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full text-sm transition-all duration-300'}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full sm:w-48 pl-3 pr-8 py-2 text-sm border border-white/20 focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] rounded-md bg-[#0a0a0a]/80 text-gray-200 shadow-sm transition hover:border-white/40 cursor-pointer"
              >
                <option value="All" className="bg-[#111111] text-white">All Dates</option>
                <option value="Today" className="bg-[#111111] text-white">Today</option>
                <option value="This Week" className="bg-[#111111] text-white">This Week</option>
                <option value="This Month" className="bg-[#111111] text-white">This Month</option>
              </select>
            </div>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="p-10 text-center text-gray-300 font-light bg-[#0a0a0a]/30">
              There are no appointments to display at the moment.
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-[#d4af37]/50 [&::-webkit-scrollbar-thumb]:rounded-full">
              <div className="overflow-x-auto">
              <table className="min-w-full text-left border-collapse">
                <thead className="bg-[#0a0a0a]/80">
                  <tr>
                    <th className="px-6 py-4 text-xs font-medium text-[#d4af37] uppercase tracking-[0.15em] border-b border-white/10">Customer Info</th>
                    <th className="px-6 py-4 text-xs font-medium text-[#d4af37] uppercase tracking-[0.15em] border-b border-white/10">Service</th>
                    <th className="px-6 py-4 text-xs font-medium text-[#d4af37] uppercase tracking-[0.15em] border-b border-white/10">Date & Time</th>
                    <th className="px-6 py-4 text-xs font-medium text-[#d4af37] uppercase tracking-[0.15em] border-b border-white/10">Current Status</th>
                    <th className="px-6 py-4 text-xs font-medium text-[#d4af37] uppercase tracking-[0.15em] border-b border-white/10">Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAppointments.map((appt) => {
                    const customerPhone = appt.user?.phone || appt.user?.phoneNumber;

                    return (
                    <tr key={appt._id} className="hover:bg-white/5 transition-colors duration-200 group">
                      
                      {/* Customer Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-200 group-hover:text-white transition">
                          {appt.user ? appt.user.name : 'Unknown User'}
                        </div>
                        {customerPhone ? (
                          <a
                            href={`tel:${customerPhone}`}
                            className="mt-1 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-[#d4af37] transition-colors"
                          >
                            <span aria-hidden="true">☎</span>
                            {customerPhone}
                          </a>
                        ) : (
                          <span className="mt-1 block text-gray-500 text-xs">No phone provided</span>
                        )}
                      </td>

                      {/* Service */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300 font-light">
                          {appt.services && appt.services.length > 0
                            ? appt.services.map((service) => service.name || service).join(', ')
                            : appt.service || 'N/A'}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-200 mb-1">{new Date(appt.date).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-400 font-light">
                          {appt.startTime ? `${appt.startTime}${appt.endTime ? ` - ${appt.endTime}` : ''}` : appt.time}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border uppercase tracking-wider
                          ${appt.status === 'Pending' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700/50' : 
                            appt.status === 'Approved' ? 'bg-blue-900/30 text-blue-400 border-blue-700/50' : 
                            appt.status === 'Completed' ? 'bg-green-900/30 text-green-400 border-green-700/50' : 
                            'bg-red-900/30 text-red-400 border-red-700/50'}`}
                        >
                          {appt.status}
                        </span>
                      </td>

                      {/* Action Dropdown */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <select 
                          value={appt.status} 
                          onChange={(e) => handleStatusChange(appt._id, e.target.value)}
                          className="block w-full pl-3 pr-8 py-2 text-sm border border-white/20 focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] rounded-md bg-[#0a0a0a]/80 text-gray-200 shadow-sm transition hover:border-white/40 cursor-pointer"
                        >
                          <option value="Pending" className="bg-[#111111] text-white">Pending</option>
                          <option value="Approved" className="bg-[#111111] text-white">Approved</option>
                          <option value="Completed" className="bg-[#111111] text-white">Completed</option>
                          <option value="Rejected" className="bg-[#111111] text-white">Rejected</option>
                        </select>
                      </td>

                    </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>

        {/* Components are already styled with Glass Effect in their own files */}
        <ServiceManager />
        <StaffManager />
        
      </div>
    </div>
  );
}

export default AdminDashboard;