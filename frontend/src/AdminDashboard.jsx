import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify'; // For better notifications
import ServiceManager from './components/ServiceManager';
import StaffManager from './components/StaffManager';

function AdminDashboard() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);

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

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 mb-8 flex flex-col sm:flex-row items-center justify-between border-l-4 border-yellow-500 dark:border-yellow-400 transition-colors duration-300">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              Admin <span className="text-yellow-600">Dashboard</span> 
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Overview and management of all system appointments.</p>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden transition-colors duration-300">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">All Appointments</h3>
          </div>

          {appointments.length === 0 ? (
            <div className="p-10 text-center text-gray-500 dark:text-gray-400">
              There are no appointments to display at the moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer Info</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Update Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  {appointments.map((appt) => (
                    <tr key={appt._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                      
                      {/* Customer Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {appt.user ? appt.user.name : 'Unknown User'}
                        </div>
                      </td>

                      {/* Service */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700 dark:text-gray-300">{appt.service}</div>
                      </td>

                      {/* Date & Time */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">{new Date(appt.date).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{appt.time}</div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full 
                          ${appt.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                            appt.status === 'Approved' ? 'bg-blue-100 text-blue-800' : 
                            appt.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                            'bg-red-100 text-red-800'}`}
                        >
                          {appt.status}
                        </span>
                      </td>

                      {/* Action Dropdown */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <select 
                          value={appt.status} 
                          onChange={(e) => handleStatusChange(appt._id, e.target.value)}
                          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border shadow-sm"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="Completed">Completed</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Service Management Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg mt-8 transition-colors duration-300">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Manage Services</h3>
          </div>
          <ServiceManager />
        </div>
        
        {/* Staff Management Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg mt-8 transition-colors duration-300">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Manage Staff</h3>
          </div>
          <StaffManager />
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;

