import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { DollarSign, RefreshCw } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { GoldButton, StatusBadge } from '../../components/admin/SystemUI';
import API_BASE_URL from '../../utils/apiConfig';
import { getStoredSession } from '../../utils/auth';

const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;

  const parts = timeStr.trim().split(/\s+/);

  const [time, modifier] = parts;
  const [rawHours, rawMinutes] = time.split(':').map(Number);

  if (Number.isNaN(rawHours) || Number.isNaN(rawMinutes)) return 0;

  let hours = rawHours;
  const normalizedModifier = String(modifier || '').toUpperCase();

  if (normalizedModifier) {
    if (hours === 12) hours = 0;
    if (normalizedModifier === 'PM') hours += 12;
  }

  return hours * 60 + rawMinutes;
};

const buildAppointmentDateTime = (appointment, timeValue = appointment?.startTime) => {
  if (!appointment?.date) return null;

  const dateKey = String(appointment.date).slice(0, 10);
  const [year, month, day] = dateKey.split('-').map(Number);
  if ([year, month, day].some(Number.isNaN)) return null;

  const timeMinutes = timeToMinutes(timeValue);
  const hours = Math.floor(timeMinutes / 60);
  const minutes = timeMinutes % 60;

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

const getAppointmentSortGroup = (appointment, currentTime = Date.now()) => {
  const status = String(appointment?.status || '').trim().toLowerCase();
  const startDateTime = buildAppointmentDateTime(appointment);
  const endDateTime = buildAppointmentDateTime(appointment, appointment?.endTime);
  const hasStarted = startDateTime?.getTime() <= currentTime;
  const hasEnded = endDateTime?.getTime() <= currentTime;

  if (status === 'in progress' || (['approved', 'confirmed'].includes(status) && hasStarted && !hasEnded)) {
    return 0;
  }

  if (['scheduled', 'pending'].includes(status)) {
    return 1;
  }

  if (['confirmed', 'approved'].includes(status)) {
    return 2;
  }

  if (['completed', 'cancelled', 'canceled', 'rejected'].includes(status)) {
    return 3;
  }

  return 4;
};

const sortAppointmentsByPriority = (first, second, currentTime = Date.now()) => {
  const priorityDifference = getAppointmentSortGroup(first, currentTime) - getAppointmentSortGroup(second, currentTime);
  if (priorityDifference !== 0) return priorityDifference;

  const firstDate = buildAppointmentDateTime(first)?.getTime() || 0;
  const secondDate = buildAppointmentDateTime(second)?.getTime() || 0;
  return secondDate - firstDate;
};

const formatRosterDate = (appointment) => {
  const rawDate = appointment?.date || appointment?.bookingDate;
  if (!rawDate) return 'Date not set';

  const dateKey = String(rawDate).slice(0, 10);
  const [year, month, day] = dateKey.split('-').map(Number);
  const parsedDate = [year, month, day].some(Number.isNaN)
    ? new Date(rawDate)
    : new Date(year, month - 1, day);

  if (Number.isNaN(parsedDate.getTime())) return 'Date not set';

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(parsedDate);
};

const getAppointmentDateKey = (appointment) => (
  String(appointment?.date || appointment?.bookingDate || '').slice(0, 10)
);

const getTodayDateKey = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalDateKey = (dateValue) => {
  const parsedDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return '';

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateKeyFromValue = (dateValue) => {
  if (!dateValue) return '';
  const rawDate = String(dateValue);
  if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) return rawDate.slice(0, 10);
  return getLocalDateKey(dateValue);
};

const parseDateKey = (dateKey) => {
  if (!dateKey) return null;
  const [year, month, day] = String(dateKey).slice(0, 10).split('-').map(Number);
  if ([year, month, day].some(Number.isNaN)) return null;
  return new Date(year, month - 1, day);
};

const formatDisplayDate = (dateKey) => {
  const parsedDate = parseDateKey(dateKey);
  if (!parsedDate) return 'your next working day';

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsedDate);
};

const formatDisplayDay = (dateKey) => {
  const parsedDate = parseDateKey(dateKey);
  if (!parsedDate) return 'your next shift';

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
  }).format(parsedDate);
};

const isTomorrowDateKey = (dateKey) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getLocalDateKey(tomorrow) === dateKey;
};

const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const normalizeClosureReason = (reason) => (
  String(reason || 'Salon closure').trim().replace(/[.\s]+$/g, '')
);

const getWorkingHoursEndValue = (workingHours) => {
  if (!workingHours) return '17:00';

  if (typeof workingHours === 'object' && !Array.isArray(workingHours)) {
    return workingHours.end || '17:00';
  }

  if (typeof workingHours === 'string') {
    const rangeParts = workingHours.split(/\s+-\s+/);
    return rangeParts[1] || workingHours;
  }

  return '17:00';
};

const getCurrentMinutes = (timestamp) => {
  const currentDate = new Date(timestamp);
  return currentDate.getHours() * 60 + currentDate.getMinutes();
};

const getStaffWorkingHours = (profile) => (
  profile?.workingHours || profile?.staffDetails?.workingHours || null
);

const getCurrentWeekRange = () => {
  const now = new Date();
  const dayIndex = now.getDay();
  const mondayOffset = dayIndex === 0 ? -6 : 1 - dayIndex;
  const start = new Date(now);
  start.setDate(now.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const getAppointmentDate = (appointment) => {
  const rawDate = appointment?.bookingDate || appointment?.date;
  if (!rawDate) return null;

  const dateKey = String(rawDate).slice(0, 10);
  const [year, month, day] = dateKey.split('-').map(Number);
  const parsedDate = [year, month, day].some(Number.isNaN)
    ? new Date(rawDate)
    : new Date(year, month - 1, day);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const isCompletedAppointment = (appointment) => (
  String(appointment?.status || '').trim().toLowerCase() === 'completed'
);

const COMPLETION_WINDOW_MS = 10 * 60 * 1000;

const canCompleteAppointment = (appointment, currentTime = Date.now()) => {
  const endDateTime = buildAppointmentDateTime(appointment, appointment?.endTime);
  if (!endDateTime) return false;

  return currentTime >= endDateTime.getTime() - COMPLETION_WINDOW_MS;
};

const formatCurrency = (amount) => (
  `Rs. ${new Intl.NumberFormat('en-LK', {
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)}`
);

const getServicesLabel = (appointment) => (
  Array.isArray(appointment?.services) && appointment.services.length > 0
    ? appointment.services.map((service) => service.name || service).join(', ')
    : appointment?.service || 'Service details unavailable'
);

function StaffDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [_user, setUser] = useState(null);
  const [staffProfile, setStaffProfile] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [staffMetrics, setStaffMetrics] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionKey, setActionKey] = useState('');
  const [processingAppointmentId, setProcessingAppointmentId] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const staffName = localStorage.getItem('userName') || 'Staff';

  const fetchSchedule = useCallback(async ({ showLoading = false } = {}) => {
    const token = localStorage.getItem('token');

    if (!token) {
      setIsLoading(false);
      setError('Authentication token not found. Please log in again.');
      return;
    }

    try {
      if (showLoading) setIsLoading(true);
      setError(null);
      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };
      const [appointmentsResponse, profileResponse, leavesResponse, metricsResponse, holidaysResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/appointments/staff`, config),
        axios.get(`${API_BASE_URL}/api/users/me`, config),
        axios.get(`${API_BASE_URL}/api/leaves`, config),
        axios.get(`${API_BASE_URL}/api/roster/metrics`, config),
        axios.get(`${API_BASE_URL}/api/holidays`).catch((holidayError) => {
          console.error('Error loading salon closures:', holidayError);
          return { data: { holidays: [] } };
        }),
      ]);

      console.log("Get data from backend:", appointmentsResponse.data);
      setAppointments(appointmentsResponse.data);
      setStaffProfile(profileResponse.data || null);
      setLeaveRequests(Array.isArray(leavesResponse.data) ? leavesResponse.data : []);
      setStaffMetrics(metricsResponse.data || null);
      setHolidays(Array.isArray(holidaysResponse.data?.holidays) ? holidaysResponse.data.holidays : []);
      setCurrentTime(Date.now());
    } catch (error) {
      console.error('Error fetching staff appointments:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      const errorMessage = error.response?.data?.message || 'Failed to load appointments. Please try again later.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const session = getStoredSession();

    if (!session?.user) {
      setIsLoading(false);
      setError('Authentication token not found. Please log in again.');
      const nextPath = `${location.pathname}${location.search}${location.hash}`;
      navigate(`/login?next=${encodeURIComponent(nextPath)}`, { replace: true });
      return;
    }

    setUser(session.user);

    fetchSchedule();
  }, [fetchSchedule, location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => window.clearInterval(timerId);
  }, []);


  const todayAppointments = useMemo(() => {
    const todayKey = getTodayDateKey();

    return [...appointments]
      .filter((appointment) => getAppointmentDateKey(appointment) === todayKey)
      .sort((first, second) => sortAppointmentsByPriority(first, second, currentTime));
  }, [appointments, currentTime]);

  const localIsLeaveDay = useMemo(() => {
    const today = new Date();
    const todayKey = getTodayDateKey();
    const todayDayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(today);
    const offDays = Array.isArray(staffProfile?.offDays)
      ? staffProfile.offDays
      : staffProfile?.offDays
        ? [staffProfile.offDays]
        : [];

    const isRegisteredOffDay = offDays.some((day) => (
      String(day).trim().toLowerCase() === todayDayName.toLowerCase()
    ));

    const isApprovedLeaveToday = leaveRequests.some((leave) => {
      if (String(leave?.status || '').trim().toLowerCase() !== 'approved') return false;

      const startKey = getDateKeyFromValue(leave.startDate);
      const endKey = getDateKeyFromValue(leave.endDate || leave.startDate);
      return startKey <= todayKey && todayKey <= endKey;
    });

    return isRegisteredOffDay || isApprovedLeaveToday;
  }, [staffProfile, leaveRequests]);

  const isLeaveDay = Boolean(staffMetrics?.isLeaveDay ?? localIsLeaveDay);
  const todayKey = getLocalDateKey(currentTime);
  const todayHoliday = useMemo(
    () => holidays.find((holiday) => holiday.date === todayKey) || null,
    [holidays, todayKey]
  );
  const isTodayFullDayClosure = Boolean(todayHoliday && todayHoliday.isFullDay !== false);
  const isTodayPartialClosure = Boolean(todayHoliday && todayHoliday.isFullDay === false);
  const todayClosureReason = normalizeClosureReason(todayHoliday?.name);
  const nextActiveDate = staffMetrics?.nextActiveDate || null;
  const nextShiftTime = staffMetrics?.nextShiftTime || 'your usual start time';
  const fullDayHolidayKeys = useMemo(
    () => new Set(
      holidays
        .filter((holiday) => holiday.date && holiday.isFullDay !== false)
        .map((holiday) => holiday.date)
    ),
    [holidays]
  );
  const tomorrowKey = getLocalDateKey(addDays(new Date(currentTime), 1));
  const tomorrowHoliday = useMemo(
    () => holidays.find((holiday) => holiday.date === tomorrowKey && holiday.isFullDay !== false) || null,
    [holidays, tomorrowKey]
  );
  const workEndMinutes = timeToMinutes(getWorkingHoursEndValue(getStaffWorkingHours(staffProfile)));
  const hasWorkdayEnded = getCurrentMinutes(currentTime) >= workEndMinutes;
  const isTomorrowFullDayClosure = Boolean(tomorrowHoliday);
  const isPostShiftClosureNotice = hasWorkdayEnded && isTomorrowFullDayClosure;
  const isPostShiftNextDutyNotice = !isTodayFullDayClosure && hasWorkdayEnded && !isTomorrowFullDayClosure && !isLeaveDay;
  const isAwayDay = isLeaveDay || isTodayFullDayClosure || isPostShiftClosureNotice || isPostShiftNextDutyNotice;
  const adjustedNextActiveDate = useMemo(() => {
    if (!isAwayDay) return nextActiveDate;

    const metricDateIsUsable = nextActiveDate
      && nextActiveDate > todayKey
      && !fullDayHolidayKeys.has(nextActiveDate);

    if (metricDateIsUsable) return nextActiveDate;

    const offDays = Array.isArray(staffProfile?.offDays)
      ? staffProfile.offDays
      : staffProfile?.offDays
        ? [staffProfile.offDays]
        : [];

    for (let offset = 1; offset <= 90; offset += 1) {
      const candidateDate = addDays(new Date(currentTime), offset);
      const candidateKey = getLocalDateKey(candidateDate);
      const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(candidateDate);
      const isRegisteredOffDay = offDays.some((day) => (
        String(day).trim().toLowerCase() === dayName.toLowerCase()
      ));
      const isApprovedLeaveDay = leaveRequests.some((leave) => {
        if (String(leave?.status || '').trim().toLowerCase() !== 'approved') return false;

        const startKey = getDateKeyFromValue(leave.startDate);
        const endKey = getDateKeyFromValue(leave.endDate || leave.startDate);
        return startKey <= candidateKey && candidateKey <= endKey;
      });

      if (!fullDayHolidayKeys.has(candidateKey) && !isRegisteredOffDay && !isApprovedLeaveDay) {
        return candidateKey;
      }
    }

    return nextActiveDate;
  }, [currentTime, fullDayHolidayKeys, isAwayDay, leaveRequests, nextActiveDate, staffProfile, todayKey]);
  const nextActiveDateLabel = formatDisplayDate(adjustedNextActiveDate);
  const nextActiveDayLabel = formatDisplayDay(adjustedNextActiveDate);
  const totalConsecutiveDaysOff = Number(staffMetrics?.totalConsecutiveDaysOff || 1);
  const leaveDayBanner = totalConsecutiveDaysOff > 1
    ? {
        prefix: 'Enjoy your extended',
        highlight: `${totalConsecutiveDaysOff}-day break`,
        suffix: `, ${staffName}!`,
      }
    : nextActiveDate && isTomorrowDateKey(nextActiveDate)
      ? {
          prefix: 'Enjoy your day off',
          highlight: staffName,
          suffix: '! See you tomorrow.',
        }
      : {
          prefix: 'Enjoy your well-deserved break',
          highlight: staffName,
          suffix: '!',
        };
  const greetingBanner = isPostShiftClosureNotice
    ? isTodayFullDayClosure
      ? {
          prefix: 'Enjoy your break,',
          highlight: staffName,
          suffix: '. The salon is closed tomorrow as well.',
        }
      : {
          prefix: 'Great work today,',
          highlight: staffName,
          suffix: '. The salon is closed tomorrow.',
        }
    : isTodayFullDayClosure
    ? {
        prefix: 'Enjoy your break,',
        highlight: staffName,
        suffix: '. The salon is closed today.',
      }
      : isPostShiftNextDutyNotice && adjustedNextActiveDate && isTomorrowDateKey(adjustedNextActiveDate)
        ? {
            prefix: 'Great work today,',
            highlight: staffName,
            suffix: '. See you tomorrow.',
          }
        : isPostShiftNextDutyNotice && adjustedNextActiveDate
          ? {
              prefix: 'Great work today,',
              highlight: staffName,
              suffix: `. See you on ${nextActiveDayLabel}.`,
            }
    : leaveDayBanner;
  const nextDutySubtext = totalConsecutiveDaysOff > 1
      ? `See you on ${nextActiveDayLabel}. Enjoy the full break until then.`
      : `See you on ${nextActiveDayLabel}.`;

  const inProgressAppointment = useMemo(
    () => todayAppointments.find((appointment) => getAppointmentSortGroup(appointment, currentTime) === 0),
    [todayAppointments, currentTime]
  );

  const nextScheduledAppointment = useMemo(() => (
    todayAppointments.find((appointment) => {
      const status = String(appointment?.status || '').trim().toLowerCase();
      const startDateTime = buildAppointmentDateTime(appointment);
      return ['scheduled', 'pending', 'confirmed', 'approved'].includes(status)
        && startDateTime?.getTime() > currentTime;
    })
  ), [todayAppointments, currentTime]);

  const pendingApprovals = todayAppointments.filter((appointment) => (
    String(appointment?.status || '').trim().toLowerCase() === 'pending'
  )).length;
  const completedSessions = todayAppointments.filter(isCompletedAppointment).length;
  const weeklyEarnings = useMemo(() => {
    const { start, end } = getCurrentWeekRange();

    return appointments.reduce((total, appointment) => {
      const appointmentDate = getAppointmentDate(appointment);
      if (!isCompletedAppointment(appointment) || !appointmentDate) return total;

      const appointmentTime = appointmentDate.getTime();
      if (appointmentTime < start.getTime() || appointmentTime > end.getTime()) return total;

      return total + Number(appointment.totalAmount || 0);
    }, 0);
  }, [appointments]);

  const handleStatusUpdate = async (appointmentId, status) => {
    if (processingAppointmentId === appointmentId) return;

    try {
      const token = localStorage.getItem('token');
      setProcessingAppointmentId(appointmentId);
      setActionKey(`${appointmentId}-${status}`);

      const endpoint = `${API_BASE_URL}/api/appointments/${appointmentId}/staff-status`;

      const response = await axios.put(
        endpoint,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const updatedStatus = response.data.appointment?.status || status;

      setAppointments((current) =>
        current.map((appointment) =>
          appointment._id === appointmentId
            ? { ...appointment, status: updatedStatus }
            : appointment
        )
      );

      toast.success(`Appointment updated to ${updatedStatus}.`);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error(error.response?.data?.message || 'Could not update appointment status.');
    } finally {
      setActionKey('');
      setProcessingAppointmentId('');
    }
  };

  const renderAppointmentActions = (appointment, { stacked = false } = {}) => {
    const startDateTime = buildAppointmentDateTime(appointment);
    const isStarted = startDateTime?.getTime() <= currentTime;
    const isProcessingAppointment = processingAppointmentId === appointment._id;
    const canComplete = canCompleteAppointment(appointment, currentTime);
    const actionWrapperClass = stacked
      ? 'grid gap-2'
      : 'flex flex-wrap justify-end gap-2';
    const buttonClass = stacked
      ? 'w-full rounded-lg px-4 py-2.5 text-sm'
      : 'rounded-lg px-4 py-2 text-sm';

    if (!['Pending', 'Approved', 'Completed'].includes(appointment.status)) return null;

    return (
      <div className={actionWrapperClass}>
        {appointment.status === 'Pending' && (
          <>
            <GoldButton
              type="button"
              onClick={() => handleStatusUpdate(appointment._id, 'Approved')}
              disabled={isProcessingAppointment}
              className={buttonClass}
            >
              {actionKey === `${appointment._id}-Approved` ? 'Working...' : 'Accept'}
            </GoldButton>
            <GoldButton
              type="button"
              variant="ghost"
              onClick={() => handleStatusUpdate(appointment._id, 'Rejected')}
              disabled={isProcessingAppointment}
              className={`${buttonClass} border border-red-900/50 bg-[#1a1a1a] text-red-400 hover:border-transparent hover:bg-red-900/80 hover:text-white`}
            >
              {actionKey === `${appointment._id}-Rejected` ? 'Working...' : 'Reject'}
            </GoldButton>
          </>
        )}

        {appointment.status === 'Approved' && (
          canComplete ? (
            <GoldButton
              type="button"
              onClick={() => handleStatusUpdate(appointment._id, 'Completed')}
              disabled={isProcessingAppointment}
              className={buttonClass}
            >
              {actionKey === `${appointment._id}-Completed` ? 'Working...' : 'Complete'}
            </GoldButton>
          ) : (
            <GoldButton
              type="button"
              variant="ghost"
              className={`${buttonClass} border border-white/10 bg-black/20 text-gray-400 hover:bg-black/20 hover:text-gray-400`}
              disabled
            >
              {isStarted ? 'In Progress' : 'Start'}
            </GoldButton>
          )
        )}

        {appointment.status === 'Completed' && (
          <span className="inline-flex justify-center rounded-full border border-green-700/50 bg-green-900/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-green-400">
            Done
          </span>
        )}
      </div>
    );
  };

  const renderFocusAppointment = (title, appointment, emptyText, isActive = false, eyebrow = 'Active Status') => (
    <div className={`${appointment ? 'min-h-[250px]' : 'min-h-[170px]'} rounded-2xl border p-4 shadow-xl backdrop-blur-md sm:p-6 ${
      isActive
        ? 'border-emerald-400/20 bg-emerald-400/10'
        : 'border-[#d4af37]/20 bg-[#d4af37]/10'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-xs font-bold uppercase tracking-[0.18em] ${isActive ? 'text-emerald-300' : 'text-[#d4af37]'}`}>
            {eyebrow}
          </p>
          <h2 className="mt-3 font-serif text-xl text-white sm:text-2xl">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {appointment && (
            isActive ? (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
                In Progress
              </span>
            ) : (
              <StatusBadge status={appointment.status} />
            )
          )}
          <button
            type="button"
            onClick={() => fetchSchedule()}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-gray-300 transition hover:border-[#d4af37]/40 hover:text-[#d4af37] sm:h-10 sm:w-10"
            aria-label="Refresh queue"
            title="Refresh queue"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {appointment ? (
        <div className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Client</p>
              <p className="mt-2 text-base font-semibold text-white sm:text-lg">{appointment.user?.name || 'Client'}</p>
              <p className="mt-1 text-sm text-gray-400">{appointment.user?.phone || appointment.user?.email || 'No contact details'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Time</p>
              <p className="mt-2 text-base font-semibold text-white sm:text-lg">
                {appointment.startTime} {appointment.endTime ? `- ${appointment.endTime}` : ''}
              </p>
              <p className="mt-1 text-sm text-gray-400">{formatRosterDate(appointment)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Service</p>
              <p className="mt-2 text-base font-semibold text-gray-100">{getServicesLabel(appointment)}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:flex-wrap">
            {appointment.user?.phone && (
              <a
                href={`tel:${appointment.user.phone}`}
                className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-[#d4af37]/40 hover:text-[#d4af37]"
              >
                Contact Client
              </a>
            )}
            {isActive
              && ['approved', 'confirmed'].includes(String(appointment.status || '').trim().toLowerCase())
              && canCompleteAppointment(appointment, currentTime)
              && (
              <GoldButton
                type="button"
                onClick={() => handleStatusUpdate(appointment._id, 'Completed')}
                disabled={processingAppointmentId === appointment._id}
                className="rounded-lg px-4 py-2 text-sm"
              >
                {actionKey === `${appointment._id}-Completed` ? 'Working...' : 'Mark Complete'}
              </GoldButton>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
            {emptyText}
          </div>
        </div>
      )}
    </div>
  );

  const statCards = [
    {
      label: "Today's Appointments",
      value: todayAppointments.length,
      subtitle: 'Scheduled for today',
      mutedOnLeaveDay: true,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      label: 'Pending Approvals',
      value: pendingApprovals,
      subtitle: 'Waiting for confirmation',
      mutedOnLeaveDay: true,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 8v4l2.5 2.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      label: 'Completed Sessions',
      value: completedSessions,
      subtitle: "Today's Finished Appointments",
      mutedOnLeaveDay: true,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m5 12 4.2 4.2L19 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      label: "This Week's Earnings",
      value: formatCurrency(weeklyEarnings),
      subtitle: 'UPDATED REAL-TIME',
      mutedOnLeaveDay: false,
      icon: <DollarSign className="h-5 w-5" />
    }
  ];

  const renderGreetingSkeleton = () => (
    <header className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-[#111111]/70 p-4 shadow-xl backdrop-blur-md sm:mb-8 sm:p-6">
      <div className="h-8 w-11/12 max-w-3xl animate-pulse rounded bg-white/10 sm:h-11" />
      <div className="mt-4 h-4 w-10/12 max-w-2xl animate-pulse rounded bg-white/10 sm:h-5" />
    </header>
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-0">
      {isLoading ? renderGreetingSkeleton() : (
        <header className={`mb-6 min-w-0 overflow-hidden rounded-2xl border border-white/10 p-4 shadow-xl backdrop-blur-md sm:mb-8 sm:p-6 ${
          isAwayDay ? 'bg-zinc-900/50' : 'bg-[#111111]/70'
        }`}>
          <h1 className="break-words font-serif text-2xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
            {isAwayDay ? (
              <>
                {greetingBanner.prefix}{' '}
                <span className={isTodayFullDayClosure ? 'text-amber-300' : 'text-[#d4af37]'}>
                  {greetingBanner.highlight}
                </span>
                <span className="text-white">{greetingBanner.suffix}</span>
              </>
            ) : (
              <>Welcome back, <span className="text-[#d4af37]">{staffName}</span></>
            )}
          </h1>
          <p className="mt-3 break-words text-sm leading-6 text-gray-400 sm:text-base">
            {isPostShiftClosureNotice
              ? `Tomorrow's closure reason: ${normalizeClosureReason(tomorrowHoliday?.name)}. Your next active duty is already updated below.`
              : isTodayFullDayClosure
                ? `Closure reason: ${todayClosureReason}. No client queue needs your attention.`
                : isPostShiftNextDutyNotice
                  ? 'Your working hours are finished for today. Your next active duty is shown below.'
              : isTodayPartialClosure
                ? `Heads up: the salon has a partial closure today from ${todayHoliday.hours?.start || 'the selected start time'} to ${todayHoliday.hours?.end || 'the selected end time'}. Reason: ${todayClosureReason}.`
                : isLeaveDay
                  ? 'Your schedule is clear for today. Rest up and recharge.'
              : 'Here is your schedule for today.'}
          </p>
        </header>
      )}

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`relative min-h-[132px] rounded-2xl border border-white/10 bg-[#111111]/70 p-4 shadow-xl backdrop-blur-md sm:min-h-[150px] sm:p-6 ${
              isAwayDay && card.mutedOnLeaveDay ? 'hidden sm:block' : ''
            } ${isAwayDay && !card.mutedOnLeaveDay ? 'sm:col-span-2 xl:col-span-1' : ''}`}
          >
            <div className="flex min-h-[96px] flex-col justify-between sm:min-h-[102px]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-sm ${
                    isAwayDay && card.mutedOnLeaveDay ? 'text-zinc-500' : 'text-gray-400'
                  }`}>
                    {card.label}
                  </p>
                  <p className={`mt-2 font-serif text-3xl sm:text-4xl ${
                    isAwayDay && card.mutedOnLeaveDay ? 'text-white' : 'text-[#d4af37]'
                  }`}>
                    {card.value}
                  </p>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border sm:h-11 sm:w-11 ${
                  isAwayDay && card.mutedOnLeaveDay
                    ? 'border-zinc-800 bg-zinc-900/70 text-zinc-500'
                    : 'border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]'
                }`}>
                  {card.icon}
                </div>
              </div>
              <p className={`mt-5 text-xs uppercase tracking-[0.16em] ${
                isAwayDay && card.mutedOnLeaveDay ? 'text-zinc-600' : 'text-gray-500'
              }`}>
                {card.subtitle}
              </p>
            </div>
          </div>
        ))}
      </section>

      {!isLoading && !isAwayDay && todayAppointments.length > 0 && (
        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          {renderFocusAppointment(
            'In Progress',
            inProgressAppointment,
            'No appointment is currently in progress.',
            true,
            'Active Status'
          )}
          {renderFocusAppointment(
            'Next Scheduled',
            nextScheduledAppointment,
            'No upcoming appointment is waiting in the queue.',
            false,
            'Next Up'
          )}
        </section>
      )}

      <section id="today-schedule" className="rounded-2xl border border-white/10 bg-[#111111]/70 p-4 shadow-xl backdrop-blur-md sm:p-6">
        <div className="mb-6 flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Actionable Tasks</p>
            <h2 className="mt-2 font-serif text-xl text-[#d4af37] sm:text-2xl">
              {isAwayDay ? 'Next Shift Preview' : "Today's Schedule"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
              {isPostShiftClosureNotice
                ? `Tomorrow is blocked as a full-day salon closure. Reason: ${normalizeClosureReason(tomorrowHoliday?.name)}.`
                : isTodayFullDayClosure
                  ? `Salon operations are paused today. Reason: ${todayClosureReason}.`
                  : isPostShiftNextDutyNotice
                    ? 'Your workday has ended. The next active duty preview is ready.'
                : isLeaveDay
                  ? 'Your dashboard is softened while you are away from operations.'
                : 'Appointments are grouped by priority so the next action stays easy to spot.'}
            </p>
          </div>
          {!isAwayDay && (
            <div className="w-fit rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
              {todayAppointments.length} scheduled
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-700/50 bg-red-900/20 p-4 backdrop-blur-sm">
            <div className="flex gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-red-700/50 bg-red-900/30 text-red-400">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 8v4m0 4v.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-400">Error Loading Appointments</p>
                <p className="mt-1 text-xs text-red-300/80">{error}</p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-white/10 bg-black/20 p-5">
                <div className="h-4 w-24 animate-pulse rounded bg-white/10"></div>
                <div className="mt-3 h-4 w-40 animate-pulse rounded bg-white/10"></div>
              </div>
            ))}
          </div>
        ) : isAwayDay ? (
          <div className="py-10 text-center sm:py-14">
            <div className="mx-auto w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
              <p className="text-sm font-semibold text-zinc-400">Your Next Active Duty</p>
              <p className="mt-2 break-words text-lg font-bold text-[#d4af37] sm:text-xl">{nextActiveDateLabel}</p>
              <p className="mt-1 break-words text-zinc-100">{nextShiftTime}</p>
              <p className="mt-3 break-words text-sm text-zinc-400">{nextDutySubtext}</p>
            </div>
          </div>
        ) : todayAppointments.length === 0 ? (
          <div className="py-10 text-center sm:py-14">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="mt-5 text-base font-semibold text-white sm:text-lg">No appointments assigned for today.</p>
            <p className="mt-2 text-sm text-gray-400">Your client roster will appear here as soon as bookings are assigned.</p>
          </div>
        ) : (
          <>
            <div className="block md:hidden">
              <div className="grid gap-4">
                {todayAppointments.map((appointment) => {
                  const services = getServicesLabel(appointment);
                  const actions = renderAppointmentActions(appointment, { stacked: true });

                  return (
                    <article
                      key={appointment._id}
                      className="rounded-xl border border-white/10 bg-black/20 p-4 shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Customer</p>
                          <h3 className="mt-1 break-words text-lg font-bold leading-snug text-white">
                            {appointment.user?.name || 'Client'}
                          </h3>
                          <p className="mt-1 break-words text-xs text-gray-400">
                            {appointment.user?.phone || appointment.user?.email || 'No contact details'}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <StatusBadge status={appointment.status} />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 rounded-lg border border-white/10 bg-[#07090d]/70 p-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Selected Service</p>
                          <p className="mt-1 break-words text-sm font-semibold text-gray-100">{services}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Appt Time</p>
                            <p className="mt-1 text-sm font-semibold text-white">
                              {appointment.startTime} {appointment.endTime ? `- ${appointment.endTime}` : ''}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Slot</p>
                            <p className="mt-1 text-sm font-semibold text-white">{formatRosterDate(appointment)}</p>
                          </div>
                        </div>
                      </div>

                      {actions && (
                        <div className="mt-4 border-t border-white/10 pt-4">
                          {actions}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="hidden md:block">
              <div className="salon-scrollbar overflow-x-auto">
                <table className="min-w-[760px] text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-[0.16em] text-[#d4af37]">
                      <th className="px-4 py-4 font-medium">Time</th>
                      <th className="px-4 py-4 font-medium">Client Name</th>
                      <th className="px-4 py-4 font-medium">Service</th>
                      <th className="px-4 py-4 font-medium">Status</th>
                      <th className="px-4 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayAppointments.map((appointment) => {
                      const services = getServicesLabel(appointment);

                      return (
                        <tr key={appointment._id} className="border-b border-white/10 last:border-b-0 hover:bg-white/5">
                          <td className="px-4 py-4 align-middle">
                            <div className="text-sm font-semibold text-white">
                              {appointment.startTime} {appointment.endTime ? `- ${appointment.endTime}` : ''}
                            </div>
                            <div className="mt-0.5 text-xs text-zinc-500">
                              {formatRosterDate(appointment)}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-semibold text-white">{appointment.user?.name || 'Client'}</div>
                            <div className="mt-1 text-xs text-gray-400">{appointment.user?.phone || appointment.user?.email || 'No contact details'}</div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-300">{services}</td>
                          <td className="px-4 py-4">
                            <StatusBadge status={appointment.status} />
                          </td>
                          <td className="px-4 py-4">
                            {renderAppointmentActions(appointment)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default StaffDashboard;
