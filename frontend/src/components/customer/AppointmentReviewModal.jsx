import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { Check, Loader2, Sparkles, Star, X } from 'lucide-react';
import { toast } from 'react-toastify';

const getAppointmentId = (appointment) => appointment?._id || appointment?.id;

const getStylistName = (appointment) => {
  const stylist = appointment?.stylist || appointment?.staffId;

  if (typeof stylist === 'object' && stylist?.name) return stylist.name;
  if (typeof stylist === 'string' && stylist.trim() && !/^[0-9a-fA-F]{24}$/.test(stylist)) return stylist;
  if (appointment?.stylistName) return appointment.stylistName;

  return 'your stylist';
};

function AppointmentReviewModal({ appointment, onClose, onReviewSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [makePreferred, setMakePreferred] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const appointmentId = getAppointmentId(appointment);
  const stylistName = useMemo(() => getStylistName(appointment), [appointment]);
  const displayedRating = hoveredRating || rating;
  const showPreferredPrompt = rating === 5;

  const handleSubmitReview = async () => {
    if (!appointmentId || !rating || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');

      await axios.post(
        `http://localhost:5000/api/appointments/${appointmentId}/review`,
        {
          rating,
          feedback,
          makePreferred,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success('Thank you for your feedback!');
      onReviewSubmitted?.();
      onClose?.();
    } catch (error) {
      console.error('Submit Review Error:', error);
      toast.error(error.response?.data?.message || 'Unable to submit your review right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={() => {
        if (!isSubmitting) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-review-title"
        className="relative bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl max-w-md w-full animate-scaleIn"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 rounded-lg p-2 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Close review modal"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-400 shadow-[0_16px_36px_rgba(245,158,11,0.14)]">
          <Star className="h-5 w-5 fill-amber-400" />
        </div>

        <h2 id="appointment-review-title" className="mt-5 text-xl font-semibold text-white">
          Rate Your Experience
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Your feedback helps us keep every appointment polished, personal, and worth coming back for.
        </p>

        <div className="mt-6 flex items-center justify-center gap-2" onMouseLeave={() => setHoveredRating(0)}>
          {[1, 2, 3, 4, 5].map((starValue) => {
            const isSelected = starValue <= displayedRating;

            return (
              <button
                key={starValue}
                type="button"
                onMouseEnter={() => setHoveredRating(starValue)}
                onFocus={() => setHoveredRating(starValue)}
                onBlur={() => setHoveredRating(0)}
                onClick={() => setRating(starValue)}
                disabled={isSubmitting}
                className="rounded-lg p-1.5 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
              >
                <Star
                  className={`h-8 w-8 transition ${
                    isSelected
                      ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.55)]'
                      : 'text-zinc-600'
                  }`}
                />
              </button>
            );
          })}
        </div>

        <label className="mt-6 block text-sm font-medium text-zinc-300" htmlFor="appointment-review-feedback">
          Feedback
        </label>
        <textarea
          id="appointment-review-feedback"
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          disabled={isSubmitting}
          rows={4}
          placeholder="Share anything that made your visit memorable..."
          className="mt-2 w-full resize-none bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-lg p-2.5 text-sm focus:border-amber-500/50 outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            showPreferredPrompt ? 'mt-4 max-h-52 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <label className="block cursor-pointer rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 shadow-[0_14px_30px_rgba(245,158,11,0.08)]">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-5 text-amber-100">
                  You rated {stylistName} 5 Stars! ✨
                </span>
                <span className="mt-1 block text-xs leading-5 text-zinc-400">
                  Would you like to set them as your Preferred Stylist? This will automatically pre-select them for your future bookings to save your time.
                </span>
              </span>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                  makePreferred
                    ? 'border-amber-400 bg-amber-400 text-black'
                    : 'border-zinc-700 bg-zinc-900 text-transparent'
                }`}
              >
                <Check className="h-4 w-4" />
              </span>
            </div>
            <input
              type="checkbox"
              checked={makePreferred}
              onChange={(event) => setMakePreferred(event.target.checked)}
              disabled={isSubmitting}
              className="sr-only"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleSubmitReview}
          disabled={isSubmitting || !appointmentId || !rating}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-black shadow-lg shadow-amber-500/15 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Submitting Review...' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
}

export default AppointmentReviewModal;
