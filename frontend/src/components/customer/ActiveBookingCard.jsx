import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, UserRound } from 'lucide-react';
import ReportDelayModal from './ReportDelayModal';

const REPORTABLE_STATUSES = ['pending', 'confirmed', 'approved'];

const getDateKey = (value) => {
  if (!value) return '';
  return String(value).slice(0, 10);
};

const getTodayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const timeToMinutes = (timeValue) => {
  if (!timeValue || typeof timeValue !== 'string') return null;

  const [rawTime, rawModifier = ''] = timeValue.trim().split(/\s+/);
  const [rawHours, rawMinutes] = rawTime.split(':');
  let hours = Number(rawHours);
  const minutes = Number(rawMinutes);
  const modifier = rawModifier.toUpperCase();

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  if (modifier === 'PM' && hours !== 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

const buildAppointmentStart = (appointment) => {
  const dateKey = getDateKey(appointment?.bookingDate || appointment?.date);
  const startMinutes = timeToMinutes(appointment?.startTime);

  if (!dateKey || startMinutes === null) return null;

  const [year, month, day] = dateKey.split('-').map(Number);
  if ([year, month, day].some(Number.isNaN)) return null;

  return new Date(year, month - 1, day, Math.floor(startMinutes / 60), startMinutes % 60);
};

const canReportRunningLate = (appointment, currentTime) => {
  const appointmentDateKey = getDateKey(appointment?.bookingDate || appointment?.date);
  const normalizedStatus = String(appointment?.status || '').trim().toLowerCase();
  const appointmentStart = buildAppointmentStart(appointment);

  if (appointmentDateKey !== getTodayKey()) return false;
  if (!REPORTABLE_STATUSES.includes(normalizedStatus)) return false;
  if (appointment?.isLate) return false;
  if (!appointmentStart) return false;

  const minutesUntilStart = (appointmentStart.getTime() - currentTime.getTime()) / 60000;
  return minutesUntilStart >= 0 && minutesUntilStart <= 30;
};

function ActiveBookingCard({
  appointment,
  formatServices,
  formatDate,
  getStylistDisplayName,
  statusClassName,
  canCancelAppointment,
  onCancel,
  onAppointmentUpdated
}) {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isReportDelayOpen, setIsReportDelayOpen] = useState(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  const isCancellable = canCancelAppointment(appointment);
  const shouldShowRunningLateButton = useMemo(
    () => canReportRunningLate(appointment, currentTime),
    [appointment, currentTime]
  );

  return (
    <>
      <article className="min-w-0 rounded-xl border border-white/10 border-l-4 border-l-[#d4af37] bg-[#0d1117] p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h3 className="break-words text-base font-bold text-white sm:text-lg">{formatServices(appointment.services)}</h3>
            <div className="mt-4 grid gap-3 text-sm text-slate-400 sm:grid-cols-2 xl:grid-cols-3">
              <span className="flex min-w-0 items-center gap-2">
                <UserRound className="h-4 w-4 text-slate-500" />
                <span className="min-w-0 break-words">{getStylistDisplayName(appointment) || 'Any Available Artist'}</span>
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                <span className="min-w-0 break-words">{formatDate(appointment.date || appointment.bookingDate)}</span>
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <span className="min-w-0 break-words">{appointment.startTime || 'Time pending'}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:justify-end">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClassName(appointment.status)}`}>
              {appointment.status}
            </span>

            {shouldShowRunningLateButton && (
              <button
                type="button"
                onClick={() => setIsReportDelayOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-400 shadow-[0_10px_24px_rgba(245,158,11,0.08)] transition-all hover:bg-amber-500/10"
              >
                <Clock className="h-3.5 w-3.5" />
                I'm Running Late
              </button>
            )}

            <button
              type="button"
              onClick={onCancel}
              disabled={!isCancellable}
              title={isCancellable ? 'Cancel appointment' : 'Appointments can only be cancelled at least 2 hours before start time.'}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:text-white/25 disabled:hover:bg-transparent"
            >
              Cancel
            </button>
          </div>
        </div>
      </article>

      {isReportDelayOpen && (
        <ReportDelayModal
          appointment={appointment}
          onClose={() => setIsReportDelayOpen(false)}
          onSuccess={onAppointmentUpdated}
        />
      )}
    </>
  );
}

export default ActiveBookingCard;
