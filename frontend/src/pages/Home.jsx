import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Home() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Contact Form State
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitStatus, setSubmitStatus] = useState('');

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/services');
        const data = Array.isArray(response.data) ? response.data : response.data.services || [];
        setServices(data);
      } catch (error) {
        console.error('Error fetching services:', error);
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const handleBookNow = () => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/book');
    } else {
      navigate('/login');
    }
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Function to handle changes in the contact form inputs
  const handleMessageChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Function to handle contact form submission
  const handleMessageSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus('Sending...');

    try {
      await axios.post('http://localhost:5000/api/messages', formData);
      setSubmitStatus('Success! We will get back to you soon.');
      setFormData({ name: '', email: '', message: '' });

      // Clear the status message after a few seconds
      setTimeout(() => setSubmitStatus(''), 3000);
    } catch (error) {
      console.error('Error sending message:', error);
      setSubmitStatus('Failed to send. Please try again.');
    }
  };

  // Ref for the services slider
  const sliderRef = useRef(null);

  // Functions to handle sliding left and right in the services section
  const slideLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const slideRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  };


  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-[#d4af37] selection:text-black">

      {/* --- Hero Section --- */}
      <section id="home" className="relative h-screen flex items-center justify-center text-center px-4 pt-10">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[#0a0a0a]/85"></div>
          <img src="https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=2074&auto=format&fit=crop" alt="Salon Background" className="w-full h-full object-cover opacity-25" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center mt-10">
          <span className="text-[#d4af37] font-medium tracking-[0.3em] text-sm md:text-base mb-6 uppercase">
            Premium Hair Studio
          </span>

          <h1 className="text-6xl md:text-8xl font-serif mb-6 leading-tight">
            Where Style Meets <br /> Sophistication
          </h1>

          <p className="text-gray-300 text-lg md:text-xl max-w-3xl mb-12 font-light leading-relaxed">
            Experience the art of hair transformation at Salon DEES. Our expert stylists craft personalized looks that elevate your natural beauty.
          </p>

          <div className="flex flex-col sm:flex-row gap-5">
            <button
              onClick={handleBookNow}
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
      <section id="services" className="py-24 px-6 lg:px-12 bg-[#0a0a0a] relative">

        {/* Hide Scrollbar */}
        <style>
          {`
            .hide-scroll-bar::-webkit-scrollbar {
              display: none !important;
            }
            .hide-scroll-bar {
              -ms-overflow-style: none !important;
              scrollbar-width: none !important;
            }
          `}
        </style>

        <div className="max-w-7xl mx-auto">

          {/* Title & Navigation Buttons */}
          <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-16 gap-6">
            <div className="text-center md:text-left">
              <span className="text-[#d4af37] font-medium tracking-[0.2em] text-sm uppercase mb-3 block">
                What We Offer
              </span>
              <h2 className="text-5xl md:text-6xl font-serif text-white">Our Services</h2>
              <p className="text-gray-400 mt-5 font-light text-base md:text-lg max-w-2xl">
                Discover our range of premium hair services designed to enhance your natural beauty
              </p>
            </div>

            {/* Left / Right Buttons */}
            <div className="flex gap-4">
              <button
                onClick={slideLeft}
                className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-[#d4af37] hover:text-black hover:border-[#d4af37] transition-all duration-300 shadow-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
              </button>
              <button
                onClick={slideRight}
                className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-[#d4af37] hover:text-black hover:border-[#d4af37] transition-all duration-300 shadow-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>
          </div>

          {/* Swipeable Container */}
          <div
            ref={sliderRef}
            className="flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory scroll-smooth hide-scroll-bar"
          >
            {loading ? (
              <p className="text-center text-gray-500 w-full">Loading services...</p>
            ) : (
              services.map(service => (
                <div
                  key={service._id}
                  className="group cursor-pointer min-w-[100%] sm:min-w-[calc(50%-12px)] md:min-w-[calc(33.333%-16px)] snap-start flex-shrink-0"
                >
                  <div className="relative h-[350px] overflow-hidden rounded-md mb-5">
                    <div className="absolute top-4 right-4 bg-black/80 backdrop-blur px-4 py-2 text-sm tracking-wider font-semibold z-10 border border-white/10 text-[#d4af37]">
                      From Rs. {service.price}
                    </div>
                    <img
                      src={service.image && service.image.trim() !== "" ? service.image : "https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=2069&auto=format&fit=crop"}
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=2069&auto=format&fit=crop";
                      }}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-2xl font-serif text-white">{service.name}</h3>
                      <span className="text-gray-500 text-xl group-hover:text-[#d4af37] transition transform group-hover:translate-x-1 group-hover:-translate-y-1">↗</span>
                    </div>
                    <p className="text-gray-400 font-light text-base line-clamp-3">
                      {service.duration} Mins Session
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* --- About Section --- */}
      <section id="about" className="py-24 px-6 lg:px-12 bg-[#0a0a0a] border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1">
            <span className="text-[#d4af37] font-medium tracking-[0.2em] text-sm uppercase mb-3 block">Our Story</span>
            <h2 className="text-4xl md:text-5xl font-serif mb-6">Elevating Haircare to an Art Form</h2>
            <p className="text-gray-400 font-light text-base md:text-lg mb-6 leading-relaxed">
              Founded with a passion for style and a commitment to excellence, Salon DEES is more than just a salon—it&apos;s a sanctuary for self-care. Our team of award-winning stylists brings years of experience to provide you with bespoke hair solutions.
            </p>
            <p className="text-gray-400 font-light text-base md:text-lg leading-relaxed">
              We believe that every client is unique, and we dedicate ourselves to uncovering and enhancing your individual beauty using only the finest, premium products.
            </p>
            <button
              onClick={() => scrollToSection('contact')}
              className="mt-8 border-b border-[#d4af37] text-[#d4af37] pb-1 hover:text-white hover:border-white transition duration-300"
            >
              Get in Touch
            </button>
          </div>

          <div className="flex-1 relative w-full">
            <img src="/salonInterior.jpg" alt="Salon Interior" className="w-full h-[400px] md:h-[500px] object-cover rounded-md" />
            <div className="absolute -bottom-6 -left-6 bg-[#111111] p-6 rounded-md border border-white/10 hidden md:block">
              <p className="text-4xl font-serif text-white mb-1">4+</p>
              <p className="text-[#d4af37] text-xs uppercase tracking-wider font-semibold">Years Experience</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- Salon Owner Section --- */}
      <section id="owner" className="py-24 px-6 lg:px-12 bg-[#111111] border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row-reverse items-center gap-16">
          <div className="flex-1">
            <span className="text-[#d4af37] font-medium tracking-[0.2em] text-sm uppercase mb-3 block">Meet The Visionary</span>
            <h2 className="text-4xl md:text-5xl font-serif mb-2">Dileep Malshan</h2>
            <h3 className="text-xl text-gray-300 mb-6 font-light">Founder & Lead Stylist</h3>

            <p className="text-gray-400 font-light text-base md:text-lg mb-6 leading-relaxed">
              &quot;My vision was always to create a space where people don&apos;t just come to get a haircut, but to experience a transformation that boosts their confidence and inner beauty.&quot;
            </p>
            <p className="text-gray-400 font-light text-base md:text-lg leading-relaxed mb-8">
              With over a decade of experience in the beauty and hair industry, Dileep has built Salon DEES from the ground up. Trained internationally, he brings global trends and techniques right to Pothuhera, ensuring every client leaves feeling their absolute best.
            </p>

            <div className="flex items-center gap-4">
              <span className="font-serif text-2xl text-white/80 italic">Dileep</span>
              <div className="h-[1px] w-12 bg-[#d4af37]"></div>
            </div>
          </div>

          <div className="flex-1 w-full">
            <div className="relative p-4 border border-white/10 rounded-md">
              <img src="/Owner.jpg" alt="Salon Owner" className="w-full h-[450px] object-cover rounded" />
            </div>
          </div>
        </div>
      </section>

      {/* --- Gallery Section --- */}
      <section id="gallery" className="py-24 px-6 lg:px-12 bg-[#0a0a0a] border-t border-white/5">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <span className="text-[#d4af37] font-medium tracking-[0.2em] text-sm uppercase mb-3 block">Portfolio</span>
          <h2 className="text-4xl md:text-5xl font-serif">Our Latest Work</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-7xl mx-auto">
          <div className="overflow-hidden rounded-md cursor-pointer group">
            <img src="https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=2069&auto=format&fit=crop" alt="Gallery 1" className="w-full h-48 md:h-64 object-cover group-hover:scale-110 group-hover:opacity-75 transition duration-500" />
          </div>
          <div className="overflow-hidden rounded-md cursor-pointer group">
            <img src="https://images.unsplash.com/photo-1600948836101-f9ffda59d250?q=80&w=2036&auto=format&fit=crop" alt="Gallery 2" className="w-full h-48 md:h-64 object-cover group-hover:scale-110 group-hover:opacity-75 transition duration-500" />
          </div>
          <div className="overflow-hidden rounded-md cursor-pointer group">
            <img src="https://images.unsplash.com/photo-1560869713-7d0a29430803?q=80&w=2012&auto=format&fit=crop" alt="Gallery 3" className="w-full h-48 md:h-64 object-cover group-hover:scale-110 group-hover:opacity-75 transition duration-500" />
          </div>
          <div className="overflow-hidden rounded-md cursor-pointer group">
            <img src="/Gallery4.jpg" alt="Gallery 4" className="w-full h-48 md:h-64 object-cover group-hover:scale-110 group-hover:opacity-75 transition duration-500" />
          </div>
        </div>
      </section>

      {/* --- Contact Section --- */}
      <section id="contact" className="py-24 px-6 lg:px-12 bg-[#111111] border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16">

          <div>
            <span className="text-[#d4af37] font-medium tracking-[0.2em] text-sm uppercase mb-3 block">Get In Touch</span>
            <h2 className="text-4xl md:text-5xl font-serif mb-8">Visit Our Salon</h2>

            <div className="space-y-8 text-gray-300 font-light">
              <div>
                <h4 className="text-white font-medium text-lg mb-2 flex items-center gap-2">
                  <span className="text-[#d4af37]">📍</span> Location
                </h4>
                <p>Wadakada Road,<br />Pothuhera, Sri Lanka</p>
              </div>
              <div>
                <h4 className="text-white font-medium text-lg mb-2 flex items-center gap-2">
                  <span className="text-[#d4af37]">📞</span> Contact
                </h4>
                <p>+94 77 123 4567</p>
                <p>info@salondees.com</p>
              </div>
              <div>
                <h4 className="text-white font-medium text-lg mb-2 flex items-center gap-2">
                  <span className="text-[#d4af37]">🕒</span> Hours
                </h4>
                <p>Mon - Sat: 9:00 AM - 10:00 PM</p>
                <p>Sunday: Closed</p>
              </div>
            </div>
          </div>

          {/* --- Updated Contact Form --- */}
          <div className="bg-[#0a0a0a] p-8 rounded-md border border-white/5 flex flex-col justify-center">
            <h3 className="text-2xl font-serif mb-6">Send a Message</h3>

            {/* Status Message */}
            {submitStatus && (
              <div className={`mb-4 p-3 rounded text-sm ${submitStatus.includes('Success') ? 'bg-green-500/20 text-green-400 border border-green-500/50' : submitStatus.includes('Sending') ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
                {submitStatus}
              </div>
            )}

            <form onSubmit={handleMessageSubmit} className="flex flex-col gap-5">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleMessageChange}
                required
                placeholder="Your Name"
                className="bg-[#111111] border border-white/10 p-3 rounded text-white focus:outline-none focus:border-[#d4af37] transition"
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleMessageChange}
                required
                placeholder="Email Address"
                className="bg-[#111111] border border-white/10 p-3 rounded text-white focus:outline-none focus:border-[#d4af37] transition"
              />
              <textarea
                name="message"
                value={formData.message}
                onChange={handleMessageChange}
                required
                placeholder="How can we help you?"
                rows="4"
                className="bg-[#111111] border border-white/10 p-3 rounded text-white focus:outline-none focus:border-[#d4af37] transition resize-none"
              ></textarea>
              <button
                type="submit"
                disabled={submitStatus === 'Sending...'}
                className="bg-white text-black py-3 rounded font-semibold hover:bg-gray-200 transition mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitStatus === 'Sending...' ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>

        </div>
      </section>

      <footer className="py-8 bg-[#0a0a0a] border-t border-white/5 text-center text-gray-500 text-sm font-light">
        <p>&copy; {new Date().getFullYear()} Salon DEES. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Home;
