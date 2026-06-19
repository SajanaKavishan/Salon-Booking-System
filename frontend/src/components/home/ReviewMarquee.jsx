import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { BadgeCheck, Star } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

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
    <article className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 p-5 rounded-xl w-80 shrink-0 inline-block text-wrap shadow-xl shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-zinc-100">
            {getClientName(review)}
          </h3>
          <p className="mt-1 truncate text-zinc-400 text-xs">
            Styled by {getStylistName(review)}
          </p>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[0.65rem] font-semibold text-amber-300">
          <BadgeCheck className="h-3 w-3" />
          Verified Customer
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <StaticStars rating={review?.rating} />
        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-300">
          {getServiceName(review)}
        </span>
      </div>

      <p className="text-zinc-300 text-sm italic mt-2 line-clamp-3 leading-6">
        "{review?.feedback?.trim() || 'A wonderful salon experience from start to finish.'}"
      </p>
    </article>
  );
}

function ReviewMarquee() {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const fetchPublicReviews = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/appointments/reviews/public`);
        const publicReviews = Array.isArray(response.data) ? response.data : [];

        if (isMounted) {
          setReviews(publicReviews);
        }
      } catch (error) {
        console.error('Fetch Public Reviews Error:', error);
        if (isMounted) {
          setReviews([]);
        }
      }
    };

    fetchPublicReviews();

    return () => {
      isMounted = false;
    };
  }, []);

  const marqueeReviews = useMemo(() => [...reviews, ...reviews], [reviews]);

  if (reviews.length < 3) {
    return null;
  }

  return (
    <section className="relative overflow-hidden border-y border-white/5 bg-zinc-950/70 py-16">
      <div className="mx-auto mb-10 max-w-6xl px-6 text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
          Client Stories
        </span>
        <h2 className="mt-3 font-serif text-3xl text-white md:text-4xl">
          Verified Experiences, Shared Live
        </h2>
      </div>

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-zinc-950 to-transparent"></div>
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-zinc-950 to-transparent"></div>

        <div className="flex w-max animate-marquee gap-6 whitespace-nowrap hover:[animation-play-state:paused]">
          {marqueeReviews.map((review, index) => (
            <ReviewCard key={`${review?._id || review?.id || 'review'}-${index}`} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default ReviewMarquee;
