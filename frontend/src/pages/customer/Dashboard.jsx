import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DollarSign } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAppointments } from '../../context/useAppointments';
import ActiveBookingCard from '../../components/customer/ActiveBookingCard';
import AppointmentReviewModal from '../../components/customer/AppointmentReviewModal';
import DashboardHeader from '../../components/customer/DashboardHeader';
import API_BASE_URL from '../../utils/apiConfig';

const HISTORY_STATUSES = ['completed', 'rejected', 'cancelled', 'canceled', 'no-show'];
const UPCOMING_STATUSES = ['pending', 'approved', 'confirmed'];
const REVIEW_PROMPT_STORAGE_PREFIX = 'salonDismissedReviewPrompts';
const MotionDiv = motion.div;

const formatServices = (services, fallback = 'Service not available') => {
  if (!Array.isArray(services) || services.length === 0) return fallback;
  return services.map((service) => service?.name || service).join(', ');
};

const formatDate = (date) => {
  if (!date) return 'Date pending';

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return 'Date pending';

  return parsedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const statusClassName = (status) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (normalizedStatus === 'approved' || normalizedStatus === 'confirmed') return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300';
  if (normalizedStatus === 'pending') return 'border-amber-400/20 bg-amber-400/10 text-amber-300';
  if (['cancelled', 'canceled', 'rejected', 'no-show'].includes(normalizedStatus)) {
    return 'border-rose-400/20 bg-rose-400/10 text-rose-300';
  }
  if (normalizedStatus === 'completed') return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300';
  return 'border-white/10 bg-white/5 text-slate-300';
};

const timeToMinutes = (timeValue) => {
  if (!timeValue || typeof timeValue !== 'string') return 0;

  const [rawTime, modifier] = timeValue.trim().split(' ');
  const [rawHours, rawMinutes] = rawTime.split(':');
  let hours = Number(rawHours);
  const minutes = Number(rawMinutes);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  if (hours === 12) hours = 0;
  if (modifier === 'PM') hours += 12;

  return hours * 60 + minutes;
};

const getStylistDisplayName = (appointment) => {
  // Use optional chaining for safe property access
  const stylistName = appointment?.stylistName || appointment?.stylist;

  // If it's a hex ID (24-char MongoDB ObjectId), it slipped through - show fallback
  if (typeof stylistName === 'string' && /^[0-9a-fA-F]{24}$/.test(stylistName)) {
    return 'Any Available Artist';
  }

  // If stylist name is a string, return it directly
  if (typeof stylistName === 'string' && stylistName.trim()) {
    return stylistName;
  }

  // If stylist is an object with a name property
  if (typeof stylistName === 'object' && stylistName?.name) {
    return stylistName.name;
  }

  // If no stylist assigned, show "Any Available Artist"
  return 'Any Available Artist';
};

const canCancelAppointment = (appointment) => {
  const appointmentDate = appointment?.date || appointment?.bookingDate;

  if (!appointmentDate || !appointment?.startTime) return false;

  // ISO string එකේ date එක විතරක් වෙන් කරලා ගන්නවා
  const cleanDate = appointmentDate.split('T')[0];
  const [year, month, day] = cleanDate.split('-').map(Number);

  const startMinutes = timeToMinutes(appointment.startTime);
  const appointmentStart = new Date(year, month - 1, day, Math.floor(startMinutes / 60), startMinutes % 60);
  const hoursUntilAppointment = (appointmentStart.getTime() - Date.now()) / (1000 * 60 * 60);

  return hoursUntilAppointment >= 2;
};

const getUserStorageId = (currentUser) => (
  currentUser?._id || currentUser?.id || currentUser?.email || 'current'
);

const getReviewPromptStorageKey = (currentUser) => (
  `${REVIEW_PROMPT_STORAGE_PREFIX}:${getUserStorageId(currentUser)}`
);

const readDismissedReviewPromptIds = (currentUser) => {
  try {
    const parsedIds = JSON.parse(localStorage.getItem(getReviewPromptStorageKey(currentUser)) || '[]');
    return Array.isArray(parsedIds) ? parsedIds.filter(Boolean) : [];
  } catch {
    return [];
  }
};

const saveDismissedReviewPromptIds = (currentUser, appointmentIds) => {
  localStorage.setItem(
    getReviewPromptStorageKey(currentUser),
    JSON.stringify(Array.from(new Set(appointmentIds.filter(Boolean))))
  );
};

function Dashboard() {
  const navigate = useNavigate();
  const { appointments, replaceAppointments, upsertAppointment } = useAppointments();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [dismissedReviewAppointmentIds, setDismissedReviewAppointmentIds] = useState([]);
  const [temporarilyClosedReviewAppointmentIds, setTemporarilyClosedReviewAppointmentIds] = useState([]);

  const fetchAppointments = useCallback(async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/appointments`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const apiAppointments = Array.isArray(response.data) ? response.data : [];

      replaceAppointments(apiAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load your appointments.');
    } finally {
      setIsLoading(false);
    }
  }, [replaceAppointments]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }

    fetchAppointments();
  }, [fetchAppointments]); 

  useEffect(() => {
    const handleProfileUpdated = (event) => {
      setUser(event.detail || null);
    };

    window.addEventListener('profileUpdated', handleProfileUpdated);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdated);
  }, []);

  useEffect(() => {
    setDismissedReviewAppointmentIds(readDismissedReviewPromptIds(user));
  }, [user]);

  const upcomingAppointments = useMemo(
    () => appointments
      .filter((appt) => UPCOMING_STATUSES.includes(String(appt?.status || '').trim().toLowerCase()))
      .sort((a, b) => new Date(a?.date).getTime() - new Date(b?.date).getTime()),
    [appointments]
  );

  const pastAppointments = useMemo(
    () => appointments
      .filter((appt) => HISTORY_STATUSES.includes(String(appt?.status || '').trim().toLowerCase()) && !appt?.isHiddenByCustomer)
      .sort((a, b) => new Date(b?.date).getTime() - new Date(a?.date).getTime()),
    [appointments]
  );

  // Only count COMPLETED appointments for Total Visits metric
  const completedAppointments = useMemo(
    () => appointments.filter((appt) => String(appt?.status || '').trim().toLowerCase() === 'completed'),
    [appointments]
  );

  const pendingReviewAppointment = useMemo(
    () => pastAppointments.find((appointment) => {
      const appointmentId = appointment?._id || appointment?.id;
      const normalizedStatus = String(appointment?.status || '').trim().toLowerCase();

      return normalizedStatus === 'completed'
        && appointment?.rating == null
        && !dismissedReviewAppointmentIds.includes(appointmentId)
        && !temporarilyClosedReviewAppointmentIds.includes(appointmentId);
    }),
    [dismissedReviewAppointmentIds, pastAppointments, temporarilyClosedReviewAppointmentIds]
  );

  // Only sum prices of COMPLETED appointments for Total Spend metric
  const totalSpend = useMemo(
    () => completedAppointments.reduce((sum, appt) => sum + Number(appt?.totalAmount || 0), 0),
    [completedAppointments]
  );

  const nextAppointment = upcomingAppointments[0];
  const totalAppointments = appointments.length;
  const displayName = user?.name || 'there';
  const firstName = displayName.split(' ')[0];
  const handleRebook = (appointment) => {
    navigate('/book', {
      state: {
        rebookAppointment: appointment,
        startStep: 3
      }
    });
  };

  const handleConfirmCancel = async () => {
    if (!appointmentToCancel?._id && !appointmentToCancel?.id) return;

    setIsCancelling(true);

    try {
      const token = localStorage.getItem('token');
      const appointmentId = appointmentToCancel._id || appointmentToCancel.id;

      const response = await axios.delete(`${API_BASE_URL}/api/appointments/${appointmentId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      upsertAppointment({
        _id: appointmentId,
        id: appointmentId,
        ...(response.data?.appointment || {}),
        status: 'Cancelled'
      });
      setAppointmentToCancel(null);
      toast.success('Your premium session has been cancelled.');
    } catch (error) {
      console.error('Cancel Appointment Error:', error);
      toast.error(error.response?.data?.message || 'Unable to cancel this appointment right now.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleAppointmentUpdated = (updatedAppointment) => {
    if (!updatedAppointment?._id && !updatedAppointment?.id) return;

    upsertAppointment(updatedAppointment);
  };

  const markReviewPromptSeen = useCallback((appointmentId) => {
    if (!appointmentId) return;

    setDismissedReviewAppointmentIds((currentIds) => {
      const nextIds = Array.from(new Set([...currentIds, appointmentId]));
      saveDismissedReviewPromptIds(user, nextIds);
      return nextIds;
    });
  }, [user]);

  const temporarilyCloseReviewPrompt = useCallback((appointmentId) => {
    if (!appointmentId) return;

    setTemporarilyClosedReviewAppointmentIds((currentIds) => (
      Array.from(new Set([...currentIds, appointmentId]))
    ));
  }, []);

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl overflow-hidden bg-[#070707] text-white">
      <section className="min-w-0">
        <DashboardHeader
          firstName={firstName}
          nextAppointment={nextAppointment}
          formatDate={formatDate}
          onBook={() => navigate('/book')}
        />

        <div className="mb-10 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
          <div className="flex min-w-0 items-center gap-4 rounded-xl border-neutral-850 bg-[#111111] p-4 sm:gap-5 sm:p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] sm:h-12 sm:w-12">
              <DollarSign className="h-6 w-6" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">Total Spend</p>
              <p className="mt-2 break-words text-xl font-bold text-white sm:text-2xl">Rs. {isLoading ? '...' : totalSpend.toLocaleString()}</p>
              <p className="mt-1 text-sm text-neutral-400">All appointment payments</p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-4 rounded-xl border-neutral-850 bg-[#111111] p-4 sm:gap-5 sm:p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] sm:h-12 sm:w-12">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM21 20.5v-1.7a3.5 3.5 0 0 0-2.7-3.4M16 3.2a4 4 0 0 1 0 7.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">Total Visits</p>
              <p className="mt-2 text-2xl font-bold text-white">{isLoading ? '...' : completedAppointments.length}</p>
              <p className="mt-1 text-sm text-neutral-400">Completed visits</p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-4 rounded-xl border-neutral-850 bg-[#111111] p-4 sm:gap-5 sm:p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] sm:h-12 sm:w-12">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">Appointments</p>
              <p className="mt-2 text-2xl font-bold text-white">{isLoading ? '...' : totalAppointments}</p>
              <p className="mt-1 text-sm text-neutral-400">All time bookings</p>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-bold text-white">Upcoming Appointments</h2>

          <div className="mt-5 space-y-4">
            {isLoading ? (
              <div className="h-36 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]"></div>
            ) : upcomingAppointments.length > 0 ? (
              upcomingAppointments.slice(0, 2).map((appointment) => (
                <ActiveBookingCard
                  key={appointment._id || appointment.id}
                  appointment={appointment}
                  formatServices={formatServices}
                  formatDate={formatDate}
                  getStylistDisplayName={getStylistDisplayName}
                  statusClassName={statusClassName}
                  canCancelAppointment={canCancelAppointment}
                  onCancel={() => setAppointmentToCancel(appointment)}
                  onAppointmentUpdated={handleAppointmentUpdated}
                />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/15 bg-[#0d1117] p-8 text-center">
                <p className="font-semibold text-white">No upcoming appointments</p>
                <p className="mt-2 text-sm text-slate-500">Your next booking will show here.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-bold text-white">Past Appointments</h2>

          <div className="mt-5 space-y-4">
            {isLoading ? (
              [1, 2].map((row) => (
                <div key={row} className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]"></div>
              ))
            ) : pastAppointments.length > 0 ? (
              pastAppointments.slice(0, 3).map((appointment) => (
                <article
                  key={appointment._id || appointment.id}
                  className="flex min-w-0 flex-col gap-4 rounded-xl border border-white/10 bg-[#0d1117] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-semibold text-white sm:text-lg">{formatServices(appointment.services)}</h3>
                    <p className="mt-2 text-sm text-slate-400">
                      {formatDate(appointment.date)} &bull; {getStylistDisplayName(appointment)} &bull; <span className="font-medium">{appointment.status}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRebook(appointment)}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white transition hover:border-[#d4af37]/40 hover:text-[#d4af37] sm:w-fit"
                  >
                    Rebook
                  </button>
                </article>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/15 bg-[#0d1117] p-6 text-sm text-slate-500">
                Completed appointments will appear here.
              </div>
            )}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {appointmentToCancel && (
          <MotionDiv
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!isCancelling) setAppointmentToCancel(null);
            }}
          >
            <MotionDiv
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-session-title"
              className="w-full max-w-md border border-[#D4AF37]/35 bg-[#070707] p-6 shadow-2xl shadow-black/60 sm:p-7"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-[0.65rem] uppercase tracking-[0.38em] text-[#D4AF37]">Confirmation</p>
              <h3 id="cancel-session-title" className="mt-4 font-serif text-3xl text-white">
                Cancel Session?
              </h3>
              <p className="mt-4 text-sm leading-6 text-white/62">
                This action will release your reserved time slot. Are you certain you wish to proceed?
              </p>

              <div className="mt-7 rounded-xl border border-white/8 bg-white/[0.025] p-4">
                <p className="text-sm font-semibold text-white">{formatServices(appointmentToCancel.services)}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.22em] text-white/35">
                  {formatDate(appointmentToCancel.date)} • {appointmentToCancel.startTime || 'Time pending'}
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={() => setAppointmentToCancel(null)}
                  className="rounded-full border border-white/15 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/70 transition hover:border-[#D4AF37]/45 hover:text-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-50 sm:tracking-[0.24em]"
                >
                  No, Retain Booking
                </button>
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={handleConfirmCancel}
                  className="rounded-full border border-red-400/30 bg-red-500/15 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60 sm:tracking-[0.24em]"
                >
                  {isCancelling ? 'Cancelling...' : 'Yes, Cancel Session'}
                </button>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {pendingReviewAppointment && (
        <AppointmentReviewModal
          appointment={pendingReviewAppointment}
          user={user}
          onClose={() => temporarilyCloseReviewPrompt(pendingReviewAppointment._id || pendingReviewAppointment.id)}
          onDismissPermanently={() => markReviewPromptSeen(pendingReviewAppointment._id || pendingReviewAppointment.id)}
          onReviewSubmitted={(updatedAppointment) => {
            markReviewPromptSeen(pendingReviewAppointment._id || pendingReviewAppointment.id);
            handleAppointmentUpdated(updatedAppointment);
            fetchAppointments();
          }}
        />
      )}

    </div>
  );
}

export default Dashboard;
