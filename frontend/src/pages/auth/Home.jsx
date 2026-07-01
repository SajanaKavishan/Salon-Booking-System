import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, MapPin, Star } from 'lucide-react';
import { WEEKLY_OPENING_HOURS, defaultOpeningHours, useSalonSettings } from '../../hooks/useSalonSettings';
import ServicesCarousel from '../../components/home/ServicesCarousel';
import ReviewMarquee from '../../components/home/ReviewMarquee';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const formatTime = (timeValue) => {
  if (!timeValue) return '';

  const [rawHours, rawMinutes] = timeValue.split(':').map(Number);

  if (Number.isNaN(rawHours) || Number.isNaN(rawMinutes)) return timeValue;

  const period = rawHours >= 12 ? 'PM' : 'AM';
  const displayHours = rawHours % 12 || 12;

  return `${displayHours}:${String(rawMinutes).padStart(2, '0')} ${period}`;
};

const formatDayRange = (startIndex, endIndex) => {
  const startLabel = WEEKLY_OPENING_HOURS[startIndex].shortLabel;
  const endLabel = WEEKLY_OPENING_HOURS[endIndex].shortLabel;

  return startIndex === endIndex ? startLabel : `${startLabel} - ${endLabel}`;
};

const formatOpeningHours = (openingHours = {}) => {
  const normalizedHours = WEEKLY_OPENING_HOURS.map((day) => {
    const dayHours = {
      ...defaultOpeningHours[day.key],
      ...(openingHours?.[day.key] || {})
    };

    return {
      ...day,
      displayHours: dayHours.isOpen ? `${formatTime(dayHours.start)} - ${formatTime(dayHours.end)}` : 'Closed'
    };
  });

  const groups = [];

  normalizedHours.forEach((day, index) => {
    const previousGroup = groups[groups.length - 1];

    if (previousGroup && previousGroup.displayHours === day.displayHours) {
      previousGroup.endIndex = index;
      return;
    }

    groups.push({
      startIndex: index,
      endIndex: index,
      displayHours: day.displayHours
    });
  });

  return groups.map((group) => `${formatDayRange(group.startIndex, group.endIndex)}: ${group.displayHours}`);
};

function Home() {
  const navigate = useNavigate();
  const galleryScrollerRef = useRef(null);
  const [services, setServices] = useState([]);
  const [publicReviews, setPublicReviews] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [galleryFade, setGalleryFade] = useState({ left: false, right: false });
  const [loading, setLoading] = useState(true);
  const userRole = localStorage.getItem('userRole');
  const { settings } = useSalonSettings();
  const openingHoursText = useMemo(
    () => formatOpeningHours(settings.openingHours),
    [settings.openingHours]
  );

  // Contact Form State
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitStatus, setSubmitStatus] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchServices = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/services`);
        const fetchedServices = Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
            ? response.data
            : Array.isArray(response.data?.services)
              ? response.data.services
              : [];

        if (isMounted) {
          setServices(fetchedServices);
        }
      } catch (error) {
        console.error('Error fetching services:', error);
        if (isMounted) {
          setServices([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchServices();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const scroller = galleryScrollerRef.current;
    if (!scroller || galleryLoading) return undefined;

    const updateFadeState = () => {
      const scrollBuffer = 8;
      const canScrollLeft = scroller.scrollLeft > scrollBuffer;
      const canScrollRight = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - scrollBuffer;

      setGalleryFade({
        left: canScrollLeft,
        right: canScrollRight,
      });
    };

    updateFadeState();

    scroller.addEventListener('scroll', updateFadeState, { passive: true });
    window.addEventListener('resize', updateFadeState);

    return () => {
      scroller.removeEventListener('scroll', updateFadeState);
      window.removeEventListener('resize', updateFadeState);
    };
  }, [galleryImages.length, galleryLoading]);

  useEffect(() => {
    let isMounted = true;

    const fetchGalleryImages = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/gallery`);
        const fetchedImages = Array.isArray(response.data) ? response.data : [];

        if (isMounted) {
          setGalleryImages(fetchedImages);
        }
      } catch (error) {
        console.error('Error fetching gallery images:', error);
        if (isMounted) {
          setGalleryImages([]);
        }
      } finally {
        if (isMounted) {
          setGalleryLoading(false);
        }
      }
    };

    fetchGalleryImages();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchPublicReviews = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/appointments/reviews/public`);
        const approvedReviews = Array.isArray(response.data) ? response.data : [];

        if (isMounted) {
          setPublicReviews(approvedReviews);
        }
      } catch (error) {
        console.error('Error fetching public reviews:', error);
        if (isMounted) {
          setPublicReviews([]);
        }
      }
    };

    fetchPublicReviews();

    return () => {
      isMounted = false;
    };
  }, []);

  const reviewSummary = useMemo(() => {
    const validReviews = publicReviews.filter((review) => Number.isFinite(Number(review?.rating)));
    const totalReviews = validReviews.length;

    if (totalReviews === 0) {
      return {
        averageRating: '0.0',
        totalReviews: 0,
        label: 'No client review yet',
      };
    }

    const totalRating = validReviews.reduce((sum, review) => sum + Number(review.rating), 0);
    const averageRating = (totalRating / totalReviews).toFixed(1);

    return {
      averageRating,
      totalReviews,
      label: `${averageRating} / 5 based on client reviews`,
    };
  }, [publicReviews]);

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

  const handleBookingRedirect = (serviceId) => {
    const token = localStorage.getItem('token');

    if (token) {
      navigate('/customer/book', {
        state: { preSelectedServiceId: serviceId }
      });
      return;
    }

    navigate(`/login?next=/customer/book&serviceId=${encodeURIComponent(serviceId)}`);
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
      await axios.post(`${API_BASE_URL}/api/messages`, formData);
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

  const sectionVariants = {
    hidden: { opacity: 0, y: 56 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: 0.14
      }
    }
  };

  const revealLeftVariants = {
    hidden: { opacity: 0, x: -48 },
    show: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
    }
  };

  const revealRightVariants = {
    hidden: { opacity: 0, x: 48 },
    show: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
    }
  };

  const revealItemVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
    }
  };

  const scrollViewport = { once: true, amount: 0.2 };
  return (
    <motion.div
      className="salon-page min-h-screen bg-[#0a0a0a] text-white selection:bg-[#d4af37] selection:text-black"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="salon-page-overlay absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute left-[-5%] top-[-10%] h-[220px] w-[220px] rounded-full bg-primary/10 blur-[100px] sm:h-[300px] sm:w-[300px] sm:blur-[120px]" />
      <div className="pointer-events-none absolute right-[-10%] top-[20%] h-[220px] w-[220px] rounded-full bg-primary/10 blur-[100px] sm:h-[300px] sm:w-[300px] sm:blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[10%] left-[20%] h-[240px] w-[240px] rounded-full bg-primary/10 blur-[110px] sm:h-[320px] sm:w-[320px] sm:blur-[140px]" />

      <section id="home" className="relative flex min-h-[100svh] w-full max-w-full items-center justify-center overflow-hidden px-4 pb-14 pt-24 sm:min-h-screen sm:px-6 sm:pb-44 sm:pt-32 md:pb-52">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[#0a0a0a]/85" />
          <img
            src="https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=2074&auto=format&fit=crop"
            alt="Salon Background"
            className="w-full h-full object-cover opacity-30"
          />
        </div>

        <motion.div
          className="salon-shell relative z-10 mx-auto w-full max-w-full overflow-hidden text-center"
          variants={containerVariants}
        >
          <motion.span
            className="text-xs uppercase tracking-[0.24em] text-primary sm:text-xl sm:tracking-[0.2em]"
            variants={itemVariants}
          >
            Premium Hair Studio
          </motion.span>

          <motion.h1
            className="mx-auto mt-4 max-w-[19rem] bg-gradient-to-b from-white to-neutral-400 bg-clip-text font-brand text-[2.45rem] leading-[1.02] tracking-normal text-transparent sm:mt-6 sm:max-w-none sm:text-6xl md:text-7xl lg:text-8xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            Where Style Meets <br /> Sophistication
          </motion.h1>

          <motion.p
            className="mx-auto mt-4 max-w-[19rem] text-sm font-light leading-6 text-gray-300 sm:mt-6 sm:max-w-[32rem] sm:text-base md:max-w-3xl md:text-xl md:leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
          >
            Experience the art of hair transformation at {settings.salonName}. Our expert stylists craft personalized looks that elevate your natural beauty.
          </motion.p>

          <motion.div
            className="mx-auto mt-7 flex w-full max-w-[19rem] flex-col justify-center gap-2.5 sm:mt-10 sm:max-w-none sm:flex-row sm:gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          >
            <motion.button
              onClick={handlePrimaryCTA}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-[#C9A227] px-8 py-3.5 text-base font-semibold text-black shadow-[0_18px_40px_rgba(255,255,255,0.18)] transition duration-300 ease-out hover:scale-[1.02] hover:bg-gray-200 sm:w-auto sm:px-10 sm:py-4 sm:text-lg"
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              {primaryCTALabel} <ArrowRight className="h-5 w-5" />
            </motion.button>

            <motion.button
              onClick={() => scrollToSection('services')}
              className="min-h-12 rounded-full border border-white/20 px-8 py-3.5 text-base font-medium text-white shadow-[0_12px_30px_rgba(15,15,15,0.45)] transition duration-300 ease-out hover:scale-[1.02] hover:bg-white/10 sm:px-10 sm:py-4 sm:text-lg"
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              View Services
            </motion.button>
          </motion.div>

          {/* Mobile Ratings Card - same animation as web info cards */}
          <motion.div
            className="mx-auto mt-10 w-full max-w-[18rem] md:hidden"
            variants={infoCardsContainerVariants}
          >
            <motion.div
              className="group lux-card lux-card-hover relative overflow-hidden rounded-2xl border border-white/[0.04] bg-card/60 p-4 text-left shadow-2xl backdrop-blur-xl"
              variants={infoCardVariants}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-white/12 via-white/0 to-transparent" />

              <div className="relative flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-primary">
                  <Star className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-neutral-500">Ratings</p>
                  <p className="mt-2 break-words font-sans text-sm font-semibold leading-snug text-white">
                    {reviewSummary.label}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      <section className="relative z-20 hidden px-4 sm:px-6 md:block md:-mt-36 lg:-mt-44">
        <motion.div
          className="salon-shell mx-auto grid max-w-6xl gap-5 md:grid-cols-3"
          variants={infoCardsContainerVariants}
          initial="hidden"
          whileInView="show"
          viewport={scrollViewport}
        >
          {[
            {
              icon: Clock,
              label: 'Hours',
              value: openingHoursText,
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
              value: reviewSummary.label,
              hideOnMobile: false
            }
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className={item.hideOnMobile ? 'hidden md:block' : 'block'}
              >
                <motion.div
                  className="group lux-card lux-card-hover relative overflow-hidden rounded-2xl border border-white/[0.04] bg-card/40 p-4 shadow-2xl backdrop-blur-xl sm:p-6"
                  variants={infoCardVariants}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-white/12 via-white/0 to-transparent" />

                  <div className="relative flex items-start gap-3 sm:gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-primary sm:h-11 sm:w-11">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-neutral-500 text-xs uppercase tracking-wider">{item.label}</p>
                      <p className="mt-2 break-words font-sans text-sm font-semibold leading-snug text-white sm:text-base">
                        {Array.isArray(item.value)
                          ? item.value.map((line) => <span key={line} className="block">{line}</span>)
                          : item.value}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </motion.div>
      </section>

      <ServicesCarousel
        services={services}
        loading={loading}
        onBook={handleBookingRedirect}
      />

      {/* About Section */}
      <motion.section
        id="about"
        className="px-4 py-14 sm:px-6 sm:py-20 lg:px-12 lg:py-24"
        variants={sectionVariants}
        initial="hidden"
        whileInView="show"
        viewport={scrollViewport}
      >
        <motion.div className="mx-auto grid max-w-6xl items-center gap-8 sm:gap-12 md:grid-cols-2">
          <motion.div
            className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
            variants={revealLeftVariants}
          >
            <img
              src={settings.salonInteriorImage || '/salonInterior.jpg'}
              alt="Salon Interior"
              className="h-[260px] w-full object-cover brightness-110 transition duration-500 hover:scale-105 sm:h-[380px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
          </motion.div>

          <motion.div
            className="relative z-10 rounded-2xl border border-white/10 bg-black/40 p-5 text-white backdrop-blur-sm sm:p-6"
            variants={revealRightVariants}
          >
            <span className="tracking-[0.2em] text-xs uppercase text-white font-medium">The Experience</span>
            <h2 className="mt-4 font-serif text-3xl tracking-tight text-white sm:text-4xl md:text-5xl">A Ritual of Refinement</h2>
            <p className="mt-4 text-white text-base md:text-lg leading-relaxed">
              Step into a serene environment curated for relaxation. Every service is crafted to deliver a bespoke experience tailored to your style.
            </p>

            <div className="mt-8 space-y-4">
              {[
                'Personalized consultations with master stylists',
                'Luxury product rituals and signature treatments',
                'Private, calming atmosphere for every appointment'
              ].map((item, index) => (
                <motion.div
                  key={item}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: 18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={scrollViewport}
                  transition={{ duration: 0.45, delay: index * 0.1 }}
                >
                  <span className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <p className="text-white text-sm md:text-base">{item}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Owner Section */}
      <motion.section
        id="owner"
        className="relative overflow-hidden border-t border-white/5 px-4 py-14 sm:px-6 sm:py-20 lg:px-12 lg:py-24"
        variants={sectionVariants}
        initial="hidden"
        whileInView="show"
        viewport={scrollViewport}
      >
        <div className="absolute top-1/2 left-0 -translate-y-1/2 bg-primary/5 blur-[120px] rounded-full w-[300px] h-[300px] pointer-events-none" />

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-8 sm:gap-12 md:grid-cols-2">
          <motion.div variants={revealLeftVariants}>
            <span className="tracking-[0.2em] text-xs uppercase text-primary font-medium">Meet The Visionary</span>
            <h2 className="mt-4 font-serif text-3xl tracking-tight text-white sm:text-4xl md:text-5xl">Dileep Malshan</h2>
            <p className="mt-4 text-white text-base md:text-lg leading-relaxed">
              With over a decade of experience, Dileep leads {settings.salonName} with a focus on precision, artistry, and an unforgettable client experience.
            </p>

            <div className="mt-8 space-y-4">
              {[
                'Internationally trained techniques and trends',
                'One-on-one consultations to refine every detail',
                'Signature finishes that elevate your confidence'
              ].map((item, index) => (
                <motion.div
                  key={item}
                  className="flex items-start gap-3"
                  variants={revealItemVariants}
                  transition={{ delay: index * 0.08 }}
                >
                  <span className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <p className="text-white text-sm md:text-base">{item}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div className="flex justify-center" variants={revealRightVariants}>
            <img
              src={settings.ownerImage || '/Owner.jpg'}
              alt="Dileep Malshan"
              className="aspect-[4/5] w-full max-w-sm rounded-lg border border-white/10 object-cover shadow-2xl brightness-105 transition-all duration-700 sm:max-w-md"
            />
          </motion.div>
        </div>
      </motion.section>

      {/* Gallery Section */}
      <motion.section
        id="gallery"
        className="border-t border-white/5 px-4 py-14 sm:px-6 sm:py-20 lg:px-12 lg:py-24"
        variants={sectionVariants}
        initial="hidden"
        whileInView="show"
        viewport={scrollViewport}
      >
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center" variants={revealItemVariants}>
            <span className="tracking-[0.2em] text-xs uppercase text-primary">Portfolio</span>
            <h2 className="mt-4 font-serif text-3xl text-white sm:text-4xl md:text-5xl">Our Latest Work</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white sm:text-base md:text-lg">
              A glimpse into the transformations crafted by our expert stylists.
            </p>
          </motion.div>

          <div className="relative mt-10">
            {!galleryLoading && (
              <div
                className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent transition-opacity duration-300 sm:w-14 md:w-16 ${
                  galleryFade.left ? 'opacity-100' : 'opacity-0'
                }`}
              />
            )}

            {!galleryLoading && (
              <div
                className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent transition-opacity duration-300 sm:w-14 md:w-16 ${
                  galleryFade.right ? 'opacity-100' : 'opacity-0'
                }`}
              />
            )}

            <motion.div
              ref={galleryScrollerRef}
              className="no-scrollbar flex touch-pan-x snap-x gap-3 overflow-x-auto scroll-smooth pb-1 sm:gap-4"
              variants={containerVariants}
            >
              {galleryLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`gallery-skeleton-${index}`}
                    className="h-36 w-[calc(50%-0.375rem)] shrink-0 animate-pulse snap-start rounded-xl border border-white/10 bg-white/10 sm:h-48 sm:w-[calc(50%-0.5rem)] md:w-[calc(25%-0.75rem)]"
                  />
                ))
                : galleryImages.map((image, index) => (
                  <motion.div
                    key={image._id || image.imageUrl}
                    className="group w-[calc(50%-0.375rem)] shrink-0 snap-start overflow-hidden rounded-xl border border-white/10 sm:w-[calc(50%-0.5rem)] md:w-[calc(25%-0.75rem)]"
                    variants={revealItemVariants}
                    whileHover={{ y: -6, transition: { duration: 0.2 } }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <img
                      src={image.imageUrl}
                      alt={image.altText || image.title || `Gallery ${index + 1}`}
                      className="h-36 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-48"
                    />
                  </motion.div>
                ))}
            </motion.div>
          </div>

          {!galleryLoading && galleryImages.length === 0 && (
            <motion.div
              className="mt-10 rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-5 py-10 text-center"
              variants={revealItemVariants}
            >
              <p className="font-serif text-2xl text-white">No gallery images yet</p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-400">
                New portfolio work will appear here once images are uploaded from the admin dashboard.
              </p>
            </motion.div>
          )}
        </div>
      </motion.section>

      <ReviewMarquee reviews={publicReviews} />

      {/* Contact Section */}
      <motion.section
        id="contact"
        className="border-t border-white/5 px-4 py-14 sm:px-6 sm:py-20 lg:px-12 lg:py-24"
        variants={sectionVariants}
        initial="hidden"
        whileInView="show"
        viewport={scrollViewport}
      >
        <div className="mx-auto grid max-w-6xl gap-8 sm:gap-12 md:grid-cols-2">
          <motion.div variants={revealLeftVariants}>
            <span className="tracking-[0.2em] text-xs uppercase text-primary">Get In Touch</span>
            <h2 className="mt-4 font-serif text-3xl text-white sm:text-4xl md:text-5xl">Visit Our Salon</h2>
            <p className="mt-4 text-white text-base md:text-lg">
              We would love to welcome you for a personalized consultation.
            </p>

            <div className="mt-10 space-y-6 text-white">
              <div>
                <p className="text-white text-xs uppercase tracking-wider">Location</p>
                <p className="mt-2 break-words font-sans font-semibold text-white">{settings.address}</p>
              </div>

              <div>
                <p className="text-white text-xs uppercase tracking-wider">Contact</p>
                <p className="mt-2 break-words font-sans font-semibold text-white">{settings.contactNumber}</p>
                <p className="break-words text-white">{settings.supportEmail}</p>
              </div>

              <div>
                <p className="text-white text-xs uppercase tracking-wider">Open Hours</p>
                <div className="mt-2 space-y-1 text-white font-sans font-semibold">
                  {openingHoursText.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="group lux-card lux-card-hover relative overflow-hidden rounded-2xl border border-white/[0.04] bg-card/40 p-5 backdrop-blur-xl sm:p-8"
            variants={revealRightVariants}
          >
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-white/12 via-white/0 to-transparent" />

            <div className="relative">
              <h3 className="text-2xl font-serif text-white">Send a Message</h3>

              {submitStatus && (
                <div
                  className={`mt-5 rounded-lg border p-3 text-sm ${
                    submitStatus.includes('Success')
                      ? 'bg-green-500/20 text-green-400 border-green-500/50'
                      : submitStatus.includes('Sending')
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                        : 'bg-red-500/20 text-red-400 border-red-500/50'
                  }`}
                >
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
                />

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
          </motion.div>
        </div>
      </motion.section>

      <motion.footer
        className="border-t border-white/5 px-4 py-8 text-center text-sm font-light text-gray-500 sm:py-10"
        variants={itemVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
      >
        <p>&copy; {new Date().getFullYear()} {settings.salonName}. All rights reserved.</p>
      </motion.footer>
    </motion.div>
  );
}

export default Home;
