import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { CalendarCheck, CalendarPlus, ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';
import AddAppointmentModal from '../../components/admin/AddAppointmentModal';
import { DarkSelect, GoldButton, StatusBadge } from '../../components/admin/SystemUI';
import API_BASE_URL from '../../utils/apiConfig';

const finalStatuses = ['Completed', 'Rejected', 'Cancelled', 'No-Show'];
const PENDING_APPOINTMENTS_REFRESH_EVENT = 'appointments:pending-count-refresh';
const CURRENT_DATE = new Date();
const CURRENT_YEAR = String(CURRENT_DATE.getFullYear());
const CURRENT_MONTH = String(CURRENT_DATE.getMonth());
const MONTH_OPTIONS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
].map((label, index) => ({ value: String(index), label }));

const getStatusSortGroup = (status) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (normalizedStatus === 'in progress') return 0;
  if (['scheduled', 'pending'].includes(normalizedStatus)) return 1;
  if (['confirmed', 'approved'].includes(normalizedStatus)) return 2;
  if (['completed', 'cancelled', 'canceled', 'rejected', 'no-show'].includes(normalizedStatus)) return 3;

  return 4;
};

const timeTo24Hour = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return { hours: 0, minutes: 0 };

  const parts = timeStr.trim().split(' ');
  if (parts.length < 2) return { hours: 0, minutes: 0 };

  const [time, modifier] = parts;
  const [rawHours, rawMinutes] = time.split(':').map(Number);

  if (Number.isNaN(rawHours) || Number.isNaN(rawMinutes)) return { hours: 0, minutes: 0 };

  let hours = rawHours;
  if (hours === 12) hours = 0;
  if (modifier === 'PM') hours += 12;

  return { hours, minutes: rawMinutes };
};

const getAppointmentDateTime = (appointmentDate, appointmentTime) => {
  if (!appointmentDate || !appointmentTime) return null;

  const [year, month, day] = String(appointmentDate).split('-').map(Number);
  if ([year, month, day].some(Number.isNaN)) return null;

  const { hours, minutes } = timeTo24Hour(appointmentTime);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

const getAppointmentDateValue = (appointment) => appointment?.date || appointment?.bookingDate;

const getAppointmentDateParts = (appointment) => {
  const parsedDate = new Date(getAppointmentDateValue(appointment));
  if (Number.isNaN(parsedDate.getTime())) return { year: '', month: '' };

  return {
    year: String(parsedDate.getFullYear()),
    month: String(parsedDate.getMonth())
  };
};

const getAppointmentTimeStamp = (appointment) => {
  if (!appointment?.date) return 0;

  const dateKey = String(appointment.date).slice(0, 10);
  const [year, month, day] = dateKey.split('-').map(Number);
  if ([year, month, day].some(Number.isNaN)) return 0;

  const { hours, minutes } = timeTo24Hour(appointment.startTime || appointment.time);
  return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
};

const getAppointmentSortGroup = (appointment) => {
  const status = String(appointment?.status || '').trim().toLowerCase();
  const startTimeStamp = getAppointmentTimeStamp(appointment);
  const endTimeStamp = appointment?.endTime
    ? getAppointmentTimeStamp({ ...appointment, startTime: appointment.endTime })
    : 0;
  const hasStarted = startTimeStamp > 0 && startTimeStamp <= Date.now();
  const hasEnded = endTimeStamp > 0 && endTimeStamp <= Date.now();

  if (['approved', 'confirmed'].includes(status) && hasStarted && !hasEnded) {
    return 0;
  }

  return getStatusSortGroup(status);
};

const sortAppointmentsByPriority = (a, b) => {
  const priorityDifference = getAppointmentSortGroup(a) - getAppointmentSortGroup(b);
  if (priorityDifference !== 0) return priorityDifference;

  return getAppointmentTimeStamp(b) - getAppointmentTimeStamp(a);
};

function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Pending');
  const [activeYear, setActiveYear] = useState(CURRENT_YEAR);
  const [activeMonth, setActiveMonth] = useState(CURRENT_MONTH);
  const [isYearMenuOpen, setIsYearMenuOpen] = useState(false);
  const [isMonthMenuOpen, setIsMonthMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState('');
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const yearMenuRef = useRef(null);
  const monthMenuRef = useRef(null);
  const mobileYearMenuRef = useRef(null);
  const mobileMonthMenuRef = useRef(null);
  const userRole = localStorage.getItem('userRole') || 'customer';
  const isAdmin = userRole === 'admin';

  const isWithinNoShowWindow = (appointment) => {
    const scheduledStart = getAppointmentDateTime(appointment.date, appointment.startTime);
    if (!scheduledStart) return false;

    const startTime = scheduledStart.getTime();
    const noShowWindowEnd = startTime + 30 * 60 * 1000;
    const now = currentTime.getTime();

    return now >= startTime && now <= noShowWindowEnd;
  };

  const canCompleteAppointment = (appointment) => {
    const scheduledEnd = getAppointmentDateTime(appointment.date, appointment.endTime);
    if (!scheduledEnd) return false;

    return currentTime.getTime() >= scheduledEnd.getTime() - 10 * 60 * 1000;
  };

  const getAllowedStatuses = (appointment) => {
    const currentStatus = appointment.status;

    if (finalStatuses.includes(currentStatus)) return [currentStatus];
    if (!isAdmin) {
      if (currentStatus === 'Pending') {
        return ['Pending', 'Approved', 'Rejected'];
      }
      if (currentStatus === 'Approved') {
        const options = ['Approved'];
        if (isWithinNoShowWindow(appointment)) options.push('No-Show');
        if (canCompleteAppointment(appointment)) options.push('Completed');
        return options;
      }
      return [currentStatus];
    }

    if (currentStatus === 'Pending') return ['Pending', 'Approved', 'Rejected'];
    if (currentStatus === 'Approved') {
      const options = ['Approved'];
      if (isWithinNoShowWindow(appointment)) options.push('No-Show');
      if (canCompleteAppointment(appointment)) options.push('Completed');
      return options;
    }

    return [currentStatus];
  };

  const fetchAppointments = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in again to load appointments.');
        return;
      }

      const endpoint = isAdmin
        ? `${API_BASE_URL}/api/appointments/all`
        : `${API_BASE_URL}/api/appointments/staff-schedule`;

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppointments(response.data);
    } catch (error) {
      console.error('Error fetching all appointments:', error);
      const message = error.response?.status === 401
        ? 'You are not authorized to view these appointments.'
        : 'Could not load appointments right now.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isYearMenuOpen && !isMonthMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      const isInsideYearMenu = [yearMenuRef, mobileYearMenuRef].some((ref) => (
        ref.current && ref.current.contains(event.target)
      ));
      const isInsideMonthMenu = [monthMenuRef, mobileMonthMenuRef].some((ref) => (
        ref.current && ref.current.contains(event.target)
      ));

      if (!isInsideYearMenu) {
        setIsYearMenuOpen(false);
      }
      if (!isInsideMonthMenu) {
        setIsMonthMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsYearMenuOpen(false);
        setIsMonthMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMonthMenuOpen, isYearMenuOpen]);

  const handleAppointmentCreated = (appointment) => {
    if (appointment) {
      setAppointments((current) => [appointment, ...current]);
    }

    fetchAppointments();
  };

  const handleStatusChange = async (id, newStatus) => {
    if (updatingAppointmentId) return;

    try {
      const selectedAppointment = appointments.find((appt) => appt._id === id);
      if (!selectedAppointment) return;

      const allowedStatuses = getAllowedStatuses(selectedAppointment);
      if (!allowedStatuses.includes(newStatus)) {
        toast.error('This status transition is not allowed.');
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in again to update appointment status.');
        return;
      }

      setUpdatingAppointmentId(id);

      const statusEndpoint = isAdmin
        ? `${API_BASE_URL}/api/appointments/${id}/status`
        : `${API_BASE_URL}/api/appointments/${id}/staff-status`;

      await axios.put(
        statusEndpoint,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAppointments((current) =>
        current.map((appt) => (appt._id === id ? { ...appt, status: newStatus } : appt))
      );
      window.dispatchEvent(new Event(PENDING_APPOINTMENTS_REFRESH_EVENT));

      toast.success(`Status changed to "${newStatus}" successfully!`);
    } catch (error) {
      console.error('Status Update Error:', error);
      toast.error('Oops! Failed to update the appointment status.');
    } finally {
      setUpdatingAppointmentId('');
    }
  };

  const availableYears = useMemo(() => (
    Array.from(new Set(appointments.map((appt) => getAppointmentDateParts(appt).year).filter(Boolean)))
      .sort((firstYear, secondYear) => Number(secondYear) - Number(firstYear))
  ), [appointments]);

  const yearOptions = useMemo(() => [
    { value: 'all', label: 'All years' },
    { value: CURRENT_YEAR, label: CURRENT_YEAR },
    ...availableYears
      .filter((year) => year !== CURRENT_YEAR)
      .map((year) => ({ value: year, label: year }))
  ], [availableYears]);

  const monthOptions = useMemo(() => [
    { value: 'all', label: 'All months' },
    ...MONTH_OPTIONS
  ], []);

  const activeYearLabel = yearOptions.find((option) => option.value === activeYear)?.label || CURRENT_YEAR;
  const activeMonthLabel = monthOptions.find((option) => option.value === activeMonth)?.label || MONTH_OPTIONS[Number(CURRENT_MONTH)].label;

  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return appointments
      .filter((appt) => {
        const appointmentDateParts = getAppointmentDateParts(appt);
        const statusMatches = activeTab === 'All' ? true : appt.status?.toLowerCase() === activeTab?.toLowerCase();
        const yearMatches = activeYear === 'all' || appointmentDateParts.year === activeYear;
        const monthMatches = activeMonth === 'all' || appointmentDateParts.month === activeMonth;

        const customerName = appt.user?.name || '';
        const customerPhone = appt.user?.phone || appt.user?.phoneNumber || '';
        const services = appt.services?.map((service) => service.name || service).join(', ') || appt.service || '';
        const searchMatches = !query || [customerName, customerPhone, services, appt.status, appt.startTime, appt.endTime]
          .join(' ')
          .toLowerCase()
          .includes(query);

        return statusMatches && yearMatches && monthMatches && searchMatches;
      })
      .sort(sortAppointmentsByPriority);
  }, [appointments, activeTab, activeMonth, activeYear, searchQuery]);

  const tabs = isAdmin
    ? ['Pending', 'Approved', 'Completed', 'Rejected', 'No-Show', 'All']
    : ['Pending', 'Approved', 'Completed', 'Rejected', 'No-Show', 'All'];

  const getServicesLabel = (appointment) => (
    appointment.services && appointment.services.length > 0
      ? appointment.services.map((service) => service.name || service).join(', ')
      : appointment.service || 'N/A'
  );

  const getTimeLabel = (appointment) => (
    appointment.startTime
      ? `${appointment.startTime}${appointment.endTime ? ` - ${appointment.endTime}` : ''}`
      : appointment.time
  );

  const renderMobileActions = (appointment) => {
    const allowedStatuses = getAllowedStatuses(appointment).filter((status) => status !== appointment.status);
    const isUpdating = updatingAppointmentId === appointment._id;

    if (allowedStatuses.length === 0) {
      return (
        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-gray-400">
          No further actions available
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
        {allowedStatuses.includes('Approved') && (
          <GoldButton
            type="button"
            onClick={() => handleStatusChange(appointment._id, 'Approved')}
            disabled={isUpdating}
            className="w-full rounded-lg px-4 py-2 text-sm sm:w-auto"
          >
            {isUpdating ? 'Updating...' : 'Accept'}
          </GoldButton>
        )}
        {allowedStatuses.includes('Rejected') && (
          <GoldButton
            type="button"
            variant="ghost"
            onClick={() => handleStatusChange(appointment._id, 'Rejected')}
            disabled={isUpdating}
            className="w-full rounded-lg border border-red-900/50 bg-[#1a1a1a] px-4 py-2 text-sm text-red-400 hover:border-transparent hover:bg-red-900/80 hover:text-white sm:w-auto"
          >
            {isUpdating ? 'Updating...' : 'Reject'}
          </GoldButton>
        )}
        {allowedStatuses.includes('Completed') && (
          <GoldButton
            type="button"
            onClick={() => handleStatusChange(appointment._id, 'Completed')}
            disabled={isUpdating}
            className="w-full rounded-lg px-4 py-2 text-sm sm:w-auto"
          >
            {isUpdating ? 'Updating...' : 'Complete'}
          </GoldButton>
        )}
        {allowedStatuses.includes('No-Show') && (
          <GoldButton
            type="button"
            variant="ghost"
            onClick={() => handleStatusChange(appointment._id, 'No-Show')}
            disabled={isUpdating}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2 text-sm text-gray-300 hover:border-[#d4af37]/40 hover:text-[#d4af37] sm:w-auto"
          >
            {isUpdating ? 'Updating...' : 'No-Show'}
          </GoldButton>
        )}
        {allowedStatuses.includes('Pending') && (
          <GoldButton
            type="button"
            variant="ghost"
            onClick={() => handleStatusChange(appointment._id, 'Pending')}
            disabled={isUpdating}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2 text-sm text-gray-300 hover:border-[#d4af37]/40 hover:text-[#d4af37] sm:w-auto"
          >
            {isUpdating ? 'Updating...' : 'Mark Pending'}
          </GoldButton>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-0">
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-white sm:text-4xl">Appointments</h1>
          <p className="mt-3 text-sm leading-6 text-gray-400 sm:text-base">
            Review bookings, refine the queue, and update customer appointment status.
          </p>
        </div>

        {isAdmin && (
          <GoldButton
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-5 py-3 font-bold sm:w-fit"
          >
            <CalendarPlus className="h-5 w-5" />
            Quick Book
          </GoldButton>
        )}
      </header>

      <AddAppointmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        appointments={appointments}
        onCreated={handleAppointmentCreated}
      />

      <section className="rounded-2xl border border-white/10 bg-[#111111]/70 p-3 shadow-xl backdrop-blur-md sm:p-6">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-5 sm:gap-6 sm:pb-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:hidden">
            <div ref={mobileYearMenuRef} className="relative min-w-0">
              <button
                type="button"
                onClick={() => {
                  setIsYearMenuOpen((current) => !current);
                  setIsMonthMenuOpen(false);
                }}
                className="relative flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 pr-8 text-sm font-semibold text-neutral-300 transition hover:border-[#d4af37]/30 hover:bg-white/[0.07] hover:text-white focus:border-[#d4af37]/30 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/15"
                aria-haspopup="listbox"
                aria-expanded={isYearMenuOpen}
                aria-label="Filter appointments by year"
              >
                <CalendarCheck size={15} className="shrink-0 text-[#d4af37]" />
                <span className="truncate">{activeYearLabel}</span>
                <ChevronDown size={15} className={`absolute right-3 transition-transform ${isYearMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isYearMenuOpen && (
                <div
                  className="absolute left-0 top-full z-30 mt-2 max-h-52 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#111]/95 p-1.5 shadow-2xl backdrop-blur-xl"
                  role="listbox"
                  aria-label="Filter appointments by year"
                >
                  {yearOptions.map((option) => {
                    const isSelected = option.value === activeYear;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setActiveYear(option.value);
                          setIsYearMenuOpen(false);
                        }}
                        className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
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

            <div ref={mobileMonthMenuRef} className="relative min-w-0">
              <button
                type="button"
                onClick={() => {
                  setIsMonthMenuOpen((current) => !current);
                  setIsYearMenuOpen(false);
                }}
                className="relative flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 pr-8 text-sm font-semibold text-neutral-300 transition hover:border-[#d4af37]/30 hover:bg-white/[0.07] hover:text-white focus:border-[#d4af37]/30 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/15"
                aria-haspopup="listbox"
                aria-expanded={isMonthMenuOpen}
                aria-label="Filter appointments by month"
              >
                <CalendarCheck size={15} className="shrink-0 text-[#d4af37]" />
                <span className="truncate">{activeMonthLabel}</span>
                <ChevronDown size={15} className={`absolute right-3 transition-transform ${isMonthMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMonthMenuOpen && (
                <div
                  className="absolute left-0 top-full z-30 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#111]/95 p-1.5 shadow-2xl backdrop-blur-xl"
                  role="listbox"
                  aria-label="Filter appointments by month"
                >
                  {monthOptions.map((option) => {
                    const isSelected = option.value === activeMonth;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setActiveMonth(option.value);
                          setIsMonthMenuOpen(false);
                        }}
                        className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
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
          </div>

          <div className="salon-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition sm:px-4 ${
                  activeTab === tab
                    ? 'bg-[#d4af37] text-black shadow-[0_0_10px_rgba(212,175,55,0.28)]'
                    : 'border border-gray-700 bg-transparent text-gray-300 hover:border-[#d4af37]/50 hover:text-[#d4af37]'
                }`}
              >
                <span>{tab}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                  activeTab === tab ? 'bg-black/10 text-black' : 'bg-white/10 text-gray-300'
                }`}>
                  {tab === 'All' ? appointments.length : appointments.filter((appt) => appt.status?.toLowerCase() === tab?.toLowerCase()).length}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:shrink-0 xl:justify-end">
            <div className="relative w-full sm:w-auto">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m21 21-4.35-4.35M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <input
                type="text"
                aria-label="Search appointments by customer, phone, service, status, or time"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search appointments"
                className="h-11 w-full rounded-full border border-white/10 bg-[#0a0a0a]/80 py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-[#d4af37] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/20 sm:w-[260px]"
              />
            </div>

            <div ref={yearMenuRef} className="relative hidden w-full sm:block sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setIsYearMenuOpen((current) => !current);
                  setIsMonthMenuOpen(false);
                }}
                className="relative flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 pr-10 text-sm font-semibold text-neutral-300 transition hover:border-[#d4af37]/30 hover:bg-white/[0.07] hover:text-white focus:border-[#d4af37]/30 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/15 sm:w-40"
                aria-haspopup="listbox"
                aria-expanded={isYearMenuOpen}
                aria-label="Filter appointments by year"
              >
                <CalendarCheck size={16} className="shrink-0 text-[#d4af37]" />
                <span className="truncate">{activeYearLabel}</span>
                <ChevronDown size={16} className={`absolute right-4 transition-transform ${isYearMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isYearMenuOpen && (
                <div
                  className="absolute left-0 top-full z-30 mt-2 max-h-52 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#111]/95 p-1.5 shadow-2xl backdrop-blur-xl sm:w-40"
                  role="listbox"
                  aria-label="Filter appointments by year"
                >
                  {yearOptions.map((option) => {
                    const isSelected = option.value === activeYear;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setActiveYear(option.value);
                          setIsYearMenuOpen(false);
                        }}
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

            <div ref={monthMenuRef} className="relative hidden w-full sm:block sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setIsMonthMenuOpen((current) => !current);
                  setIsYearMenuOpen(false);
                }}
                className="relative flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 pr-10 text-sm font-semibold text-neutral-300 transition hover:border-[#d4af37]/30 hover:bg-white/[0.07] hover:text-white focus:border-[#d4af37]/30 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/15 sm:w-44"
                aria-haspopup="listbox"
                aria-expanded={isMonthMenuOpen}
                aria-label="Filter appointments by month"
              >
                <CalendarCheck size={16} className="shrink-0 text-[#d4af37]" />
                <span className="truncate">{activeMonthLabel}</span>
                <ChevronDown size={16} className={`absolute right-4 transition-transform ${isMonthMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMonthMenuOpen && (
                <div
                  className="absolute left-0 top-full z-30 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#111]/95 p-1.5 shadow-2xl backdrop-blur-xl sm:w-44"
                  role="listbox"
                  aria-label="Filter appointments by month"
                >
                  {monthOptions.map((option) => {
                    const isSelected = option.value === activeMonth;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setActiveMonth(option.value);
                          setIsMonthMenuOpen(false);
                        }}
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
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 pt-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-white/10 bg-[#0a0a0a]/50 p-5">
                <div className="h-4 w-24 animate-pulse rounded bg-white/10"></div>
                <div className="mt-4 h-5 w-40 animate-pulse rounded bg-white/10"></div>
                <div className="mt-2 h-4 w-32 animate-pulse rounded bg-white/10"></div>
                <div className="mt-5 h-10 animate-pulse rounded-lg bg-white/10"></div>
              </div>
            ))}
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m21 21-4.35-4.35M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8.5 8.5h5M8.5 11.5h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <p className="mt-5 text-lg font-semibold text-white">No appointments match these filters.</p>
            <p className="mt-2 text-sm text-gray-400">Try a different status, date range, or search term to broaden the results.</p>
          </div>
        ) : (
          <div className="salon-scrollbar max-h-none overflow-visible pt-5 sm:pt-6 md:max-h-[520px] md:overflow-y-auto">
            <div className="space-y-3 md:hidden">
              {filteredAppointments.map((appt) => {
                const customerPhone = appt.user?.phone || appt.user?.phoneNumber;
                const customerName = appt.user?.name || 'Unknown User';

                return (
                  <div
                    key={appt._id}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#111111]/70 p-3.5 backdrop-blur-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-base font-semibold text-white">{customerName}</p>
                        <p className="mt-1 text-sm text-gray-400">{new Date(appt.date).toLocaleDateString()}</p>
                      </div>
                      <div className="shrink-0">
                        <StatusBadge status={appt.status} />
                      </div>
                    </div>

                    <div className="grid gap-2 rounded-xl border border-white/5 bg-black/15 p-3">
                      <p className="text-sm">
                        <span className="text-gray-400">Phone:</span>{' '}
                        <span className="break-words text-white">{customerPhone || 'No phone provided'}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-400">Service:</span>{' '}
                        <span className="break-words text-white">{getServicesLabel(appt)}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-400">Time:</span>{' '}
                        <span className="text-white">{getTimeLabel(appt)}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-400">Status:</span>{' '}
                        <span className="text-white">{appt.status}</span>
                      </p>
                    </div>

                    <div className="border-t border-white/10 pt-3">
                      <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[#d4af37]">Actions</p>
                      {renderMobileActions(appt)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="salon-table">
                <thead className="sticky top-0 bg-[#0a0a0a]/90">
                  <tr>
                    <th className="salon-table-th font-bold tracking-[0.16em] text-[#d4af37]">Customer</th>
                    <th className="salon-table-th font-bold tracking-[0.16em] text-[#d4af37]">Service</th>
                    <th className="salon-table-th font-bold tracking-[0.16em] text-[#d4af37]">Date & Time</th>
                    <th className="salon-table-th font-bold tracking-[0.16em] text-[#d4af37]">Status</th>
                    <th className="salon-table-th font-bold tracking-[0.16em] text-[#d4af37]">Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAppointments.map((appt) => {
                    const customerPhone = appt.user?.phone || appt.user?.phoneNumber;
                    const isStatusLocked = finalStatuses.includes(appt.status);
                    const isUpdating = updatingAppointmentId === appt._id;
                    const allowedStatuses = getAllowedStatuses(appt);
                    const customerName = appt.user ? appt.user.name : 'Unknown User';

                    return (
                      <tr key={appt._id} className={`transition hover:bg-white/5 ${appt.status === 'Pending' ? 'bg-yellow-950/10' : ''}`}>
                        <td className="salon-table-td">
                          <div className="font-semibold text-gray-100">{customerName}</div>
                          {customerPhone ? (
                            <a href={`tel:${customerPhone}`} className="mt-1 block text-xs text-gray-400 hover:text-[#d4af37]">
                              Phone: {customerPhone}
                            </a>
                          ) : (
                            <span className="mt-1 block text-xs text-gray-500">No phone provided</span>
                          )}
                        </td>
                        <td className="salon-table-td text-sm text-gray-300">
                          {getServicesLabel(appt)}
                        </td>
                        <td className="salon-table-td">
                          <div className="text-sm font-semibold text-gray-200">{new Date(appt.date).toLocaleDateString()}</div>
                          <div className="mt-1 text-xs text-gray-400">
                            {getTimeLabel(appt)}
                          </div>
                        </td>
                        <td className="salon-table-td">
                          <StatusBadge status={appt.status} />
                        </td>
                        <td className="salon-table-td">
                          <DarkSelect
                            aria-label={`Update appointment status for ${customerName}`}
                            value={appt.status}
                            disabled={isStatusLocked || isUpdating}
                            onChange={(e) => handleStatusChange(appt._id, e.target.value)}
                            className={`w-full min-w-[170px] rounded-lg px-3 py-2 text-sm font-medium ${
                              isStatusLocked || isUpdating
                                ? 'cursor-not-allowed border-white/10 bg-gray-800 text-gray-500'
                                : 'border-white/20 bg-[#0a0a0a]/80 text-gray-200 hover:border-[#d4af37]/50 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20'
                            }`}
                          >
                            {allowedStatuses.map((statusOption) => (
                              <option key={statusOption} value={statusOption}>
                                {statusOption}
                              </option>
                            ))}
                          </DarkSelect>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default AppointmentsPage;
