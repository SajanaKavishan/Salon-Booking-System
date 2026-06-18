import React, { useState } from 'react';
import axios from 'axios';
import { Clock, Loader2, X } from 'lucide-react';
import { toast } from 'react-toastify';

const DELAY_OPTIONS = [10, 15, 20];

function ReportDelayModal({ appointment, onClose, onSuccess }) {
  const [selectedValue, setSelectedValue] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const appointmentId = appointment?._id || appointment?.id;

  const handleConfirmDelay = async () => {
    if (!appointmentId || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/appointments/${appointmentId}/running-late`,
        { minutes: selectedValue },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      toast.success('Delay reported successfully!');
      onSuccess?.(response.data?.appointment);
      onClose?.();
    } catch (error) {
      console.error('Report Delay Error:', error);
      toast.error(error.response?.data?.message || 'Unable to report your delay right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md"
      role="presentation"
      onClick={() => {
        if (!isSubmitting) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-delay-title"
        className="relative max-w-md w-full rounded-xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl animate-scaleIn"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 rounded-lg p-2 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Close report delay modal"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 shadow-[0_14px_30px_rgba(245,158,11,0.12)]">
          <Clock className="h-5 w-5" />
        </div>

        <h2 id="report-delay-title" className="mt-5 text-xl font-semibold text-white">
          Report a Schedule Delay
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Stuck in traffic or running behind? Let us know how many minutes you'll be late so we can adjust the stylist's timeline.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {DELAY_OPTIONS.map((minutes) => {
            const isSelected = selectedValue === minutes;

            return (
              <button
                key={minutes}
                type="button"
                onClick={() => setSelectedValue(minutes)}
                disabled={isSubmitting}
                className={`rounded-full border px-3 py-2.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/5 text-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.18)]'
                    : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-amber-500/40 hover:text-amber-300'
                }`}
              >
                {minutes} Mins
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleConfirmDelay}
          disabled={isSubmitting || !appointmentId}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-black shadow-lg shadow-amber-500/15 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Reporting Delay...' : 'Confirm Delay'}
        </button>
      </div>
    </div>
  );
}

export default ReportDelayModal;
