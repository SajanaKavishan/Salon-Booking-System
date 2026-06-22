import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Check, Loader2, Sparkles, UserRound, X } from 'lucide-react';
import { toast } from 'react-toastify';

const BACKEND_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

const getStaffId = (staff) => staff?.userId || staff?._id || staff?.id || '';

const getImageUrl = (imageUrl) => {
  if (!imageUrl) return '';
  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith('data:')) return imageUrl;
  return `${BACKEND_BASE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
};

const formatRating = (rating) => Number(rating || 0).toFixed(1);

function StylistOnboardingModal({ isOpen, onClose, user, onStylistSelected }) {
  const [stylists, setStylists] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStylistId, setSelectedStylistId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const fetchStylists = async () => {
      setIsLoading(true);

      try {
        const response = await axios.get(`${BACKEND_BASE_URL}/api/staff/performance`);
        const activeStylists = Array.isArray(response.data)
          ? response.data.filter((staff) => (
              staff?.name
              && staff?.active !== false
              && staff?.isActive !== false
              && String(staff?.status || '').toLowerCase() !== 'inactive'
            ))
          : [];

        if (isMounted) {
          setStylists(activeStylists);
        }
      } catch (error) {
        console.error('Fetch Staff Error:', error);
        toast.error(error.response?.data?.message || 'Unable to load stylists right now.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStylists();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedStylistId(null);
      setIsSaving(false);
    }
  }, [isOpen]);

  const sortedStylists = useMemo(
    () => [...stylists].sort((first, second) => {
      const ratingDifference = Number(second?.averageRating || 0) - Number(first?.averageRating || 0);
      if (ratingDifference !== 0) return ratingDifference;

      const reviewDifference = Number(second?.totalReviewsCount || 0) - Number(first?.totalReviewsCount || 0);
      if (reviewDifference !== 0) return reviewDifference;

      return String(first?.name || '').localeCompare(String(second?.name || ''));
    }),
    [stylists]
  );

  const selectedStylist = useMemo(
    () => sortedStylists.find((stylist) => getStaffId(stylist) === selectedStylistId),
    [selectedStylistId, sortedStylists]
  );

  const handleClose = () => {
    if (!isSaving) {
      onClose?.();
    }
  };

  const handleStylistSelect = (stylist) => {
    const stylistId = getStaffId(stylist);

    if (!stylistId || isSaving) return;

    setSelectedStylistId(stylistId);
  };

  const handleConfirmSelection = async () => {
    if (!selectedStylist || !selectedStylistId || isSaving) return;

    setIsSaving(true);

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        toast.error('Please log in again to save your preferred stylist.');
        return;
      }

      const response = await axios.put(
        `${BACKEND_BASE_URL}/api/users/profile`,
        { preferredStylist: selectedStylistId },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const updatedUser = {
        ...(user || {}),
        ...(response.data || {}),
        preferredStylist: response.data?.preferredStylist || selectedStylistId
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: updatedUser }));

      toast.success(`${selectedStylist.name} is now your preferred stylist.`);
      onStylistSelected?.(updatedUser);
      onClose?.();
    } catch (error) {
      console.error('Preferred Stylist Update Error:', error);
      toast.error(error.response?.data?.message || 'Unable to save your preferred stylist right now.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      role="presentation"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stylist-onboarding-title"
        className="relative flex w-full max-w-2xl flex-col space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-8 pb-28 shadow-2xl animate-scaleIn"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={isSaving}
          className="absolute right-4 top-4 rounded-lg p-2 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Close stylist onboarding"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#D4AF37] shadow-[0_16px_36px_rgba(212,175,55,0.12)]">
          <Sparkles className="h-5 w-5" />
        </div>

        <div className="space-y-3">
          <h2
            id="stylist-onboarding-title"
            className="flex items-center justify-center gap-2 text-balance text-center text-2xl font-bold tracking-tight text-zinc-100"
          >
            <span aria-hidden="true">✨</span>
            <span>Welcome to SalonDees Luxury Experience!</span>
          </h2>
          <p className="mx-auto max-w-xl text-center text-sm leading-6 text-zinc-400">
            Choose your preferred stylist to pre-select them for all your future appointments. You can always change this later.
          </p>
        </div>

        <div>
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
              ))}
            </div>
          ) : sortedStylists.length > 0 ? (
            <div className="grid max-h-[22rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              {sortedStylists.map((stylist) => {
                const stylistId = getStaffId(stylist);
                const imageSrc = getImageUrl(stylist.imageUrl || stylist.profileImage);
                const isSelected = selectedStylistId === stylistId;

                return (
                  <button
                    key={stylist._id || stylist.id || stylist.name}
                    type="button"
                    onClick={() => handleStylistSelect(stylist)}
                    disabled={isSaving || !stylistId}
                    className={`group flex min-h-24 items-center gap-4 rounded-xl p-4 text-left transition-all disabled:cursor-not-allowed ${
                      isSelected
                        ? 'border border-amber-500/80 bg-zinc-900/80 opacity-100 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                        : 'border border-zinc-800 bg-zinc-900/30 opacity-60 hover:border-zinc-700 hover:opacity-100'
                    }`}
                  >
                    <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#D4AF37]">
                      <UserRound className="h-6 w-6" />
                      {imageSrc && (
                        <img
                          src={imageSrc}
                          alt={stylist.name}
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">{stylist.name}</span>
                      <span className="mt-1 flex items-center gap-1 text-sm font-semibold text-amber-400">
                        <span aria-hidden="true">★</span>
                        <span>
                          {formatRating(stylist.averageRating)} ({stylist.totalReviewsCount || 0} reviews)
                        </span>
                      </span>
                      {stylist.specialty && (
                        <span className="mt-2 inline-flex max-w-full rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
                          <span className="truncate">{stylist.specialty}</span>
                        </span>
                      )}
                    </span>

                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500 text-neutral-950 shadow-[0_0_18px_rgba(245,158,11,0.25)]'
                          : 'border-zinc-700 bg-zinc-950/80 text-transparent group-hover:border-zinc-500'
                      }`}
                    >
                      <Check className="h-4 w-4" />
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.025] p-6 text-sm text-zinc-400">
              No stylists are available right now. You can skip this and choose one while booking.
            </div>
          )}
        </div>

        <p className="pr-0 text-center text-xs leading-5 text-zinc-500 sm:pr-56 sm:text-left">
          Your choice keeps booking faster and more personal.
        </p>

        <div className="absolute bottom-8 left-8 right-8 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2.5 text-sm font-medium text-zinc-500 transition-all hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Skip for Now
          </button>

          {selectedStylistId && (
            <button
              type="button"
              onClick={handleConfirmSelection}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 font-bold text-neutral-950 shadow-lg transition-all hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? 'Confirming...' : 'Confirm Selection'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default StylistOnboardingModal;
