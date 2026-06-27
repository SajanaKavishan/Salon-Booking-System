import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Star } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getClientName = (review) => review?.user?.name || 'Valued Client';

const getStylistName = (review) => {
  const stylist = review?.stylist || review?.staffId;

  if (typeof stylist === 'object' && stylist?.name) return stylist.name;
  if (typeof stylist === 'string' && stylist.trim() && !/^[0-9a-fA-F]{24}$/.test(stylist)) return stylist;

  return 'Salon DEES Stylist';
};

const getServiceName = (review) => {
  const services = Array.isArray(review?.services) ? review.services : [];
  const firstService = services[0] || review?.service;

  if (typeof firstService === 'string') return firstService;
  if (firstService?.name) return firstService.name;

  return 'Premium Service';
};

function VerifiedSeal() {
  return (
    <span
      className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center text-white"
      aria-label="Verified customer"
      title="Verified customer"
    >
      <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full" fill="currentColor" aria-hidden="true">
        <path d="M12 1.6l2.05 2.3 3.03-.55.86 2.96 2.9 1.04-1.04 2.9 1.75 2.54-2.54 1.75-.25 3.07-3.07.25-1.75 2.54-2.54-1.75-2.9 1.04-1.04-2.9-2.96-.86.55-3.03L2.8 12l2.3-2.05-.55-3.03 2.96-.86 1.04-2.9 2.9 1.04L12 1.6Z" />
      </svg>
      <svg viewBox="0 0 24 24" className="relative h-3 w-3 text-zinc-950" fill="none" aria-hidden="true">
        <path d="M6.5 12.3l3.2 3.2 7.8-8.3" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function StaticStars({ rating }) {
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

function ReviewCard({ review }) {
  return (
    <article className="inline-block w-[min(78vw,20rem)] shrink-0 text-wrap rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 shadow-xl shadow-black/20 backdrop-blur-md sm:w-80 sm:p-5">
      <div className="min-w-0">
        <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-zinc-100">
          <span className="truncate">{getClientName(review)}</span>
          <VerifiedSeal />
        </h3>
      </div>

      <div className="mt-4">
        <StaticStars rating={review?.rating} />
      </div>

      <p className="text-zinc-300 text-sm italic mt-2 line-clamp-3 leading-6">
        "{review?.feedback?.trim() || 'A wonderful salon experience from start to finish.'}"
      </p>

      <p className="mt-4 truncate text-[11px] font-medium text-zinc-500 tracking-wide">
        {getServiceName(review)} - Stylist: {getStylistName(review)}
      </p>
    </article>
  );
}

function ReviewMarquee({ reviews: providedReviews }) {
  const [fetchedReviews, setFetchedReviews] = useState([]);
  const hasProvidedReviews = Array.isArray(providedReviews);
  const reviews = hasProvidedReviews ? providedReviews : fetchedReviews;

  useEffect(() => {
    if (hasProvidedReviews) return undefined;

    let isMounted = true;

    const fetchPublicReviews = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/appointments/reviews/public`);
        const publicReviews = Array.isArray(response.data) ? response.data : [];

        if (isMounted) {
          setFetchedReviews(publicReviews);
        }
      } catch (error) {
        console.error('Fetch Public Reviews Error:', error);
        if (isMounted) {
          setFetchedReviews([]);
        }
      }
    };

    fetchPublicReviews();

    return () => {
      isMounted = false;
    };
  }, [hasProvidedReviews]);

  const marqueeReviews = useMemo(() => [...reviews, ...reviews], [reviews]);

  if (reviews.length < 3) {
    return null;
  }

  return (
    <section className="relative border-y border-white/5 bg-zinc-950/70">
      <div className="mx-auto max-w-7xl overflow-hidden px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto mb-8 max-w-6xl text-center sm:mb-10">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300 sm:tracking-[0.22em]">
            Client Stories
          </span>
          <h2 className="mt-3 font-serif text-2xl text-white sm:text-3xl md:text-4xl">
            Verified Experiences, Shared Live
          </h2>
        </div>

        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-zinc-950 to-transparent sm:w-20"></div>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-zinc-950 to-transparent sm:w-20"></div>

          <div className="flex w-max animate-marquee gap-4 whitespace-nowrap hover:[animation-play-state:paused] sm:gap-6">
            {marqueeReviews.map((review, index) => (
              <ReviewCard key={`${review?._id || review?.id || 'review'}-${index}`} review={review} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ReviewMarquee;
