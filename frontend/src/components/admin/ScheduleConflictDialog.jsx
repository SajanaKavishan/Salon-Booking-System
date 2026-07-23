import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CalendarDays, Clock3, ExternalLink, UserRound, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useModalFocus } from '../../hooks/useModalFocus';
import { formatSalonDate } from '../../utils/salonTime';

const getConflictTimeLabel = (conflict) => {
  if (conflict?.timeSlot) return conflict.timeSlot;

  const startTime = conflict?.startTime || '';
  const endTime = conflict?.endTime || '';
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  return startTime || endTime || 'Time unavailable';
};

const groupConflictsByAppointment = (conflicts = []) => {
  const groupedConflicts = new Map();

  conflicts.forEach((conflict) => {
    const appointmentId = String(conflict?.appointmentId || '').trim();
    if (!appointmentId) return;

    const existingConflict = groupedConflicts.get(appointmentId);
    const reason = String(conflict?.reason || '').trim();
    if (existingConflict) {
      if (reason && !existingConflict.reasons.includes(reason)) {
        existingConflict.reasons.push(reason);
      }
      return;
    }

    groupedConflicts.set(appointmentId, {
      ...conflict,
      appointmentId,
      reasons: reason ? [reason] : [],
    });
  });

  return [...groupedConflicts.values()];
};

function ScheduleConflictDialog({ details, onClose, contextLabel = 'Schedule Update' }) {
  const conflicts = useMemo(
    () => groupConflictsByAppointment(details?.conflicts),
    [details?.conflicts]
  );
  const dialogRef = useModalFocus({
    isOpen: Boolean(details),
    onClose,
  });

  if (!details) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[12000] flex min-h-[100dvh] items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-md"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-conflict-dialog-title"
        aria-describedby="schedule-conflict-dialog-description"
        tabIndex={-1}
        className="relative flex max-h-[min(88dvh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-amber-400/30 bg-[#0b0b0d] shadow-[0_30px_100px_rgba(0,0,0,0.72)]"
      >
        <div className="border-b border-white/10 px-5 py-5 pr-16 sm:px-7 sm:py-6 sm:pr-20">
          <div className="flex items-center gap-3 text-amber-300">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-xs font-bold uppercase tracking-[0.22em]">{contextLabel}</p>
          </div>
          <h2 id="schedule-conflict-dialog-title" className="mt-4 font-serif text-2xl font-semibold text-white sm:text-3xl">
            Appointments must be rescheduled
          </h2>
          <p id="schedule-conflict-dialog-description" className="mt-2 text-sm leading-6 text-zinc-400">
            {details.message || 'Active appointments conflict with the proposed schedule.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close schedule conflict dialog"
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400 transition hover:border-amber-400/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="salon-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5 sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {conflicts.length} conflicting appointment{conflicts.length === 1 ? '' : 's'}
          </p>

          {conflicts.map((conflict) => (
            <article
              key={conflict.appointmentId}
              className="rounded-xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-amber-400/25 sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2.5">
                  <p className="flex items-center gap-2 text-sm font-semibold text-white">
                    <UserRound className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                    <span className="truncate">{conflict.customerName || 'Unknown customer'}</span>
                  </p>
                  <p className="flex items-center gap-2 text-sm text-zinc-300">
                    <CalendarDays className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
                    {formatSalonDate(conflict.date, conflict.date || 'Date unavailable')}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-zinc-300">
                    <Clock3 className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
                    {getConflictTimeLabel(conflict)}
                  </p>
                </div>

                <Link
                  to={`/admin/appointments?appointmentId=${encodeURIComponent(conflict.appointmentId)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-amber-400/35 bg-amber-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-amber-200 transition hover:border-amber-300 hover:bg-amber-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                >
                  Open appointment
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>

              <p className="mt-4 break-all border-t border-white/5 pt-3 font-mono text-[11px] text-zinc-500">
                ID: {conflict.appointmentId}
              </p>
              {conflict.reasons.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-xs leading-5 text-amber-100/75">
                  {conflict.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
                </ul>
              )}
            </article>
          ))}
        </div>

        <div className="border-t border-white/10 bg-black/20 px-5 py-4 sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#D4AF37] to-[#C9A227] px-6 py-3 text-sm font-bold text-black transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0d]"
          >
            Close and review schedule
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ScheduleConflictDialog;
