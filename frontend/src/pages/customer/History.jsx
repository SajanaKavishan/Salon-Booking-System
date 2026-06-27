import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAppointments } from '../../context/AppointmentsContext';

const HISTORY_STATUSES = ['Completed', 'Rejected', 'Cancelled', 'No-Show'];
const HERO_IMAGE_URL = '/heroBg.jpg';

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
  if (status === 'Completed') return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300';
  if (status === 'Cancelled' || status === 'Rejected' || status === 'No-Show') {
    return 'border-rose-400/20 bg-rose-400/10 text-rose-300';
  }
  return 'border-white/10 bg-white/5 text-slate-300';
};

function History() {
  const { appointments, setAppointments } = useAppointments();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setErrorMessage('Please sign in to view your history.');
      setIsLoading(false);
      return;
    }

    const fetchAppointments = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/appointments', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const apiAppointments = Array.isArray(response.data) ? response.data : [];
        
        // Merge API appointments with context appointments (avoid duplicates)
        const appointmentIds = new Set(apiAppointments.map((a) => a._id || a.id));
        const contextOnlyAppointments = appointments.filter((a) => !appointmentIds.has(a._id || a.id));
        const mergedAppointments = [...apiAppointments, ...contextOnlyAppointments];
        
        setAppointments(mergedAppointments);
      } catch (error) {
        console.error('Error fetching history:', error);
        toast.error('Failed to load your history.');
        // If API fails, we still have context appointments available
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const historyAppointments = useMemo(() => (
    appointments
      .filter((appt) => HISTORY_STATUSES.includes(appt.status) && !appt.isHiddenByCustomer)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  ), [appointments]);

  const completedCount = historyAppointments.filter((appt) => appt.status === 'Completed').length;
  const cancelledCount = historyAppointments.filter((appt) => appt.status === 'Cancelled').length;
  const rejectedCount = historyAppointments.filter((appt) => appt.status === 'Rejected').length;

  const filteredAppointments = useMemo(() => {
    if (!activeFilter) return historyAppointments;
    return historyAppointments.filter((appt) => appt.status === activeFilter);
  }, [activeFilter, historyAppointments]);

  const hasActiveFilters = Boolean(activeFilter);

  const toggleFilter = (status) => {
    setActiveFilter((prev) => (prev === status ? '' : status));
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl overflow-hidden bg-[#070707] text-white">
      <section className="min-w-0 space-y-8">
        <div className="relative w-full overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-r from-[#0a0a0a] via-[#111111] to-[#1a170c] p-5 shadow-2xl shadow-black/30 sm:p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(212,175,55,0.45) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
              maskImage: 'linear-gradient(90deg, black 0%, transparent 40%)',
              WebkitMaskImage: 'linear-gradient(90deg, black 0%, transparent 40%)'
            }}
          ></div>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-[58%] bg-cover bg-center opacity-50 md:block"
            style={{ backgroundImage: `url("${HERO_IMAGE_URL}")` }}
          ></div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/95 via-45% to-[#0a0a0a]/42"></div>

          <div className="relative flex min-w-0 flex-col gap-4">
            <h1 className="break-words font-serif text-2xl text-white sm:text-3xl">Your recent visits & outcomes</h1>
            <p className="text-sm text-white/60">
              Review completed services, track totals, and revisit your favorite sessions.
            </p>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
          <div className="flex min-w-0 items-center gap-4 rounded-xl border-neutral-850 bg-[#111111] p-4 sm:gap-5 sm:p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] sm:h-12 sm:w-12">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM21 20.5v-1.7a3.5 3.5 0 0 0-2.7-3.4M16 3.2a4 4 0 0 1 0 7.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">Total visits</p>
              <p className="mt-2 text-2xl font-bold text-white">{isLoading ? '...' : historyAppointments.length}</p>
              <p className="mt-1 text-sm text-neutral-400">Your completed and closed sessions</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-4 rounded-xl border-neutral-850 bg-[#111111] p-4 sm:gap-5 sm:p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] sm:h-12 sm:w-12">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M7 12l3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 3a9 9 0 1 0 0 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">Completed</p>
              <p className="mt-2 text-2xl font-bold text-white">{isLoading ? '...' : completedCount}</p>
              <p className="mt-1 text-sm text-neutral-400">Successful visits</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-4 rounded-xl border-neutral-850 bg-[#111111] p-4 sm:gap-5 sm:p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] sm:h-12 sm:w-12">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 3a9 9 0 1 0 0 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">Cancelled</p>
              <p className="mt-2 text-2xl font-bold text-white">{isLoading ? '...' : cancelledCount}</p>
              <p className="mt-1 text-sm text-neutral-400">Closed without service</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111111] p-4 shadow-xl sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-serif text-white">Visit timeline</h2>
            <span className="text-xs uppercase tracking-[0.18em] text-white/40 sm:tracking-[0.3em]">{filteredAppointments.length} entries</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => toggleFilter('Completed')}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                activeFilter === 'Completed'
                  ? 'border-amber-400/20 bg-amber-400/10 text-amber-300'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
              }`}
            >
              Completed
              <span className="text-[10px] opacity-70">{completedCount}</span>
            </button>
            <button
              type="button"
              onClick={() => toggleFilter('Cancelled')}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                activeFilter === 'Cancelled'
                  ? 'border-amber-400/20 bg-amber-400/10 text-amber-300'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
              }`}
            >
              Cancelled
              <span className="text-[10px] opacity-70">{cancelledCount}</span>
            </button>
            <button
              type="button"
              onClick={() => toggleFilter('Rejected')}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                activeFilter === 'Rejected'
                  ? 'border-amber-400/20 bg-amber-400/10 text-amber-300'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
              }`}
            >
              Rejected
              <span className="text-[10px] opacity-70">{rejectedCount}</span>
            </button>
          </div>

          {isLoading ? (
            <div className="mt-6 space-y-3">
              {[1, 2, 3].map((row) => (
                <div key={row} className="h-20 rounded-xl bg-white/5 animate-pulse"></div>
              ))}
            </div>
          ) : errorMessage ? (
            <p className="mt-6 text-sm text-white/60">{errorMessage}</p>
          ) : filteredAppointments.length === 0 ? (
            <p className="mt-6 text-sm text-white/60">
              {hasActiveFilters ? 'No appointments match these filters.' : 'No past appointments yet.'}
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {filteredAppointments.map((appt) => (
                <article
                  key={appt._id || appt.id}
                  className="flex min-w-0 flex-col gap-4 rounded-xl border border-white/10 bg-[#0d1117] p-4 shadow-sm md:flex-row md:items-center md:justify-between md:p-5"
                >
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-semibold text-white">
                      {formatServices(appt.services)}
                    </h3>
                    <p className="mt-2 break-words text-sm text-slate-400">
                      {formatDate(appt.date)} &bull; {appt.startTime || 'Time pending'}
                      {appt.endTime ? ` - ${appt.endTime}` : ''}
                    </p>
                    <p className="mt-1 break-words text-xs text-slate-500">
                      Stylist: {appt.stylist?.name || 'Stylist not available'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 md:justify-end">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClassName(appt.status)}`}>
                      {appt.status}
                    </span>
                    <span className="text-sm font-semibold text-[#d4af37]">Rs. {appt.totalAmount || 0}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

export default History;
