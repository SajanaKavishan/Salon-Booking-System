import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation(); // Get the current location to conditionally render the navbar on login/register pages
  
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');
  const isLoggedIn = user && token;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // We don't want to show the navbar on the login and registration pages, so we check the current path and return null if we're on those routes. This way, the navbar will only be visible on the dashboard, booking, and admin pages where it provides navigation options for logged-in users.
  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register') {
    return null; 
  }

  return (
    <nav className="bg-white shadow-md py-4 px-6 mb-8 border-b-4 border-blue-600">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        {/* Logo Section */}
        <div className="text-2xl font-extrabold">
          <Link to={user?.role === 'admin' ? '/admin' : '/dashboard'}>
            Salon<span className="text-blue-600">Booking</span>
          </Link>
        </div>
        
        {/* Navigation Links */}
        <div className="flex space-x-6 items-center">
          {isLoggedIn && (
            <>
              {user.role === 'admin' ? (
                // Links for Admin users
                <Link to="/admin" className="text-gray-600 hover:text-blue-500 font-bold transition duration-300">
                  Admin Dashboard
                </Link>
              ) : (
                // Links for regular customers
                <>
                  <Link to="/dashboard" className="text-gray-600 hover:text-blue-500 font-bold transition duration-300">
                    My Dashboard
                  </Link>
                  <Link to="/book" className="text-gray-600 hover:text-blue-500 font-bold transition duration-300">
                    Book Appointment
                  </Link>
                  <Link to="/profile" className="text-gray-600 hover:text-blue-500 font-bold transition duration-300">
                    My Profile
                  </Link>
                </>
              )}
              
              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-5 rounded-lg shadow-md transition duration-300 transform hover:-translate-y-1"
              >
                Logout
              </button>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}

export default Navbar;