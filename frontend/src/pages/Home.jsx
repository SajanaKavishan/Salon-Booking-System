import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-blue-600 selection:text-white">
      
      {/* --- Navigation Bar --- */}
      <nav className="fixed w-full z-50 px-10 py-6 bg-[#0a0a0a]/90 backdrop-blur-md flex justify-between items-center transition-all border-b border-white/5">
        
        {/* Left: Logo (අකුරු ලොකු කළා: text-3xl) */}
        <div className="text-3xl font-bold tracking-widest cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
          Salon<span className="text-white-500">DEES</span>
        </div>

        {/* Center: Navigation Links (අකුරු ලොකු කළා: text-base) */}
        <div className="hidden md:flex gap-10 text-base tracking-wide font-light text-gray-300">
          <button onClick={() => scrollToSection('services')} className="hover:text-white transition">Services</button>
          <button onClick={() => scrollToSection('about')} className="hover:text-white transition">About</button>
          <button onClick={() => scrollToSection('gallery')} className="hover:text-white transition">Gallery</button>
          <button onClick={() => scrollToSection('contact')} className="hover:text-white transition">Contact</button>
          <button onClick={() => navigate('/dashboard')} className="hover:text-white transition">Dashboard</button>
        </div>

        {/* Right: Book Button (අකුරු ලොකු කළා: text-base) */}
        <div>
          <button 
            onClick={() => navigate('/book')}
            className="bg-white text-black px-7 py-3 rounded-sm font-semibold hover:bg-gray-200 transition duration-300 text-base"
          >
            Book Now
          </button>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section id="home" className="relative h-screen flex items-center justify-center text-center px-4 pt-20">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[#0a0a0a]/85"></div>
          <img src="https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=2074&auto=format&fit=crop" alt="Salon Background" className="w-full h-full object-cover opacity-25" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center mt-10">
          {/* Pre-title (text-sm md:text-base) */}
          <span className="text-[#d4af37] font-medium tracking-[0.3em] text-sm md:text-base mb-6 uppercase">
            Premium Hair Studio
          </span>
          
          {/* Main Title (text-6xl md:text-8xl) */}
          <h1 className="text-6xl md:text-8xl font-serif mb-6 leading-tight">
            Where Style Meets <br /> Sophistication
          </h1>
          
          {/* Subtitle (text-lg md:text-xl) */}
          <p className="text-gray-300 text-lg md:text-xl max-w-3xl mb-12 font-light leading-relaxed">
            Experience the art of hair transformation at SalonBooking. Our expert stylists craft personalized looks that elevate your natural beauty.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5">
            <button 
              onClick={() => navigate('/book')}
              className="bg-white text-black px-10 py-4 rounded-sm font-semibold hover:bg-gray-200 transition duration-300 flex items-center justify-center gap-2 text-lg"
            >
              Book Now <span>→</span>
            </button>
            <button 
              onClick={() => scrollToSection('services')}
              className="border border-white/20 text-white px-10 py-4 rounded-sm font-medium hover:bg-white/10 transition duration-300 text-lg"
            >
              View Services
            </button>
          </div>
        </div>
      </section>

      {/* --- Services Section --- */}
      <section id="services" className="py-24 px-6 lg:px-12 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#d4af37] font-medium tracking-[0.2em] text-sm uppercase mb-3 block">
              What We Offer
            </span>
            <h2 className="text-5xl md:text-6xl font-serif">Our Services</h2>
            <p className="text-gray-400 mt-5 font-light text-base md:text-lg">
              Discover our range of premium hair services designed to enhance your natural beauty
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="group cursor-pointer">
              <div className="relative h-[350px] overflow-hidden rounded-md mb-5">
                <div className="absolute top-4 right-4 bg-black/80 backdrop-blur px-4 py-2 text-sm tracking-wider font-semibold z-10 border border-white/10">From Rs. 1500</div>
                <img src="https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=1976&auto=format&fit=crop" alt="Haircut" className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-2xl font-serif">Precision Cuts</h3>
                  <span className="text-gray-500 text-xl group-hover:text-white transition transform group-hover:translate-x-1 group-hover:-translate-y-1">↗</span>
                </div>
                <p className="text-gray-400 font-light text-base line-clamp-3">
                  From classic styles to contemporary trends, our expert stylists deliver cuts tailored to your face shape and personal style.
                </p>
              </div>
            </div>

            <div className="group cursor-pointer">
              <div className="relative h-[350px] overflow-hidden rounded-md mb-5">
                <div className="absolute top-4 right-4 bg-black/80 backdrop-blur px-4 py-2 text-sm tracking-wider font-semibold z-10 border border-white/10">From Rs. 4500</div>
                <img src="https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=2069&auto=format&fit=crop" alt="Coloring" className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-2xl font-serif">Color & Highlights</h3>
                  <span className="text-gray-500 text-xl group-hover:text-white transition transform group-hover:translate-x-1 group-hover:-translate-y-1">↗</span>
                </div>
                <p className="text-gray-400 font-light text-base line-clamp-3">
                  Vibrant colors, subtle balayage, or dimension-adding highlights. We use premium products for stunning results.
                </p>
              </div>
            </div>

            <div className="group cursor-pointer">
              <div className="relative h-[350px] overflow-hidden rounded-md mb-5">
                <div className="absolute top-4 right-4 bg-black/80 backdrop-blur px-4 py-2 text-sm tracking-wider font-semibold z-10 border border-white/10">From Rs. 3000</div>
                <img src="https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=2069&auto=format&fit=crop" alt="Styling" className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-2xl font-serif">Styling & Blowouts</h3>
                  <span className="text-gray-500 text-xl group-hover:text-white transition transform group-hover:translate-x-1 group-hover:-translate-y-1">↗</span>
                </div>
                <p className="text-gray-400 font-light text-base line-clamp-3">
                  Whether for a special occasion or everyday luxury, our styling services leave you looking your absolute best.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* About & Gallery & Contact Sections */}
      <section id="about" className="py-24 px-6 lg:px-12 bg-[#0a0a0a] border-t border-white/5 min-h-[50vh] flex items-center justify-center">
        <h2 className="text-3xl font-serif text-gray-500">About Section Content Goes Here</h2>
      </section>
      
      <section id="gallery" className="py-24 px-6 lg:px-12 bg-[#0a0a0a] border-t border-white/5 min-h-[50vh] flex items-center justify-center">
        <h2 className="text-3xl font-serif text-gray-500">Gallery Section Content Goes Here</h2>
      </section>

      <section id="contact" className="py-24 px-6 lg:px-12 bg-[#0a0a0a] border-t border-white/5 min-h-[50vh] flex items-center justify-center">
        <h2 className="text-3xl font-serif text-gray-500">Contact Section Content Goes Here</h2>
      </section>

    </div>
  );
}

export default Home;