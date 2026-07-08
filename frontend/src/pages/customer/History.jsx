import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { CalendarCheck, ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAppointments } from '../../context/useAppointments';
import API_BASE_URL from '../../utils/apiConfig';

const HISTORY_STATUSES = ['completed', 'rejected', 'cancelled', 'canceled', 'no-show'];
const HIDEABLE_HISTORY_STATUSES = ['completed', 'cancelled', 'canceled'];
const HERO_IMAGE_URL = '/heroBg.jpg';

const normalizeStatus = (status) => String(status || '').trim().toLowerCase();
const getAppointmentDateValue = (appointment) => appointment?.date || appointment?.bookingDate;
const CURRENT_YEAR = String(new Date().getFullYear());

const getAppointmentYear = (appointment) => {
  const parsedDate = new Date(getAppointmentDateValue(appointment));
  return Number.isNaN(parsedDate.getTime()) ? '' : String(parsedDate.getFullYear());
};

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
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === 'completed') return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300';
  if (['cancelled', 'canceled', 'rejected', 'no-show'].includes(normalizedStatus)) {
    return 'border-rose-400/20 bg-rose-400/10 text-rose-300';
  }
  return 'border-white/10 bg-white/5 text-slate-300';
};

const canHideFromHistory = (appointment) => (
  HIDEABLE_HISTORY_STATUSES.includes(normalizeStatus(appointment?.status))
);

const filterButtonClassName = (isActive) => (
  `inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
    isActive
      ? 'border-[#D4AF37] bg-[#D4AF37] text-black shadow-[0_12px_28px_rgba(212,175,55,0.22)]'
      : 'border-white/10 bg-white/[0.04] text-neutral-300 hover:border-[#d4af37]/25 hover:bg-white/[0.07] hover:text-white'
  }`
);

const filterCountClassName = (isActive) => (
  `shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${
    isActive
      ? 'bg-black/10 text-black'
      : 'bg-white/10 text-white/70'
  }`
);

function History() {
  const { appointments, replaceAppointments, upsertAppointment } = useAppointments();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [activeYear, setActiveYear] = useState(CURRENT_YEAR);
  const [isYearMenuOpen, setIsYearMenuOpen] = useState(false);
  const [hidingAppointmentIds, setHidingAppointmentIds] = useState([]);
  const yearMenuRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setErrorMessage('Please sign in to view your history.');
      setIsLoading(false);
      return;
    }

    const fetchAppointments = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/appointments`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const apiAppointments = Array.isArray(response.data) ? response.data : [];

        replaceAppointments(apiAppointments);
      } catch (error) {
        console.error('Error fetching history:', error);
        toast.error('Failed to load your history.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, [replaceAppointments]);

  const historyAppointments = useMemo(() => (
    appointments
      .filter((appt) => HISTORY_STATUSES.includes(normalizeStatus(appt.status)) && !appt.isHiddenByCustomer)
      .sort((a, b) => new Date(getAppointmentDateValue(b)).getTime() - new Date(getAppointmentDateValue(a)).getTime())
  ), [appointments]);

  const availableYears = useMemo(() => (
    Array.from(new Set(historyAppointments.map(getAppointmentYear).filter(Boolean)))
      .sort((a, b) => Number(b) - Number(a))
  ), [historyAppointments]);

  const yearOptions = useMemo(() => [
    { value: 'all', label: 'All years' },
    { value: CURRENT_YEAR, label: CURRENT_YEAR },
    ...availableYears
      .filter((year) => year !== CURRENT_YEAR)
      .map((year) => ({ value: year, label: year }))
  ], [availableYears]);

  const selectedYear = activeYear;
  const isYearFilterActive = Boolean(selectedYear && activeYear !== 'all');
  const activeYearLabel = yearOptions.find((option) => option.value === activeYear)?.label || CURRENT_YEAR;

  const completedCount = historyAppointments.filter((appt) => normalizeStatus(appt.status) === 'completed').length;
  const cancelledCount = historyAppointments.filter((appt) => ['cancelled', 'canceled'].includes(normalizeStatus(appt.status))).length;
  const rejectedCount = historyAppointments.filter((appt) => normalizeStatus(appt.status) === 'rejected').length;

  const filteredAppointments = useMemo(() => {
    return historyAppointments.filter((appt) => {
      const matchesStatus = !activeFilter || normalizeStatus(appt.status) === normalizeStatus(activeFilter);
      const matchesYear = !isYearFilterActive || getAppointmentYear(appt) === selectedYear;

      return matchesStatus && matchesYear;
    });
  }, [activeFilter, historyAppointments, isYearFilterActive, selectedYear]);

  const hasActiveFilters = Boolean(activeFilter || isYearFilterActive);

  const toggleFilter = (status) => {
    setActiveFilter((prev) => (prev === status ? '' : status));
  };

  const handleYearSelect = (year) => {
    setActiveYear(year);
    setIsYearMenuOpen(false);
  };

  const handleHideFromHistory = async (appointment) => {
    const appointmentId = appointment?._id || appointment?.id;
    if (!appointmentId || !canHideFromHistory(appointment) || hidingAppointmentIds.includes(appointmentId)) return;

    setHidingAppointmentIds((currentIds) => [...currentIds, appointmentId]);
    upsertAppointment({
      _id: appointmentId,
      id: appointmentId,
      isHiddenByCustomer: true
    });

    try {
      const token = localStorage.getItem('token');

      await axios.put(`${API_BASE_URL}/api/appointments/${appointmentId}/hide`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      toast.success('Appointment removed from your history.');
    } catch (error) {
      console.error('Hide Appointment Error:', error);
      upsertAppointment({
        _id: appointmentId,
        id: appointmentId,
        isHiddenByCustomer: false
      });
      toast.error(error.response?.data?.message || 'Unable to remove this appointment from history.');
    } finally {
      setHidingAppointmentIds((currentIds) => currentIds.filter((id) => id !== appointmentId));
    }
  };

  useEffect(() => {
    if (!isYearMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (yearMenuRef.current && !yearMenuRef.current.contains(event.target)) {
        setIsYearMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsYearMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isYearMenuOpen]);

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

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div ref={yearMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsYearMenuOpen((current) => !current)}
                className="relative flex min-h-10 w-full items-center justify-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 pr-10 text-sm font-semibold text-neutral-300 transition hover:border-[#d4af37]/30 hover:bg-white/[0.07] hover:text-white focus:border-[#d4af37]/30 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/15 sm:w-auto"
                aria-haspopup="listbox"
                aria-expanded={isYearMenuOpen}
              >
                <CalendarCheck size={16} className="text-[#d4af37]" />
                <span className="truncate">{activeYearLabel}</span>
                <ChevronDown size={16} className={`absolute right-4 transition-transform ${isYearMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isYearMenuOpen && (
                <div
                  className="absolute left-0 top-full z-30 mt-2 max-h-52 w-full min-w-40 overflow-y-auto rounded-xl border border-white/10 bg-[#111]/95 p-1.5 shadow-2xl backdrop-blur-xl sm:w-40"
                  role="listbox"
                  aria-label="Filter history by year"
                >
                  {yearOptions.map((option) => {
                    const isSelected = option.value === activeYear;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleYearSelect(option.value)}
                        className={`w-full rounded-lg px-3.5 py-2.5 text-left text-sm font-medium transition ${
                          isSelected
                            ? 'bg-[#d4af37]/12 text-[#f3d878]'
                            : 'text-neutral-400 hover:bg-white/[0.07] hover:text-white'
                        }`}
                        role="option"
                        aria-selected={isSelected}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:items-center sm:justify-end sm:overflow-visible sm:px-0 sm:pb-0">
              <button
                type="button"
                onClick={() => setActiveFilter('')}
                className={filterButtonClassName(!activeFilter)}
              >
                <span className="truncate">All</span>
                <span className={filterCountClassName(!activeFilter)}>{historyAppointments.length}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleFilter('Completed')}
                className={filterButtonClassName(activeFilter === 'Completed')}
              >
                <span className="truncate">Completed</span>
                <span className={filterCountClassName(activeFilter === 'Completed')}>{completedCount}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleFilter('Cancelled')}
                className={filterButtonClassName(activeFilter === 'Cancelled')}
              >
                <span className="truncate">Cancelled</span>
                <span className={filterCountClassName(activeFilter === 'Cancelled')}>{cancelledCount}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleFilter('Rejected')}
                className={filterButtonClassName(activeFilter === 'Rejected')}
              >
                <span className="truncate">Rejected</span>
                <span className={filterCountClassName(activeFilter === 'Rejected')}>{rejectedCount}</span>
              </button>
            </div>
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
                      {formatDate(getAppointmentDateValue(appt))} &bull; {appt.startTime || 'Time pending'}
                      {appt.endTime ? ` - ${appt.endTime}` : ''}
                    </p>
                    <p className="mt-1 break-words text-xs text-slate-500">
                      Stylist: {appt.stylist?.name || appt.staffId?.name || appt.stylistName || 'Stylist not available'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 md:justify-end">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClassName(appt.status)}`}>
                      {appt.status}
                    </span>
                    <span className="text-sm font-semibold text-[#d4af37]">Rs. {appt.totalAmount || 0}</span>
                    {canHideFromHistory(appt) && (
                      <button
                        type="button"
                        onClick={() => handleHideFromHistory(appt)}
                        disabled={hidingAppointmentIds.includes(appt._id || appt.id)}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-red-300/30 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {hidingAppointmentIds.includes(appt._id || appt.id) ? 'Removing...' : 'Remove from History'}
                      </button>
                    )}
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
