import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-100 to-blue-50 py-24 px-4 sm:px-6 lg:px-8 text-center border-b border-blue-200">
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">
          Welcome to <span className="text-blue-500">Salon Dees</span> 
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
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
            className="bg-white text-blue-500 px-8 py-4 rounded-full font-bold text-lg border-2 border-blue-500 hover:bg-blue-50 transition-all duration-300 shadow-lg"
          >
            Create Account
          </button>
        </div>
      </div>

      {/* Services Preview Section */}
      <div className="max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-12">
          Our Premium Services
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          
          {/* Card 1 */}
          <div className="bg-white p-8 rounded-2xl shadow-lg text-center border-t-4 border-blue-400 hover:shadow-2xl transition-shadow duration-300">
            <div className="text-4xl mb-4"></div>
            <h3 className="text-xl font-bold mb-3 text-gray-800">Hair Styling</h3>
            <p className="text-gray-500">Professional cuts, styling, and coloring to give you the perfect look.</p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-8 rounded-2xl shadow-lg text-center border-t-4 border-blue-400 hover:shadow-2xl transition-shadow duration-300">
            <div className="text-4xl mb-4"></div>
            <h3 className="text-xl font-bold mb-3 text-gray-800">Bridal Makeup</h3>
            <p className="text-gray-500">Make your special day even more beautiful with our expert makeup artists.</p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-8 rounded-2xl shadow-lg text-center border-t-4 border-blue-400 hover:shadow-2xl transition-shadow duration-300">
            <div className="text-4xl mb-4"></div>
            <h3 className="text-xl font-bold mb-3 text-gray-800">Facial & Spa</h3>
            <p className="text-gray-500">Relaxing treatments for glowing skin and a refreshed mind.</p>
          </div>

        </div>
      </div>
      
    </div>
  );
}

export default Home;