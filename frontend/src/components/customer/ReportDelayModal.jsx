import React, { useEffect, useRef, useState } from 'react';
import { apiClient as axios } from '../../utils/apiConfig';
import { Clock, Loader2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import API_BASE_URL from '../../utils/apiConfig';

const DELAY_OPTIONS = [10, 15, 20];
const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const getFocusableElements = (container) => (
  Array.from(container?.querySelectorAll(focusableSelector) || [])
    .filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true')
);

function ReportDelayModal({ appointment, onClose, onSuccess }) {
  const [selectedValue, setSelectedValue] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  const appointmentId = appointment?._id || appointment?.id;

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    const dialog = dialogRef.current;
    const firstFocusableElement = getFocusableElements(dialog)[0];

    (firstFocusableElement || dialog)?.focus({ preventScroll: true });

    return () => {
      if (previousFocusRef.current?.focus && document.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus({ preventScroll: true });
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose?.();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const dialog = dialogRef.current;
      const focusableElements = getFocusableElements(dialog);

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog?.focus({ preventScroll: true });
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const handleConfirmDelay = async () => {
    if (!appointmentId || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/appointments/${appointmentId}/running-late`,
        { minutes: selectedValue },
        {}
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
        ref={dialogRef}
        tabIndex={-1}
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

        <div className="mt-6 grid grid-cols-1 gap-2.5 min-[340px]:grid-cols-3 min-[340px]:gap-3">
          {DELAY_OPTIONS.map((minutes) => {
            const isSelected = selectedValue === minutes;

            return (
              <button
                key={minutes}
                type="button"
                onClick={() => setSelectedValue(minutes)}
                disabled={isSubmitting}
                aria-pressed={isSelected}
                className={`min-h-11 rounded-full border px-3 py-2.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
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
