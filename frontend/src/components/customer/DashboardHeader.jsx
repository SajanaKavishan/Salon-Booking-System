import React, { useEffect, useMemo, useState } from 'react';
import { apiClient as axios } from '../../utils/apiConfig';
import { motion } from 'framer-motion';
import API_BASE_URL from '../../utils/apiConfig';
import { storage } from '../../utils/storage';

const HERO_IMAGE_URL = '/heroBg.jpg';
const FALLBACK_AVAILABILITY_MESSAGE = 'Ready to elevate your aesthetic? Explore our master stylists and reserve your luxury grooming experience today.';

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

function DashboardHeader({ firstName, nextAppointment, formatDate, onBook }) {
  const [availability, setAvailability] = useState({
    scenario: 'no_preferred_stylist',
    message: FALLBACK_AVAILABILITY_MESSAGE,
  });
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(true);

  const greeting = useMemo(() => getGreeting(), []);

  useEffect(() => {
    let isMounted = true;

    const fetchAvailabilityMessage = async () => {
      const token = storage.get('token');

      if (!token) {
        if (isMounted) setIsAvailabilityLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/api/users/dashboard-banner`);

        if (!isMounted) return;

        setAvailability({
          scenario: response.data?.scenario || 'no_preferred_stylist',
          message: response.data?.message || FALLBACK_AVAILABILITY_MESSAGE,
          slotsOpen: Number(response.data?.slotsOpen || 0),
          stylistName: response.data?.stylistName || '',
          hasPreferredStylist: Boolean(response.data?.hasPreferredStylist),
        });
      } catch (error) {
        if (!isMounted) return;
        console.error('Dashboard availability message error:', error);
        setAvailability({
          scenario: 'no_preferred_stylist',
          message: FALLBACK_AVAILABILITY_MESSAGE,
        });
      } finally {
        if (isMounted) setIsAvailabilityLoading(false);
      }
    };

    fetchAvailabilityMessage();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <motion.header
      className="relative mb-8 w-full overflow-hidden rounded-2xl border border-[#D4AF37]/25 bg-[#080705] p-6 shadow-2xl shadow-black/40 sm:p-8"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
    >
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[58%] bg-cover bg-center opacity-45 md:block"
        style={{ backgroundImage: `url("${HERO_IMAGE_URL}")` }}
      ></div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#080705] via-[#080705]/96 via-45% to-[#080705]/50"></div>
      <div className="pointer-events-none absolute -left-24 top-[-8rem] h-72 w-72 rounded-full bg-[#D4AF37]/12 blur-3xl"></div>
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#F7D56B]/70 to-transparent"></div>
      <div
        className="pointer-events-none absolute left-[28%] top-[-80%] h-[240%] w-[28rem] -rotate-[30deg] opacity-55"
        style={{
          backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.08) 36%, rgba(247,213,107,0.16) 50%, rgba(212,175,55,0.06) 64%, transparent 100%)',
          maskImage: 'linear-gradient(90deg, transparent 0%, black 30%, black 70%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 30%, black 70%, transparent 100%)',
        }}
      ></div>

      <div className="relative flex flex-col gap-6 sm:gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <h1 className="mt-2 break-words font-serif text-2xl leading-tight text-white sm:mt-4 sm:text-4xl">
            {greeting}, <span className="bg-gradient-to-r from-[#FFF1B8] via-[#D4AF37] to-[#B8872A] bg-clip-text text-transparent">{firstName}</span>
          </h1>
          <motion.p
            className="mt-3 max-w-xl text-sm leading-6 text-neutral-400 sm:text-base"
            animate={isAvailabilityLoading ? { opacity: [0.65, 1, 0.65] } : { opacity: 1 }}
            transition={isAvailabilityLoading ? { duration: 1.7, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
            aria-live="polite"
          >
            {isAvailabilityLoading ? "Checking today's exclusive availability..." : availability.message}
          </motion.p>

          <div className="mt-6 text-sm text-neutral-400 sm:mt-7">
            {nextAppointment ? (
              <div>
                <p>Your next appointment is on</p>
                <p className="mt-3 inline-flex max-w-full flex-wrap items-center gap-2 font-semibold text-[#D4AF37]">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{formatDate(nextAppointment.date)}</span>
                  <span className="h-1 w-1 rounded-full bg-[#D4AF37]"></span>
                  <span>{nextAppointment.startTime || 'Time pending'}</span>
                </p>
              </div>
            ) : (
              <p>No upcoming bookings yet.</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onBook}
          className="relative w-full overflow-hidden rounded-lg bg-[#D4AF37] px-5 py-3 text-sm font-bold text-black shadow-lg shadow-[#D4AF37]/15 transition hover:bg-[#b8952e] sm:w-fit sm:px-6"
        >
          <span className="pointer-events-none absolute inset-y-[-45%] left-[-65%] w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/55 to-transparent opacity-80 animate-[dashboardButtonSheen_3.4s_ease-in-out_infinite]"></span>
          <span className="relative z-10">+ Book New Appointment</span>
        </button>
      </div>
    </motion.header>
  );
}

export default DashboardHeader;
