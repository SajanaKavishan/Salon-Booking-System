import React from 'react'; 
import { Link, useNavigate, useLocation } from 'react-router-dom';

// Navbar Component
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
  
  // Hide Navbar on Login and Register pages
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null; 
  }

  const scrollToSection = (id) => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };


  // Structure of the Navbar with conditional rendering based on authentication status and user role
  return (
    <nav className="bg-[#111111] py-4 px-6 border-b border-white/5 font-sans z-50 sticky top-0 shadow-lg">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        <div className="text-3xl font-bold tracking-widest text-white cursor-pointer" onClick={() => scrollToSection('home')}>
          Salon<span className="text-[#d4af37]">DEES</span>
        </div>

        <div className="hidden md:flex space-x-8 text-gray-300 text-xl font-medium tracking-wide">
          <button onClick={() => scrollToSection('services')} className="hover:text-[#d4af37] transition duration-300">Services</button>
          <button onClick={() => scrollToSection('about')} className="hover:text-[#d4af37] transition duration-300">About</button>
          <button onClick={() => scrollToSection('gallery')} className="hover:text-[#d4af37] transition duration-300">Gallery</button>
          <button onClick={() => scrollToSection('contact')} className="hover:text-[#d4af37] transition duration-300">Contact</button>
        </div>
        
        <div className="flex space-x-6 items-center">
          {isLoggedIn ? (
            <>
              {user.role === 'admin' ? (
                <Link to="/admin" className="text-gray-300 hover:text-[#d4af37] text-xl font-medium transition duration-300">
                  Admin Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/dashboard" className="text-gray-300 hover:text-[#d4af37] text-xl font-medium transition duration-300 hidden sm:block">
                    Dashboard
                  </Link>
                  <Link to="/book" className="text-gray-300 hover:text-[#d4af37] text-xl font-medium transition duration-300 hidden sm:block">
                    Book Now
                  </Link>
                  <Link to="/profile" className="text-gray-300 hover:text-[#d4af37] text-xl font-medium transition duration-300 hidden sm:block">
                    Profile
                  </Link>
                </>
              )}
              <button onClick={handleLogout} className="bg-white/5 hover:bg-red-500/20 text-gray-300 hover:text-red-400 border border-white/10 text-xl font-medium py-2 px-5 rounded-sm transition duration-300">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-300 hover:text-white text-xl font-medium transition duration-300">
                Sign In
              </Link>
              {/* Sign Up */}
              <Link to="/register" className="bg-[#d4af37] text-black text-xl font-semibold py-2 px-5 rounded-sm hover:bg-yellow-600 transition duration-300">
                Sign Up
              </Link>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}

export default Navbar;