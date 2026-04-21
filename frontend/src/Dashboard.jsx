import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify'; // For better notifications

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState('Upcoming');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (storedUser && token) {
      const fetchAppointments = async () => {
        try {
          setUser(JSON.parse(storedUser));
          const response = await axios.get('http://localhost:5000/api/appointments', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          setAppointments(response.data);
        } catch (error) {
          console.error("Error fetching appointments:", error);
        }
      };
      fetchAppointments();
    }
  }, []);

  const handleCancel = async (id) => {
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/appointments/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAppointments(appointments.filter((appt) => appt._id !== id));
        toast.success("Appointment cancelled successfully!");
      } catch (error) {
        console.error("Delete Error:", error);
        toast.error("Oops! Failed to cancel the appointment.");
      }
    }
  };

  // Helper function to convert time string (e.g., "09:30 AM") to total minutes
  const timeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(' ');
    if (parts.length < 2) return 0;
    const [time, modifier] = parts;
    const timeParts = time.split(':');
    if (timeParts.length < 2) return 0;
    let [hours, minutes] = timeParts.map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    if (hours === 12) hours = 0;
    if (modifier === 'PM') hours += 12;
    return hours * 60 + minutes;
  };

  // Robust cancellation check: appointment must be at least 2 hours away
  const isCancellable = (apptDate, apptStartTime, appointment) => {
    try {
      // Handle undefined inputs - use fallback to old 'time' field if available
      const timeStr = apptStartTime || (appointment && appointment.time);
      
      if (!apptDate || !timeStr) {
        // If we can't parse the time, assume it's not cancellable
        return false;
      }

      // Parse date: YYYY-MM-DD format
      const dateParts = apptDate.split('-');
      if (dateParts.length < 3) return false;
      
      const [year, month, day] = dateParts.map(Number);
      if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
      
      // Parse time: e.g., "09:30 AM" to minutes, then to hours and minutes
      const timeMins = timeToMinutes(timeStr);
      const hours = Math.floor(timeMins / 60);
      const minutes = timeMins % 60;

      // Create appointment Date object (local time)
      const appointmentDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
      const currentDateTime = new Date();

      // Calculate difference in milliseconds, then convert to hours
      const differenceInMs = appointmentDateTime.getTime() - currentDateTime.getTime();
      const differenceInHours = differenceInMs / (1000 * 60 * 60);

      // Return true only if appointment is at least 2 hours away
      return differenceInHours >= 2;
    } catch (error) {
      console.error('Error checking if appointment is cancellable:', error);
      return false;
    }
  };

  const filteredAppointments = appointments.filter((appt) => {
    if (activeTab === 'Upcoming') {
      return appt.status === 'Pending' || appt.status === 'Approved';
    }
    return appt.status === 'Completed' || appt.status === 'Rejected';
  });

  return (
    /* Main Container with Background Image */
    <div className="min-h-screen relative flex flex-col py-10 px-4 sm:px-6 lg:px-8 font-sans text-white selection:bg-[#d4af37] selection:text-black bg-[url('/loginBg.jpg')] bg-cover bg-center bg-no-repeat fixed bg-fixed">
      
      {/* Dark Overlay (80% Black) */}
      <div className="absolute inset-0 bg-black/80 z-0"></div>

      {/* Content Wrapper */}
      <div className="relative z-10 w-full max-w-4xl mx-auto">
        
        {/* Welcome Header Card */}
        <div className="bg-[#111111]/70 backdrop-blur-md rounded-xl shadow-2xl p-8 mb-8 flex flex-col sm:flex-row items-center justify-between border border-white/10 border-l-4 border-l-[#d4af37]">
          <div>
            <h2 className="text-3xl font-serif text-white">
              Welcome back, <span className="text-[#d4af37]">{user ? user.name || user.email : 'Guest'}</span>! 
            </h2>
            <p className="mt-2 text-sm text-gray-400 font-light">Manage your salon appointments with ease.</p>
          </div>
          
          <div className="mt-6 sm:mt-0 flex gap-4">
            <button 
              onClick={() => navigate('/book')} 
              className="bg-[#d4af37] hover:bg-yellow-400 text-black font-semibold py-2 px-6 rounded-md shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] transition duration-300 transform hover:-translate-y-1"
            >
              + Book New
            </button>
          </div>
        </div>

        {/* Appointments Section */}
        <div className="bg-[#111111]/70 backdrop-blur-md rounded-xl shadow-2xl p-8 border border-white/10">
          <h3 className="text-2xl font-serif text-[#d4af37] mb-6 border-b pb-4 border-white/10">
            My Appointments
          </h3>

          <div className="flex space-x-4 mb-6 border-b border-white/10 pb-2">
            {['Upcoming', 'History'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={activeTab === tab
                  ? 'text-[#d4af37] font-semibold border-b-2 border-[#d4af37] pb-2 px-2 transition-all duration-300'
                  : 'text-gray-400 hover:text-white pb-2 px-2 transition-all duration-300 cursor-pointer'}
              >
                {tab}
              </button>
            ))}
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-400 text-lg font-light">
                {activeTab === 'Upcoming' ? 'You have no upcoming appointments.' : 'Your appointment history is empty.'}
              </p>
              <button 
                onClick={() => navigate('/book')}
                className="mt-4 text-[#d4af37] font-semibold hover:text-yellow-400 hover:underline transition"
              >
                Book your first appointment now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredAppointments.map((appt) => {
                const canCancel = isCancellable(appt.date, appt.startTime, appt);
                
                // Get service names from the services array
                const serviceNames = appt.services && appt.services.length > 0 
                  ? appt.services.map(s => s.name || s).join(', ')
                  : 'N/A';

                return (
                  <div 
                    key={appt._id} 
                    className="bg-[#0a0a0a]/80 border border-white/10 rounded-xl p-6 hover:border-[#d4af37]/50 transition duration-300 relative overflow-hidden group"
                  >
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        appt.status === 'Pending' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/50' : 
                        appt.status === 'Approved' ? 'bg-green-900/30 text-green-400 border border-green-700/50' :
                        'bg-red-900/30 text-red-400 border border-red-700/50'
                      }`}>
                        {appt.status}
                      </span>
                    </div>

                    {/* Appointment Details */}
                    <div className="space-y-3 mb-6 mt-2">
                      <div className="flex items-start">
                        <span className="text-gray-400 font-medium w-20">Services:</span>
                        <span className="text-white font-medium flex-1">{serviceNames}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-400 font-medium w-20">Date:</span>
                        <span className="text-white">{new Date(appt.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-400 font-medium w-20">Time:</span>
                        <span className="text-white">{appt.startTime} - {appt.endTime}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-400 font-medium w-20">Amount:</span>
                        <span className="text-[#d4af37] font-semibold">Rs. {appt.totalAmount}</span>
                      </div>
                    </div>

                    {/* Action Button Area */}
                    <div className="border-t border-white/10 pt-4 mt-4">
                      {canCancel ? (
                        <button 
                          onClick={() => handleCancel(appt._id)}
                          className="w-full bg-[#1a1a1a] hover:bg-red-900/80 text-red-400 hover:text-white font-semibold py-2 px-4 border border-red-900/50 hover:border-transparent rounded-md transition duration-300"
                        >
                          Cancel Booking
                        </button>
                      ) : (
                        <div className="text-center">
                          <button 
                            disabled
                            className="w-full bg-[#111111] text-gray-600 font-semibold py-2 px-4 rounded-md cursor-not-allowed border border-white/5"
                          >
                            Cannot Cancel
                          </button>
                          <p className="text-xs text-red-400/80 mt-2 font-light">
                            * Cancellations only allowed 2 hours prior to the appointment.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Dashboard;