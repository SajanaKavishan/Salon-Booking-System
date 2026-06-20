import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Check, Globe, Loader2, Star, Trash2 } from 'lucide-react';
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
  const [deletingReviewId, setDeletingReviewId] = useState(null);

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

  const handleDelete = async (reviewId) => {
    if (!reviewId || deletingReviewId || !authConfig) return;

    setDeletingReviewId(reviewId);

    try {
      await axios.delete(`${API_BASE_URL}/appointments/${reviewId}/review`, authConfig);

      setReviews((currentReviews) => currentReviews.filter((review) => getReviewId(review) !== reviewId));
      toast.success('Review deleted');
      fetchReviews();
    } catch (error) {
      console.error('Delete Review Error:', error);
      toast.error(error.response?.data?.message || 'Could not delete review.');
    } finally {
      setDeletingReviewId(null);
    }
  };

  return (
    <div className="bg-zinc-950 min-h-screen text-zinc-100 p-6">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight text-white">
              Live Appointment Reviews
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Moderate verified appointment reviews before they appear publicly across the homepage experience.
            </p>
          </div>

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
                      const isDeleting = deletingReviewId === reviewId;
                      const stylistName = review?.stylist?.name || review?.staffId?.name || 'Not assigned';

                      return (
                        <article
                          key={reviewId}
                          className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 p-6 rounded-2xl shadow-xl flex flex-col justify-between transition-all duration-300 hover:border-zinc-700/50"
                        >
                          <div>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <h3 className="truncate text-lg font-semibold text-white">
                                  {review?.user?.name || 'Unknown Client'}
                                </h3>
                                <p className="mt-1 truncate text-sm text-zinc-500">
                                  {review?.user?.email || 'No email available'}
                                </p>
                              </div>

                              {isApproved ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.05)]">
                                  ● Live on Homepage
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.05)]">
                                  ● Pending Moderation
                                </span>
                              )}
                            </div>

                            <div className="mt-5 flex flex-wrap items-center gap-3">
                              <RatingStars rating={review?.rating} />
                              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                                {Number(review?.rating || 0).toFixed(1)} / 5
                              </span>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                              <span className="rounded-full border border-zinc-700/80 bg-zinc-950/70 px-3 py-1.5 text-xs font-medium text-zinc-300">
                                Stylist: {stylistName}
                              </span>

                              {services.length > 0 ? (
                                services.map((service, index) => (
                                  <span
                                    key={`${reviewId}-service-${index}`}
                                    className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-300"
                                  >
                                    {getServiceName(service)}
                                  </span>
                                ))
                              ) : (
                                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-500">
                                  No service listed
                                </span>
                              )}
                            </div>

                            <blockquote className="mt-5 rounded-xl border-l-2 border-amber-500/45 bg-zinc-950/70 px-4 py-4 text-sm leading-6 text-zinc-300">
                              {review?.feedback?.trim() || 'No written feedback provided.'}
                            </blockquote>

                            <div className="mt-5 text-xs text-zinc-500">
                              Submitted {formatDateTime(review?.updatedAt || review?.createdAt)}
                            </div>
                          </div>

                          <div className="mt-6 flex flex-col gap-3 border-t border-zinc-800/80 pt-5 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => handleToggleApproval(reviewId)}
                              disabled={isUpdating || isDeleting}
                              className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                                isApproved
                                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/10'
                              }`}
                            >
                              {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : isApproved ? (
                                <Globe className="h-4 w-4" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              {isApproved ? 'Hide From Live' : 'Approve to Live'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(reviewId)}
                              disabled={isDeleting || isUpdating}
                              className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Delete Review
                            </button>
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
