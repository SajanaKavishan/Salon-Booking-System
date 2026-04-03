import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Go back to dashboard after booking
import { toast } from 'react-toastify'; // For better notifications
import Spinner from './components/Spinner'; // Loading spinner component

function BookAppointment() {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [service, setService] = useState('');
  const [stylist, setStylist] = useState('');
  const [servicesList, setServicesList] = useState([]);
  const [stylistsList, setStylistsList] = useState([]);

  const navigate = useNavigate(); 
  const [isLoading, setIsLoading] = useState(false); // Loading state for booking process

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [servicesRes, staffRes] = await Promise.all([
          axios.get('http://localhost:5000/api/services'),
          axios.get('http://localhost:5000/api/staff')
        ]);
        setServicesList(servicesRes.data);
        setStylistsList(staffRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load services and staff.");
      }
    };
    fetchOptions();
  }, []);

  const handleBooking = async (e) => {
    e.preventDefault(); 
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const bookingData = {
        date: date,
        time: time,
        service: service,
        stylist: stylist

      };

      await axios.post(
        'http://localhost:5000/api/appointments', 
        bookingData,
        {
          headers: {
            Authorization: `Bearer ${token}` 
          }
        }
      );

      toast.success("Great! Your appointment has been booked successfully.");
      
      setDate('');
      setTime('');
      setService('');
      setStylist('');
      // After booking the appointment, we navigate the user back to the dashboard where they can see their upcoming appointments and manage them. This provides a seamless experience, allowing users to easily return to the main area of the app after completing their booking.
      // navigate('/dashboard'); 

    } catch (error) {
      console.error("Booking Error:", error);
      toast.error("Sorry! There was an error booking your appointment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 py-10 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-blue-600 dark:border-blue-500 transition-colors duration-300">
        
        {/* Back to Dashboard Link */}
        <button 
          onClick={() => navigate('/dashboard')}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6 flex items-center transition-colors font-medium"
        >
          <span>← Back to Dashboard</span>
        </button>

        {/* Title Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Book an <span className="text-blue-600">Appointment</span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            Choose your preferred service, date, and time.
          </p>
        </div>
        
        {/* Booking Form */}
        <form onSubmit={handleBooking} className="space-y-5">
          
          {/* Date Picker */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Select Date:
            </label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              required 
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-100"
            />
          </div>

          {/* Time Picker */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Select Time:
            </label>
            <input 
              type="time" 
              value={time} 
              onChange={(e) => setTime(e.target.value)} 
              required 
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-100"
            />
          </div>

          {/* Service Dropdown */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Select Service:
            </label>
            <div className="relative">
              <select 
                value={service} 
                onChange={(e) => setService(e.target.value)} 
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-100 appearance-none"
              >
                <option value="" disabled>Choose a service...</option>
                {servicesList.map((serviceItem) => (
                  <option key={serviceItem._id} value={serviceItem.name}>
                    {serviceItem.name}
                  </option>
                ))}
              </select>
              {/* Custom Arrow for Dropdown */}
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-700 dark:text-gray-200">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Stylist Dropdown */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Select Stylist:
            </label>
            <div className="relative">
              <select 
                value={stylist} 
                onChange={(e) => setStylist(e.target.value)} 
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-100 appearance-none"
              >
                <option value="" disabled>Choose a stylist...</option>
                <option value="Any Available Stylist">Any Available Stylist</option>
                {stylistsList.map((stylistItem) => (
                  <option key={stylistItem._id} value={stylistItem._id}>
                    {stylistItem.name}
                  </option>
                ))}
              </select>
              {/* Custom Arrow for Dropdown */}
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-700 dark:text-gray-200">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isLoading} // Disable the button while booking is in progress to prevent multiple submissions
            className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transform hover:-translate-y-1 transition-all duration-300 shadow-lg mt-6"
          >
            {isLoading ? <Spinner /> : 'Confirm Booking'}
          </button>
          
        </form>
      </div>
    </div>
  );
}

export default BookAppointment;

