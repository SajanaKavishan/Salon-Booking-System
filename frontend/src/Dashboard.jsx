import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify'; // For better notifications

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      const fetchAppointments = async () => {
        try {
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

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

  const isCancellable = (apptDate, apptTime) => {
    const appointmentDateTime = new Date(`${apptDate}T${apptTime}`);
    const currentDateTime = new Date();
    const differenceInMs = appointmentDateTime - currentDateTime;
    const differenceInHours = differenceInMs / (1000 * 60 * 60);
    return differenceInHours >= 2;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        
        {/* Welcome Header Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 mb-8 flex flex-col sm:flex-row items-center justify-between border-l-4 border-blue-600 dark:border-blue-500 transition-colors duration-300">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              Welcome back, <span className="text-blue-600">{user ? user.name || user.email : 'Guest'}</span>! 
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Manage your salon appointments with ease.</p>
          </div>
          
          <div className="mt-6 sm:mt-0 flex gap-4">
            <button 
              onClick={() => navigate('/book')} 
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-300 transform hover:-translate-y-1"
            >
              + Book New
            </button>
          </div>
        </div>

        {/* Appointments Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 transition-colors duration-300">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 border-b pb-4 border-gray-200 dark:border-slate-700">
            My Appointments
          </h3>

          {appointments.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400 text-lg">You have no upcoming appointments. </p>
              <button 
                onClick={() => navigate('/book')}
                className="mt-4 text-blue-600 font-semibold hover:underline"
              >
                Book your first appointment now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {appointments.map((appt) => {
                const canCancel = isCancellable(appt.date, appt.time);

                return (
                  <div 
                    key={appt._id} 
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-slate-700 rounded-xl p-6 hover:shadow-md transition duration-300 relative overflow-hidden"
                  >
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        appt.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 
                        appt.status === 'Approved' ? 'bg-green-100 text-green-800 border border-green-300' :
                        'bg-red-100 text-red-800 border border-red-300'
                      }`}>
                        {appt.status}
                      </span>
                    </div>

                    {/* Appointment Details */}
                    <div className="space-y-3 mb-6 mt-2">
                      <div className="flex items-center text-gray-700 dark:text-gray-300">
                        <span className="font-semibold w-20">Service:</span>
                        <span className="text-gray-900 dark:text-gray-100 font-medium">{appt.service}</span>
                      </div>
                      <div className="flex items-center text-gray-700 dark:text-gray-300">
                        <span className="font-semibold w-20">Date:</span>
                        <span>{new Date(appt.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center text-gray-700 dark:text-gray-300">
                        <span className="font-semibold w-20">Time:</span>
                        <span>{appt.time}</span>
                      </div>
                    </div>

                    {/* Action Button Area */}
                    <div className="border-t border-gray-200 dark:border-slate-700 pt-4 mt-4">
                      {canCancel ? (
                        <button 
                          onClick={() => handleCancel(appt._id)}
                          className="w-full bg-red-50 hover:bg-red-500 text-red-600 hover:text-white font-semibold py-2 px-4 border border-red-200 hover:border-transparent rounded-lg transition duration-300"
                        >
                          Cancel Booking
                        </button>
                      ) : (
                        <div className="text-center">
                          <button 
                            disabled
                            className="w-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-semibold py-2 px-4 rounded-lg cursor-not-allowed"
                          >
                            Cannot Cancel
                          </button>
                          <p className="text-xs text-red-500 mt-2">
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

