import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, Loader2, MessageSquareQuote, RefreshCw, Star } from 'lucide-react';
import { toast } from 'react-toastify';

const API_BASE_URL = 'http://localhost:5000/api';

const formatDateTime = (dateValue) => {
  if (!dateValue) return 'Date unavailable';

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return 'Date unavailable';

  return parsedDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getReviewId = (review) => review?._id || review?.id;

const getServiceItems = (review) => {
  if (Array.isArray(review?.services) && review.services.length > 0) {
    return review.services;
  }

  if (review?.service) return [review.service];

  return [];
};

const getServiceName = (service) => {
  if (typeof service === 'string') return service;
  return service?.name || 'Service';
};

function RatingStars({ rating }) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));

  return (
    <div className="flex items-center gap-1" aria-label={`${safeRating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((starValue) => {
        const isFilled = starValue <= safeRating;

        return (
          <Star
            key={starValue}
            className={`h-4 w-4 ${
              isFilled ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'
            }`}
          />
        );
      })}
    </div>
  );
}

function ReviewManagement() {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingReviewId, setUpdatingReviewId] = useState(null);

  const authConfig = useMemo(() => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : null;
  }, []);

  const fetchReviews = useCallback(async () => {
    if (!authConfig) {
      toast.error('Please log in again to manage reviews.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/appointments/reviews/all`, authConfig);
      setReviews(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Fetch Reviews Error:', error);
      toast.error(error.response?.data?.message || 'Could not load appointment reviews.');
    } finally {
      setIsLoading(false);
    }
  }, [authConfig]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const groupedReviews = useMemo(() => {
    const approved = [];
    const pending = [];

    reviews.forEach((review) => {
      if (review?.isReviewApproved) {
        approved.push(review);
      } else {
        pending.push(review);
      }
    });

    return [
      { key: 'pending', title: 'Pending Review', reviews: pending },
      { key: 'approved', title: 'Approved & Live', reviews: approved },
    ];
  }, [reviews]);

  const handleToggleApproval = async (reviewId) => {
    if (!reviewId || updatingReviewId || !authConfig) return;

    setUpdatingReviewId(reviewId);

    try {
      const response = await axios.put(
        `${API_BASE_URL}/appointments/${reviewId}/review-approve`,
        {},
        authConfig
      );
      const updatedAppointment = response.data?.appointment;

      setReviews((currentReviews) => currentReviews.map((review) => (
        getReviewId(review) === reviewId ? { ...review, ...updatedAppointment } : review
      )));

      toast.success('Review status updated!');
      fetchReviews();
    } catch (error) {
      console.error('Toggle Review Approval Error:', error);
      toast.error(error.response?.data?.message || 'Could not update review status.');
    } finally {
      setUpdatingReviewId(null);
    }
  };

  return (
    <div className="bg-zinc-950 min-h-screen text-zinc-100 p-6">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
              <MessageSquareQuote className="h-3.5 w-3.5" />
              Live Review Engine
            </div>
            <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight text-white">
              Review Management
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Moderate verified appointment reviews before they appear publicly across the homepage experience.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchReviews}
            disabled={isLoading}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-amber-500/40 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/45 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Total Reviews</p>
            <p className="mt-2 text-2xl font-bold text-white">{reviews.length}</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-amber-300/80">Pending</p>
            <p className="mt-2 text-2xl font-bold text-amber-300">
              {reviews.filter((review) => !review?.isReviewApproved).length}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">Live</p>
            <p className="mt-2 text-2xl font-bold text-emerald-300">
              {reviews.filter((review) => review?.isReviewApproved).length}
            </p>
          </div>
        </section>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                <div className="h-4 w-32 animate-pulse rounded bg-white/10"></div>
                <div className="mt-4 h-5 w-44 animate-pulse rounded bg-white/10"></div>
                <div className="mt-3 h-4 w-24 animate-pulse rounded bg-white/10"></div>
                <div className="mt-6 h-20 animate-pulse rounded-lg bg-white/10"></div>
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-300">
              <Star className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-white">No reviews yet</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Completed appointment reviews will appear here for moderation.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedReviews.map((group) => (
              <section key={group.key}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-white">{group.title}</h2>
                  <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-400">
                    {group.reviews.length}
                  </span>
                </div>

                {group.reviews.length === 0 ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 text-sm text-zinc-500">
                    No {group.title.toLowerCase()} reviews.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {group.reviews.map((review) => {
                      const reviewId = getReviewId(review);
                      const services = getServiceItems(review);
                      const isApproved = review?.isReviewApproved === true;
                      const isUpdating = updatingReviewId === reviewId;

                      return (
                        <article
                          key={reviewId}
                          className="flex min-h-[320px] flex-col rounded-xl border border-zinc-800 bg-zinc-900/45 p-5 shadow-xl shadow-black/20 transition hover:border-amber-500/25 hover:bg-zinc-900/70"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate text-base font-semibold text-white">
                                {review?.user?.name || 'Unknown Client'}
                              </h3>
                              <p className="mt-1 truncate text-xs text-zinc-500">
                                {review?.user?.email || 'No email available'}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleApproval(reviewId)}
                              disabled={isUpdating}
                              className={
                                isApproved
                                  ? 'border border-emerald-500/30 text-emerald-400 bg-emerald-500/5 px-2.5 py-1 rounded-md text-xs flex items-center gap-1 hover:bg-emerald-500/10 transition-all disabled:cursor-not-allowed disabled:opacity-60'
                                  : 'border border-zinc-800 text-zinc-400 px-2.5 py-1 rounded-md text-xs flex items-center gap-1 hover:bg-zinc-900 transition-all disabled:cursor-not-allowed disabled:opacity-60'
                              }
                            >
                              {isUpdating ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : isApproved ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <MessageSquareQuote className="h-3.5 w-3.5" />
                              )}
                              {isApproved ? '✨ Approved & Live' : '📁 Pending Review'}
                            </button>
                          </div>

                          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                            <span>Stylist</span>
                            <span className="h-1 w-1 rounded-full bg-zinc-700"></span>
                            <span className="font-medium text-zinc-200">
                              {review?.stylist?.name || review?.staffId?.name || 'Not assigned'}
                            </span>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {services.length > 0 ? (
                              services.map((service, index) => (
                                <span
                                  key={`${reviewId}-service-${index}`}
                                  className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-300"
                                >
                                  {getServiceName(service)}
                                </span>
                              ))
                            ) : (
                              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-500">
                                No service listed
                              </span>
                            )}
                          </div>

                          <div className="mt-5 flex items-center justify-between gap-3 border-t border-zinc-800 pt-4">
                            <RatingStars rating={review?.rating} />
                            <span className="text-xs font-semibold text-amber-300">
                              {Number(review?.rating || 0).toFixed(1)}
                            </span>
                          </div>

                          <blockquote className="mt-5 flex-1 rounded-lg border-l-2 border-amber-500/45 bg-zinc-950/70 px-4 py-3 text-sm leading-6 text-zinc-300">
                            {review?.feedback?.trim() || 'No written feedback provided.'}
                          </blockquote>

                          <div className="mt-5 text-xs text-zinc-500">
                            Submitted {formatDateTime(review?.updatedAt || review?.createdAt)}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReviewManagement;
