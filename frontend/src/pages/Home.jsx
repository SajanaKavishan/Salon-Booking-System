import React from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="bg-gray-50 dark:bg-slate-900 min-h-screen font-sans transition-colors duration-300">
      <div className="absolute top-5 right-5 z-10">
        <ThemeToggle />
      </div>
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-100 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-24 px-4 sm:px-6 lg:px-8 text-center border-b border-blue-200 dark:border-slate-700 transition-colors duration-300">
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight">
          Welcome to <span className="text-blue-500">Salon Dees</span> 
        </h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
          Experience the best hair and beauty services in town. Book your appointment online in just a few clicks and get ready to shine!
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button 
            onClick={() => navigate('/login')} 
            className="bg-blue-500 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-600 transition-all duration-300 shadow-xl transform hover:-translate-y-1"
          >
            Book an Appointment
          </button>
          <button 
            onClick={() => navigate('/register')} 
            className="bg-white dark:bg-gray-700 text-blue-500 dark:text-blue-300 px-8 py-4 rounded-full font-bold text-lg border-2 border-blue-500 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-600 transition-all duration-300 shadow-lg"
          >
            Create Account
          </button>
        </div>
      </div>

      {/* Services Preview Section */}
      <div className="max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-center text-gray-900 dark:text-white mb-12">
          Our Premium Services
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          
          {/* Card 1 */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg text-center border-t-4 border-blue-400 dark:border-blue-500 hover:shadow-2xl transition-shadow duration-300">
            <div className="text-4xl mb-4"></div>
            <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-gray-100">Hair Styling</h3>
            <p className="text-gray-500 dark:text-gray-400">Professional cuts, styling, and coloring to give you the perfect look.</p>
          </div>

          {/* Card 2 */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg text-center border-t-4 border-blue-400 dark:border-blue-500 hover:shadow-2xl transition-shadow duration-300">
            <div className="text-4xl mb-4"></div>
            <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-gray-100">Bridal Makeup</h3>
            <p className="text-gray-500 dark:text-gray-400">Make your special day even more beautiful with our expert makeup artists.</p>
          </div>

          {/* Card 3 */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg text-center border-t-4 border-blue-400 dark:border-blue-500 hover:shadow-2xl transition-shadow duration-300">
            <div className="text-4xl mb-4"></div>
            <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-gray-100">Facial & Spa</h3>
            <p className="text-gray-500 dark:text-gray-400">Relaxing treatments for glowing skin and a refreshed mind.</p>
          </div>

        </div>
      </div>
      
    </div>
  );
}

export default Home;

