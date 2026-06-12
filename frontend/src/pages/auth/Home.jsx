import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, MapPin, Star } from 'lucide-react';
import { useSalonSettings } from '../../hooks/useSalonSettings';

function Home() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const userRole = localStorage.getItem('userRole');
  const { settings } = useSalonSettings();

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

  const handlePrimaryCTA = () => {
    if (userRole === 'admin') {
      navigate('/admin');
      return;
    }

    if (userRole === 'staff') {
      navigate('/staff/dashboard');
      return;
    }

    navigate('/booking');
  };

  const primaryCTALabel = userRole === 'admin'
    ? 'Go to Admin Dashboard'
    : userRole === 'staff'
      ? 'Go to Staff Dashboard'
      : 'Book Now';

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleMessageChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleMessageSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus('Sending...');

    try {
      await axios.post('http://localhost:5000/api/messages', formData);
      setSubmitStatus('Success! We will get back to you soon.');
      setFormData({ name: '', email: '', message: '' });

      setTimeout(() => setSubmitStatus(''), 3000);
    } catch (error) {
      console.error('Error sending message:', error);
      setSubmitStatus('Failed to send. Please try again.');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.12 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  };

  const infoCardsContainerVariants = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 60,
        damping: 15,
        when: 'beforeChildren',
        staggerChildren: 0.12,
        delayChildren: 0.3
      }
    }
  };

  const infoCardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.97 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 80,
        damping: 15
      }
    }
  };

  return (
    <motion.div
      className="salon-page min-h-screen bg-[#0a0a0a] text-white selection:bg-[#d4af37] selection:text-black"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="salon-page-overlay absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute left-[-5%] top-[-10%] h-[300px] w-[300px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-[-10%] top-[20%] h-[300px] w-[300px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[10%] left-[20%] h-[320px] w-[320px] rounded-full bg-primary/10 blur-[140px]" />

      {/* Hero Section: Mobile pb-16 කරලා ඉඩ ඉතුරු කළා */}
      <section id="home" className="relative min-h-screen flex w-full max-w-full items-center justify-center overflow-hidden px-6 pt-32 pb-16 sm:pt-28 sm:pb-44 md:pb-52">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[#0a0a0a]/85" />
          <img
            src="https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=2074&auto=format&fit=crop"
            alt="Salon Background"
            className="w-full h-full object-cover opacity-30"
          />
        </div>

        <motion.div
          className="relative z-10 w-full max-w-full overflow-hidden salon-shell mx-auto text-center"
          variants={containerVariants}
        >
          <motion.span
            className="tracking-[0.2em] text-xl uppercase text-primary"
            variants={itemVariants}
          >
            Premium Hair Studio
          </motion.span>

          <motion.h1
            className="font-brand text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight leading-none bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            Where Style Meets <br /> Sophistication
          </motion.h1>

          <motion.p
            className="mt-6 text-gray-300 text-lg md:text-xl max-w-3xl mx-auto font-light leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
          >
            Experience the art of hair transformation at {settings.salonName}. Our expert stylists craft personalized looks that elevate your natural beauty.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col sm:flex-row justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          >
            <motion.button
              onClick={handlePrimaryCTA}
              className="rounded-full bg-gradient-to-r from-primary to-[#C9A227] px-10 py-4 text-black font-semibold shadow-[0_18px_40px_rgba(255,255,255,0.18)] transition duration-300 ease-out hover:scale-[1.02] hover:bg-gray-200 flex items-center justify-center gap-2 text-lg"
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              {primaryCTALabel} <ArrowRight className="h-5 w-5" />
            </motion.button>
            <motion.button
              onClick={() => scrollToSection('services')}
              className="rounded-full border border-white/20 px-10 py-4 text-white font-medium shadow-[0_12px_30px_rgba(15,15,15,0.45)] transition duration-300 ease-out hover:scale-[1.02] hover:bg-white/10 text-lg"
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              View Services
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* Info Cards Section: -mt-28 දාලා Mobile වලදී තවත් උඩට ගත්තා */}
      <section className="relative z-20 -mt-28 sm:-mt-28 md:-mt-36 lg:-mt-44 px-6">
        <motion.div
          className="salon-shell max-w-6xl mx-auto grid gap-5 md:grid-cols-3"
          variants={infoCardsContainerVariants}
          initial="hidden"
          animate="show"
        >
          {[
            {
              icon: Clock,
              label: 'Hours',
              value: 'Mon - Sat: 9:00 AM - 10:00 PM',
              hideOnMobile: true
            },
            {
              icon: MapPin,
              label: 'Location',
              value: settings.address || 'Pothuhera',
              hideOnMobile: true
            },
            {
              icon: Star,
              label: 'Ratings',
              value: '4.9 / 5 based on client reviews',
              hideOnMobile: false
            }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                className={`group lux-card lux-card-hover backdrop-blur-xl bg-card/40 border border-white/[0.04] relative overflow-hidden p-6 rounded-2xl shadow-2xl ${
                  item.hideOnMobile ? 'hidden md:block' : 'block'
                }`}
                variants={infoCardVariants}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
              >
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-white/12 via-white/0 to-transparent" />
                <div className="relative flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-primary shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-neutral-500 text-xs uppercase tracking-wider">{item.label}</p>
                    <p className="mt-2 text-white font-sans font-semibold text-sm sm:text-base leading-snug">{item.value}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Signature Rituals (Services) Section */}
      <motion.section
        id="services"
        className="relative py-24 px-6 lg:px-12"
        variants={itemVariants}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <span className="tracking-[0.2em] text-xs uppercase text-primary">Premium Services</span>
            <h2 className="mt-4 text-4xl md:text-5xl font-serif text-white">Signature Rituals</h2>
            <p className="mt-4 text-gray-400 text-base md:text-lg max-w-2xl mx-auto">
              Curated treatments tailored to elevate your look and leave a lasting impression.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {services.slice(0, 3).map((service) => (
              <motion.div
                key={service._id}
                className="group lux-card lux-card-hover backdrop-blur-xl bg-card/40 border border-white/[0.04] relative overflow-hidden p-6 rounded-2xl"
                variants={itemVariants}
                whileHover={{ y: -10, transition: { duration: 0.2 } }}
              >
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-white/12 via-white/0 to-transparent" />
                <div className="relative">
                  <p className="text-neutral-500 text-xs uppercase tracking-wider">{service.duration} mins</p>
                  <h3 className="mt-3 text-2xl font-sans font-semibold text-white">{service.name}</h3>
                  <p className="mt-4 text-gray-400">Premium experience from Rs. {service.price}</p>
                  <div className="mt-6 inline-flex items-center gap-2 text-primary text-sm font-medium">
                    Book this ritual <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </motion.div>
            ))}
            {!loading && services.length === 0 && (
              <div className="text-center text-gray-500 md:col-span-3">No services available yet.</div>
            )}
          </div>
        </div>
      </motion.section>

      {/* About Section */}
      <motion.section
        id="about"
        className="py-24 px-6 lg:px-12"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="max-w-6xl mx-auto grid gap-12 md:grid-cols-2 items-center">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <img
              src="/salonInterior.jpg"
              alt="Salon Interior"
              className="h-[380px] w-full object-cover brightness-110 transition duration-500 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
          </div>

          <div className="relative z-10 rounded-2xl border border-white/10 bg-black/40 p-6 text-white backdrop-blur-sm">
            <span className="tracking-[0.2em] text-xs uppercase text-white font-medium">The Experience</span>
            <h2 className="mt-4 text-4xl md:text-5xl font-serif text-white tracking-tight">A Ritual of Refinement</h2>
            <p className="mt-4 text-white text-base md:text-lg leading-relaxed">
              Step into a serene environment curated for relaxation. Every service is crafted to deliver a bespoke experience tailored to your style.
            </p>

            <div className="mt-8 space-y-4">
              {[
                'Personalized consultations with master stylists',
                'Luxury product rituals and signature treatments',
                'Private, calming atmosphere for every appointment'
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <p className="text-white text-sm md:text-base">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Owner Section */}
      <motion.section
        id="owner"
        className="relative py-24 px-6 lg:px-12 border-t border-white/5 overflow-hidden"
        variants={itemVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="absolute top-1/2 left-0 -translate-y-1/2 bg-primary/5 blur-[120px] rounded-full w-[300px] h-[300px] pointer-events-none" />

        <div className="max-w-6xl mx-auto grid gap-12 md:grid-cols-2 items-center relative z-10">
          <div>
            <span className="tracking-[0.2em] text-xs uppercase text-primary font-medium">Meet The Visionary</span>
            <h2 className="mt-4 text-4xl md:text-5xl font-serif text-white tracking-tight">Dileep Malshan</h2>
            <p className="mt-4 text-white text-base md:text-lg leading-relaxed">
              With over a decade of experience, Dileep leads {settings.salonName} with a focus on precision, artistry, and an unforgettable client experience.
            </p>

            <div className="mt-8 space-y-4">
              {[
                'Internationally trained techniques and trends',
                'One-on-one consultations to refine every detail',
                'Signature finishes that elevate your confidence'
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <p className="text-white text-sm md:text-base">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <img
              src="/Owner.jpg"
              alt="Dileep Malshan"
              className="rounded-lg shadow-2xl object-cover aspect-[4/5] w-full max-w-md brightness-105 transition-all duration-700 border border-white/10"
            />
          </div>
        </div>
      </motion.section>

      {/* Gallery Section */}
      <motion.section
        id="gallery"
        className="py-24 px-6 lg:px-12 border-t border-white/5"
        variants={itemVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <span className="tracking-[0.2em] text-xs uppercase text-primary">Portfolio</span>
            <h2 className="mt-4 text-4xl md:text-5xl font-serif text-white">Our Latest Work</h2>
            <p className="mt-4 text-white text-base md:text-lg max-w-2xl mx-auto">
              A glimpse into the transformations crafted by our expert stylists.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=2069&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?q=80&w=2036&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1560869713-7d0a29430803?q=80&w=2012&auto=format&fit=crop',
              '/Gallery4.jpg'
            ].map((src, index) => (
              <motion.div
                key={src}
                className="group overflow-hidden rounded-xl border border-white/10"
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
              >
                <img
                  src={src}
                  alt={`Gallery ${index + 1}`}
                  className="h-48 w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Contact Section */}
      <motion.section
        id="contact"
        className="py-24 px-6 lg:px-12 border-t border-white/5"
        variants={itemVariants}
      >
        <div className="max-w-6xl mx-auto grid gap-12 md:grid-cols-2">
          <div>
            <span className="tracking-[0.2em] text-xs uppercase text-primary">Get In Touch</span>
            <h2 className="mt-4 text-4xl md:text-5xl font-serif text-white">Visit Our Salon</h2>
            <p className="mt-4 text-white text-base md:text-lg">
              We would love to welcome you for a personalized consultation.
            </p>
            <div className="mt-10 space-y-6 text-white">
              <div>
                <p className="text-white text-xs uppercase tracking-wider">Location</p>
                <p className="mt-2 text-white font-sans font-semibold">{settings.address}</p>
              </div>
              <div>
                <p className="text-white text-xs uppercase tracking-wider">Contact</p>
                <p className="mt-2 text-white font-sans font-semibold">{settings.contactNumber}</p>
                <p className="text-white">{settings.supportEmail}</p>
              </div>
              <div>
                <p className="text-white text-xs uppercase tracking-wider">Hours</p>
                <p className="mt-2 text-white font-sans font-semibold">Mon - Sat: 9:00 AM - 10:00 PM</p>
                <p className="text-white">Sunday: Closed</p>
              </div>
            </div>
          </div>

          <div className="group lux-card lux-card-hover backdrop-blur-xl bg-card/40 border border-white/[0.04] relative overflow-hidden p-8 rounded-2xl">
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-white/12 via-white/0 to-transparent" />
            <div className="relative">
              <h3 className="text-2xl font-serif text-white">Send a Message</h3>

              {submitStatus && (
                <div className={`mt-5 rounded-lg border p-3 text-sm ${submitStatus.includes('Success') ? 'bg-green-500/20 text-green-400 border-green-500/50' : submitStatus.includes('Sending') ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50'}`}>
                  {submitStatus}
                </div>
              )}

              <form onSubmit={handleMessageSubmit} className="mt-6 flex flex-col gap-4">
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
                <motion.button
                  type="submit"
                  disabled={submitStatus === 'Sending...'}
                  className="rounded-full bg-[#d4af37] px-8 py-3 text-black font-semibold shadow-[0_18px_40px_rgba(255,255,255,0.18)] transition duration-300 ease-out hover:scale-[1.02] hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                >
                  {submitStatus === 'Sending...' ? 'Sending...' : 'Send Message'}
                </motion.button>
              </form>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.footer
        className="py-10 border-t border-white/5 text-center text-gray-500 text-sm font-light"
        variants={itemVariants}
      >
        <p>&copy; {new Date().getFullYear()} {settings.salonName}. All rights reserved.</p>
      </motion.footer>
    </motion.div>
  );
}

export default Home;