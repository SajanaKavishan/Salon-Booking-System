import React, { useEffect, useMemo, useState } from 'react';
import axiosInstance from 'axios'; 
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Sparkles,
  Star,
} from 'lucide-react';

const BACKEND_BASE_URL = 'http://localhost:5000';
const FALLBACK_STAFF_IMAGE = '/Owner.jpg';

const onboardingImages = {
  1: 'https://images.unsplash.com/photo-1599696848652-f0ff23bc911f?crop=entropy&cs=tinysrgb&fit=max&fm=webp&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBtaW5pbWFsaXN0JTIwc2Fsb24lMjBpbnRlcmlvciUyMGRhcmt8ZW58MXx8fHwxNzgyODMxMzE5fDA&ixlib=rb-4.1.0&q=95&w=2400',
  2: 'https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?crop=entropy&cs=tinysrgb&fit=max&fm=webp&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBoYWlyJTIwc2Fsb24lMjBzdHlsaW5nJTIwc2VydmljZXxlbnwxfHx8fDE3ODIwMzMwMzB8MA&ixlib=rb-4.1.0&q=95&w=2400',
  3: 'https://images.unsplash.com/photo-1635346125627-74d1b2867898?crop=entropy&cs=tinysrgb&fit=max&fm=webp&ixid=M3w3Nzg4Nzd8MHwxfHxoYWlyJTIwc3R5bGlzdCUyMGN1dHRpbmclMjBoYWlyJTIwc2Fsb24lMjBkYXJrfGVufDF8fHx8MTtextIwMzMwMzB8MA&ixlib=rb-4.1.0&q=95&w=2400',
  4: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?crop=entropy&cs=tinysrgb&fit=max&fm=webp&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dGlmdWwlMjB3b21hbiUyMHBlcmZlY3QlMjBoYWlyJTIwYmxvd291dCUyMHBvcnRyYWl0JTIwZGFya3xlbnwxfHx8fDE3ODIwMzMwMzB8MA&ixlib=rb-4.1.0&q=95&w=2400',
};

const steps = {
  1: {
    title: 'Welcome to SalonDEES',
    subtitle:
      'Experience a new standard of luxury hair care and styling. Your personalized journey begins here, where every detail is tailored to your unique aesthetic.',
    image: onboardingImages[1],
    eyebrow: 'Private Client Onboarding',
  },
  2: {
    title: 'Elevated Experience',
    subtitle: 'Discover the exclusive benefits of our digital concierge.',
    image: onboardingImages[2],
    eyebrow: 'Digital Concierge',
  },
  3: {
    title: 'Select a Master Stylist',
    subtitle: 'Choose an expert whose vision aligns with yours.',
    image: onboardingImages[3],
    eyebrow: 'Signature Artist',
  },
  4: {
    title: 'Your Luxury Journey Begins Now',
    subtitle: 'Your profile is configured for the ultimate SalonDEES experience. Book your first appointment now.',
    image: onboardingImages[4],
    eyebrow: 'Suite Unlocked',
  },
};

const benefits = [
  {
    title: 'Priority Booking',
    description: 'Access our exclusive schedule with instant reservations and seamless rescheduling.',
    icon: CalendarDays,
  },
  {
    title: 'Bespoke Profiles',
    description: 'We save your precise color formulas, styling preferences, and past services.',
    icon: Award,
  },
  {
    title: 'Digital Concierge',
    description: 'Enjoy automated reminders, fast check-ins, and direct stylist communication.',
    icon: Clock3,
  },
];

const fallbackStylists = [
  { _id: 'fallback-elena', name: 'Elena Rostova', specialty: 'Creative Director', imageUrl: '/Owner.jpg' },
  { _id: 'fallback-marcus', name: 'Marcus Vane', specialty: 'Master Barber & Stylist', imageUrl: '/heroBg.jpg' },
  { _id: 'fallback-sophia', name: 'Sophia Chen', specialty: 'Senior Colorist', imageUrl: '/SchoolHaircut.jpg' },
];

const screenVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.55, ease: 'easeOut', staggerChildren: 0.08 },
  },
  exit: { opacity: 0, transition: { duration: 0.34, ease: 'easeInOut' } },
};

const contentVariants = {
  initial: { opacity: 0, x: 26 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.08 },
  },
  exit: { opacity: 0, x: -20, transition: { duration: 0.26, ease: 'easeInOut' } },
};

const itemVariants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.44, ease: 'easeOut' } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.18 } },
};

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

function getStaffId(staff) {
  return staff?.userId || staff?._id || staff?.id || '';
}

function getImageUrl(imageUrl) {
  if (!imageUrl) return FALLBACK_STAFF_IMAGE;
  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith('data:')) return imageUrl;
  if (imageUrl.startsWith('/uploads')) return `${BACKEND_BASE_URL}${imageUrl}`;
  return imageUrl.startsWith('/') ? imageUrl : `${BACKEND_BASE_URL}/${imageUrl}`;
}

const formatRating = (rating) => Number(rating || 0).toFixed(1);
const formatReviewCount = (count) => Number(count || 0);

function StepProgress({ currentStep }) {
  return (
    <div className="fixed right-6 top-4 z-[80] flex items-center gap-3 sm:right-12 sm:top-4">
      {[1, 2, 3, 4].map((step) => (
        <motion.span
          key={step}
          className={`h-2 rounded-full ${step === currentStep ? 'bg-[#D4AF37]' : 'bg-white/15'}`}
          animate={{
            width: step === currentStep ? 40 : 19,
            opacity: step === currentStep ? 1 : 0.64,
            boxShadow: step === currentStep ? '0 0 18px rgba(212,175,55,0.78)' : 'none',
          }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled = false, variant = 'filled', liftOnHover = true, className = '' }) {
  const styles = variant === 'outline'
    ? 'border border-[#D4AF37]/60 bg-white/[0.025] text-[#D4AF37] shadow-[0_0_34px_rgba(212,175,55,0.12)] hover:bg-[#D4AF37]/10'
    : 'border border-[#D4AF37] bg-[#D4AF37] text-black shadow-[0_0_34px_rgba(212,175,55,0.28)] hover:bg-[#efc748]';

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      whileHover={!disabled && liftOnHover ? { y: -2 } : undefined}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={`group inline-flex items-center justify-center gap-3 rounded-full px-8 py-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`}
    >
      {children}
    </motion.button>
  );
}

function StylistCard({
  stylist,
  hoveredStylistId,
  selectedStylistId,
  setHoveredStylistId,
  setSelectedStylistId,
}) {
  const stylistId = getStaffId(stylist);
  const isHovered = hoveredStylistId === stylistId;
  const isMuted = hoveredStylistId && !isHovered;
  const isSelected = selectedStylistId === stylistId;
  const specialty = stylist.specialty || 'Luxury Artist';
  const experience = stylist.experience
    || stylist.experienceLevel
    || (stylist.yearsOfExperience ? `${stylist.yearsOfExperience}+ years experience` : 'Expert Stylist');

  return (
    <motion.button
      layout
      type="button"
      variants={itemVariants}
      onMouseEnter={() => setHoveredStylistId(stylistId)}
      onMouseLeave={() => setHoveredStylistId(null)}
      onFocus={() => setHoveredStylistId(stylistId)}
      onBlur={() => setHoveredStylistId(null)}
      onClick={() => setSelectedStylistId(stylistId)}
      animate={{
        opacity: isMuted ? 0.4 : 1,
        scale: isHovered ? 1.025 : 1,
        borderColor: isSelected
          ? 'rgba(212,175,55,0.95)'
          : isHovered
            ? 'rgba(212,175,55,0.58)'
            : 'rgba(255,255,255,0.1)',
        boxShadow: isHovered
          ? '0 24px 55px rgba(0,0,0,0.42), 0 0 28px rgba(245,158,11,0.18)'
          : isSelected
            ? '0 0 0 1px rgba(212,175,55,0.48), 0 22px 44px rgba(0,0,0,0.38), 0 0 30px rgba(212,175,55,0.12)'
            : '0 18px 34px rgba(0,0,0,0.24)',
      }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="group w-[72vw] max-w-[17rem] shrink-0 overflow-hidden rounded-[18px] border bg-[#141417]/95 text-left backdrop-blur-xl sm:w-[13rem] lg:w-[10.25rem] xl:w-[10.85rem]"
    >
      <div className="relative h-[14rem] overflow-hidden bg-zinc-900 lg:h-[15rem] xl:h-[16rem]">
        <img
          src={getImageUrl(stylist.imageUrl || stylist.profileImage)}
          alt={stylist.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover object-center transform scale-100 will-change-transform transition duration-300 group-hover:scale-[1.04]"
          onError={(event) => {
            event.currentTarget.src = FALLBACK_STAFF_IMAGE;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141417] via-black/8 to-transparent" />
        <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-black/72 px-3 py-1.5 text-sm font-bold text-white shadow-lg backdrop-blur">
          <Star className="h-4 w-4 fill-[#D4AF37] text-[#D4AF37]" />
          <span>{formatRating(stylist.averageRating)}</span>
          <span className="text-xs font-medium text-white/48">({formatReviewCount(stylist.totalReviewsCount)})</span>
        </div>
      </div>

      <div className="flex min-h-[15.5rem] flex-col p-5 lg:min-h-[18.4rem] lg:p-6">
        <div>
          <h3 className="font-serif text-[1.55rem] leading-tight text-white lg:text-[1.72rem]">
            {stylist.name}
          </h3>
          <p className="mt-2 text-[0.82rem] font-medium leading-5 text-white/50">
            {experience}
          </p>
          <p className="mt-4 text-[0.82rem] font-bold uppercase leading-5 tracking-[0.12em] text-[#D4AF37]">
            {specialty}
          </p>
        </div>

        <AnimatePresence initial={false}>
          {isSelected && (
            <motion.div
              key="selected-badge"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="mt-auto flex items-center justify-center gap-2 rounded-full border border-[#D4AF37]/45 bg-[#D4AF37]/10 px-4 py-2 text-[0.78rem] font-bold uppercase tracking-[0.16em] text-[#D4AF37]"
            >
              <CheckCircle2 className="h-4 w-4" />
              Selected
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}

function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedStylistId, setSelectedStylistId] = useState(null);
  const [hoveredStylistId, setHoveredStylistId] = useState(null);
  const [stylists, setStylists] = useState([]);
  const [isLoadingStylists, setIsLoadingStylists] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const storedUser = useMemo(getStoredUser, []);
  const activeStep = steps[currentStep];
  const displayStylists = stylists.length ? stylists : fallbackStylists;
  const selectedRealStylistId = stylists.some((staff) => getStaffId(staff) === selectedStylistId)
    ? selectedStylistId
    : null;

  useEffect(() => {
    if (storedUser?.isFirstLogin === false) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, storedUser]);

  useEffect(() => {
    let isActive = true;

    const fetchStylists = async () => {
      setIsLoadingStylists(true);
      try {
        const response = await axiosInstance.get('/api/staff/performance');
        if (isActive) {
          setStylists(Array.isArray(response.data) ? response.data.filter((staff) => staff?.name) : []);
        }
      } catch (error) {
        console.error('Fetch onboarding stylists error:', error);
        if (isActive) setStylists([]);
      } finally {
        if (isActive) setIsLoadingStylists(false);
      }
    };

    fetchStylists();
    return () => {
      isActive = false;
    };
  }, []);

  const goToStep = (step) => {
    setHoveredStylistId(null);
    setCurrentStep(step);
  };

  const completeOnboarding = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    setIsCompleting(true);

    try {
      const response = await axiosInstance.patch(
        '/api/users/complete-onboarding',
        selectedRealStylistId ? { preferredStylist: selectedRealStylistId } : {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const nextUser = {
        ...(getStoredUser() || {}),
        ...(response.data?.user || {}),
        isFirstLogin: false,
      };

      localStorage.setItem('user', JSON.stringify(nextUser));
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: nextUser }));
      toast.success('Your SalonDEES suite is ready.');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to complete onboarding. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  const renderContent = () => {
    if (currentStep === 1) {
      return (
        <motion.div
          variants={contentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="flex w-full max-w-[540px] flex-col items-center text-center lg:ml-auto lg:items-start lg:text-left"
        >
          <motion.div variants={itemVariants} className="mb-7 flex h-[58px] w-[58px] items-center justify-center rounded-full border border-[#D4AF37]/55 bg-[#D4AF37]/10 text-[#D4AF37] shadow-[0_0_45px_rgba(212,175,55,0.13)] lg:mb-10 lg:h-[64px] lg:w-[64px]">
            <Sparkles className="h-6 w-6 lg:h-7 lg:w-7" />
          </motion.div>
          <motion.h1 variants={itemVariants} className="font-serif text-4xl leading-[1.08] text-white sm:text-5xl lg:text-[4.15rem] lg:leading-[1.06] xl:text-[5.65rem]">
            Welcome to
            <span className="relative mx-auto block w-fit pr-5 lg:mx-0">
              <span className="bg-gradient-to-r from-[#D4AF37] via-[#efd869] to-[#F3E5AB] bg-clip-text text-transparent">
                SalonDEES
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-r from-transparent to-[#050506]" />
            </span>
          </motion.h1>
          <motion.p variants={itemVariants} className="mt-6 max-w-[520px] text-base leading-7 text-[#b7bdc9] sm:text-lg lg:mt-9 lg:text-[1.32rem] lg:leading-[1.75]">
            {activeStep.subtitle}
          </motion.p>
          <motion.div variants={itemVariants} className="mt-9 w-full max-w-[18rem] lg:mt-14 lg:max-w-none">
            <PrimaryButton
              variant="outline"
              liftOnHover={false}
              onClick={() => goToStep(2)}
              className="w-full min-w-0 rounded-[30px] border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-8 py-[1.05rem] text-base text-white shadow-none backdrop-blur-md transition-all duration-300 ease-out hover:border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.075)] hover:shadow-[0_18px_45px_rgba(0,0,0,0.32)] lg:w-auto lg:min-w-[255px] lg:px-10 lg:py-[1.15rem] lg:text-[1.08rem]"
            >
              Begin Journey
              <span className="ml-4 inline-block text-lg font-normal leading-none text-white/95 transition-transform duration-300 ease-out group-hover:translate-x-1.5">
                &gt;
              </span>
            </PrimaryButton>
          </motion.div>
        </motion.div>
      );
    }

    if (currentStep === 2) {
      return (
        <motion.div variants={contentVariants} initial="initial" animate="animate" exit="exit" className="w-full max-w-[550px] text-center lg:text-left">
          <motion.h1 variants={itemVariants} className="font-serif text-4xl leading-tight text-white sm:text-5xl lg:text-[3.25rem] lg:leading-none">
            {activeStep.title}
          </motion.h1>
          <motion.p variants={itemVariants} className="mx-auto mt-4 max-w-[540px] text-base leading-7 text-[#b7bdc9] sm:text-lg lg:mx-0 lg:mt-5 lg:text-[1.38rem] lg:leading-tight">
            {activeStep.subtitle}
          </motion.p>
          <motion.div variants={itemVariants} className="mt-9 grid gap-4 lg:mt-14 lg:gap-6">
            {benefits.map(({ title, description, icon: Icon }) => (
              <motion.div
                key={title}
                whileHover={{ x: 6, borderColor: 'rgba(212,175,55,0.42)' }}
                className="grid min-h-[128px] justify-items-center gap-4 rounded-[20px] border border-white/[0.09] bg-[#0d0d10]/82 p-5 text-center shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:min-h-[145px] lg:grid-cols-[auto_1fr] lg:justify-items-start lg:gap-6 lg:p-7 lg:text-left"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-[#D4AF37] lg:mt-1 lg:h-12 lg:w-12">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-serif text-[1.35rem] text-white lg:text-2xl">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400 lg:text-[1.03rem] lg:leading-7">{description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
          <motion.div variants={itemVariants} className="mt-8 flex justify-center lg:mt-10 lg:justify-start">
            <PrimaryButton onClick={() => goToStep(3)} className="w-full max-w-[14rem] min-w-0 rounded-full px-10 py-4 text-[1.02rem] lg:w-auto">
              Continue
            </PrimaryButton>
          </motion.div>
        </motion.div>
      );
    }

    if (currentStep === 3) {
      return (
        <motion.div
          variants={contentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full max-w-[37rem] text-center lg:text-left"
        >
          <motion.h1 variants={itemVariants} className="font-serif text-4xl leading-tight text-white sm:text-5xl lg:text-[3.05rem] lg:leading-none">
            {activeStep.title}
          </motion.h1>
          <motion.p variants={itemVariants} className="mx-auto mt-4 max-w-[32rem] text-base leading-7 text-[#b9c0d2] sm:text-lg lg:mx-0 lg:text-[1.28rem] lg:leading-tight">
            {activeStep.subtitle}
          </motion.p>
          <motion.div
            variants={itemVariants}
            className="salon-scrollbar -mx-6 mt-6 flex min-w-0 snap-x gap-4 overflow-x-auto overflow-y-visible scroll-px-6 px-6 pb-5 pt-1 sm:-mx-8 sm:px-8 lg:-mx-1 lg:gap-5 lg:px-1 lg:pb-4"
          >
            {isLoadingStylists
              ? [1, 2, 3].map((item) => (
                  <div key={item} className="h-[30rem] w-[72vw] max-w-[17rem] shrink-0 animate-pulse rounded-[18px] border border-white/10 bg-white/[0.04] sm:w-[13rem] lg:h-[34.5rem] lg:w-[10.25rem] xl:w-[10.85rem]" />
                ))
              : displayStylists.map((stylist) => (
                  <div key={getStaffId(stylist) || stylist.name} className="snap-start">
                    <StylistCard
                      stylist={stylist}
                      hoveredStylistId={hoveredStylistId}
                      selectedStylistId={selectedStylistId}
                      setHoveredStylistId={setHoveredStylistId}
                      setSelectedStylistId={setSelectedStylistId}
                    />
                  </div>
                ))}
          </motion.div>
          {!isLoadingStylists && stylists.length === 0 && (
            <motion.p variants={itemVariants} className="mt-4 text-sm text-amber-200/70">
              Showing preview stylists because the staff list could not be loaded.
            </motion.p>
          )}
          <motion.div variants={itemVariants} className="mt-6 flex flex-col items-center justify-center gap-4 border-t border-white/10 pt-6 sm:flex-row lg:mt-8 lg:justify-end lg:gap-10">
            <button
              type="button"
              onClick={() => goToStep(4)}
              className="text-sm font-semibold text-slate-300 transition hover:text-white sm:text-base"
            >
              Skip for Now
            </button>
            <PrimaryButton onClick={() => goToStep(4)} className="w-full max-w-[14rem] min-w-0 rounded-full bg-[#f5a400] px-10 py-4 text-[1.05rem] shadow-[0_0_26px_rgba(245,164,0,0.32)] hover:bg-[#ffb21a] sm:w-auto sm:min-w-[150px]">
              Continue
            </PrimaryButton>
          </motion.div>
        </motion.div>
      );
    }

    return (
      <motion.div variants={contentVariants} initial="initial" animate="animate" exit="exit" className="flex w-full max-w-[560px] flex-col items-center text-center">
        {/* 👑 REFACTORED HIGHER BASE LUXURY BREATHING GLOW (NEVER DISAPPEARS) */}
        <motion.div 
          variants={itemVariants} 
          animate={{
            boxShadow: [
              "0 0 30px 4px rgba(212,175,55,0.35), inset 0 0 15px rgba(212,175,55,0.2)",
              "0 0 65px 14px rgba(212,175,55,0.75), inset 0 0 20px rgba(212,175,55,0.4)",
              "0 0 30px 4px rgba(212,175,55,0.35), inset 0 0 15px rgba(212,175,55,0.2)"
            ],
            borderColor: [
              "rgba(212,175,55,0.45)",
              "rgba(212,175,55,0.9)",
              "rgba(212,175,55,0.45)"
            ],
            scale: [1, 1.025, 1]
          }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border bg-[#D4AF37]/15 text-[#D4AF37] shadow-[0_0_30px_4px_rgba(212,175,55,0.35)] lg:mb-10 lg:h-24 lg:w-24"
        >
          <Sparkles className="h-8 w-8 filter drop-shadow-[0_0_6px_rgba(212,175,55,0.4)] lg:h-10 lg:w-10" />
        </motion.div>
        
        <motion.h1 variants={itemVariants} className="font-serif text-4xl leading-[1.12] text-center text-white sm:text-5xl lg:text-6xl lg:leading-[1.1]">
          {activeStep.title}
        </motion.h1>
        <motion.p variants={itemVariants} className="mt-6 max-w-[32rem] text-center text-base leading-7 text-slate-300 sm:text-lg lg:mt-7 lg:leading-8">
          {activeStep.subtitle}
        </motion.p>
        <motion.div variants={itemVariants} className="mt-9 flex w-full justify-center lg:mt-12">
          <PrimaryButton
            variant="outline"
            onClick={completeOnboarding}
            disabled={isCompleting}
            className="w-full max-w-[20rem] px-6 py-4 text-xs tracking-[0.14em] sm:px-10 sm:text-sm lg:py-5 lg:tracking-[0.18em]"
          >
            {isCompleting ? 'PREPARING YOUR SUITE...' : 'EXPERIENCE YOUR SUITE'}
          </PrimaryButton>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <main className="flex min-h-screen w-screen overflow-x-hidden bg-[#050506] text-white lg:h-screen lg:overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.section
          key={currentStep}
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#050506] lg:block lg:h-full lg:min-h-0 lg:overflow-hidden"
        >
          <div className="relative z-0 h-[42vh] min-h-[17rem] w-full shrink-0 overflow-hidden lg:hidden">
            <img
              src={activeStep.image}
              alt=""
              aria-hidden="true"
              decoding="async"
              fetchPriority="high"
              className={`h-full w-full object-cover ${
                currentStep === 1 ? 'object-left' : 'object-center'
              } ${currentStep === 3 ? 'grayscale' : ''}`}
            />
            <div className="absolute inset-0 bg-black/35" />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#050506] via-[#050506]/70 to-transparent" />
          </div>

          {/* Desktop fixed left image */}
          {currentStep === 1 ? (
            <div
              className="absolute inset-0 hidden pointer-events-none bg-no-repeat lg:block"
              style={{
                backgroundImage: `linear-gradient(90deg, rgba(5,5,6,0.36) 0%, rgba(5,5,6,0.42) 34%, rgba(5,5,6,0.74) 58%, rgba(5,5,6,0.92) 72%, #050506 84%, #050506 100%), url(${activeStep.image})`,
                backgroundPosition: 'center, left center',
                backgroundRepeat: 'no-repeat, no-repeat',
                backgroundSize: '100% 100%, 56% auto',
              }}
            />
          ) : currentStep === 2 ? (
            <div
              className="absolute inset-y-0 left-0 hidden w-[52%] overflow-hidden pointer-events-none lg:block"
              style={{
                maskImage: 'linear-gradient(90deg, black 0%, black 68%, rgba(0,0,0,0.5) 84%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(90deg, black 0%, black 68%, rgba(0,0,0,0.5) 84%, transparent 100%)',
              }}
            >
              <img
                src={activeStep.image}
                alt=""
                aria-hidden="true"
                decoding="async"
                fetchPriority="high"
                className="h-full w-full object-cover object-center brightness-[0.78] contrast-[1.02] will-change-transform transition-all duration-700"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#050506] to-transparent" />
            </div>
          ) : (
            <div
              className="absolute inset-y-0 left-0 hidden w-[44%] overflow-hidden pointer-events-none lg:block"
              style={{
                maskImage: 'linear-gradient(90deg, black 0%, black 55%, rgba(0,0,0,0.2) 82%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(90deg, black 0%, black 55%, rgba(0,0,0,0.2) 82%, transparent 100%)',
              }}
            >
              <img
                src={activeStep.image}
                alt=""
                aria-hidden="true"
                decoding="async"
                fetchPriority="high"
                className="w-full h-full object-cover object-center transform scale-100 brightness-[0.88] contrast-[1.02] will-change-transform transition-all duration-700"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#050506] to-transparent" />
            </div>
          )}
          
          {/* PROGRESS NAVIGATION */}
          <StepProgress currentStep={currentStep} />
          
          {/* 👑 WRAPPER ALIGNED TO TRULY SNAPS TO THE ABSOLUTE RIGHT EDGE */}
          <div
            className={`relative z-10 flex w-full flex-1 items-center justify-center px-6 py-10 sm:px-8 lg:h-full lg:flex-none lg:px-12 lg:py-16 ${
              currentStep === 1
                ? 'lg:w-1/2 lg:ml-auto lg:pl-0 lg:pr-[8%] xl:pr-[10%]'
                : currentStep === 2
                  ? 'lg:w-[58%] lg:ml-auto lg:justify-end lg:pl-16 lg:pr-[8%] xl:pl-20 xl:pr-[10%]'
                  : currentStep === 3
                    ? 'lg:w-[58%] lg:ml-auto lg:justify-end lg:pl-14 lg:pr-[8%] xl:pl-16 xl:pr-[10%]'
                    : currentStep === 4
                      ? 'lg:w-[58%] lg:ml-auto lg:justify-end lg:pl-14 lg:pr-[8%] xl:pl-16 xl:pr-[10%]'
                : 'lg:w-[56%] lg:ml-auto lg:pl-6 lg:pr-16 xl:pr-24'
            }`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(212,175,55,0.07),transparent_38%)]" />
            <div className="relative z-10 flex w-full justify-center lg:justify-end">
              {renderContent()}
            </div>
          </div>
        </motion.section>
      </AnimatePresence>
    </main>
  );
}

export default Onboarding;
