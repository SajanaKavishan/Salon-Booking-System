import React from 'react'; 
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from './components/ThemeToggle'; // Import the new ThemeToggle component

// Main Navbar Component
function Navbar() {
  const navigate = useNavigate();
  const location = useLocation(); 
  
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');
  const isLoggedIn = user && token;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register') {
    return null; 
  }

  return (
    <nav className="bg-white dark:bg-slate-900 shadow-md py-4 px-6 mb-8 border-b-4 border-blue-600 dark:border-blue-500 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        {/* Logo Section */}
        <div className="text-2xl font-extrabold text-gray-900 dark:text-white transition-colors duration-300">
          <Link to={user?.role === 'admin' ? '/admin' : '/dashboard'}>
            Salon<span className="text-blue-600 dark:text-blue-400">Booking</span>
          </Link>
        </div>
        
        {/* Navigation Links */}
        <div className="flex space-x-6 items-center">
          {isLoggedIn && (
            <>
              {user.role === 'admin' ? (
                // Links for Admin users
                <Link to="/admin" className="text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 font-bold transition duration-300">
                  Admin Dashboard
                </Link>
              ) : (
                // Links for regular customers
                <>
                  <Link to="/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 font-bold transition duration-300">
                    My Dashboard
                  </Link>
                  <Link to="/book" className="text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 font-bold transition duration-300">
                    Book Appointment
                  </Link>
                  <Link to="/profile" className="text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 font-bold transition duration-300">
                    My Profile
                  </Link>
                </>
              )}
              
              {/* 👇 අලුත් Day / Night Toggle Button එක 👇 */}
              <ThemeToggle />
              {/* ☝️ අලුත් Button එකේ අවසානය ☝️ */}

              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white font-bold py-2 px-5 rounded-lg shadow-md transition duration-300 transform hover:-translate-y-1"
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
