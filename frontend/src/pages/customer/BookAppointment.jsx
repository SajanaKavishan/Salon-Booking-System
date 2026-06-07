import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Spinner from '../../components/common/Spinner';
import { useSalonSettings } from '../../hooks/useSalonSettings';
import { useAppointments } from '../../context/AppointmentsContext';

const ANY_STYLIST = '__ANY_STYLIST__';

function BookAppointment({ userProfile, customerData }) {
  const [step, setStep] = useState(1);
  const [hasHydratedRebook, setHasHydratedRebook] = useState(false);
  const [isUserProfileHydrated, setIsUserProfileHydrated] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [stylist, setStylist] = useState('');
  const [stylistSearch, setStylistSearch] = useState('');
  const [hasUserSelectedStylist, setHasUserSelectedStylist] = useState(false);
  const [isPhoneVerificationModalOpen, setIsPhoneVerificationModalOpen] = useState(false);
  const [phoneVerificationStep, setPhoneVerificationStep] = useState('confirm'); // 'confirm' or 'edit'
  const [phoneVerificationInput, setPhoneVerificationInput] = useState('');
  const [isPhoneVerificationLoading, setIsPhoneVerificationLoading] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  });
  const [servicesList, setServicesList] = useState([]);
  const [stylistsList, setStylistsList] = useState([]);
  const [bookedTimes, setBookedTimes] = useState([]);
  const [bookedTimesByStylist, setBookedTimesByStylist] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isOptionsLoading, setIsOptionsLoading] = useState(true);
  const { settings } = useSalonSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const { addAppointment } = useAppointments();

  const profile = userProfile || customerData || {};
  const preferredStylistName = typeof profile.preferredStylist === 'string'
    ? profile.preferredStylist.trim()
    : '';

  // Helper to resolve stylist display name from hex ID or direct name
  const resolveStylistName = (stylistValue) => {
    if (!stylistValue) return 'Any Available Artist';
    
    // If it's a hex ID (24-char MongoDB ObjectId), look it up in stylistsList
    if (typeof stylistValue === 'string' && /^[0-9a-fA-F]{24}$/.test(stylistValue)) {
      const stylistObj = stylistsList.find((s) => s._id === stylistValue);
      return stylistObj?.name || 'Any Available Artist';
    }
    
    // If it's already a string name, return it
    if (typeof stylistValue === 'string') {
      return stylistValue.trim() || 'Any Available Artist';
    }
    
    // If it's an object with a name, return the name
    if (typeof stylistValue === 'object' && stylistValue?.name) {
      return stylistValue.name;
    }
    
    return 'Any Available Artist';
  };

  const fallbackAvatar = (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-9 w-9 text-[#D4AF37]">
      <circle cx="32" cy="22" r="11" fill="currentColor" />
      <path
        d="M14 56c2.5-11.5 9.4-18 18-18s15.5 6.5 18 18"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
    </svg>
  );

    const allTimeSlots = useMemo(() => {
      const slots = [];
      let startTime = 9 * 60;
      const endTime = 20 * 60;

      while (startTime < endTime) {
        const hours = Math.floor(startTime / 60);
        const mins = startTime % 60;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
        const displayMins = mins === 0 ? '00' : mins;

        slots.push(`${displayHours < 10 ? '0' : ''}${displayHours}:${displayMins} ${ampm}`);
        startTime += 30;
      }

      return slots;
    }, []);

    useEffect(() => {
      const timer = window.setInterval(() => {
        setCurrentDateTime(new Date());
      }, 60000);

      return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
      const fetchOptions = async () => {
        try {
          const [servicesRes, staffRes] = await Promise.all([
            axios.get('http://localhost:5000/api/services'),
            axios.get('http://localhost:5000/api/staff')
          ]);
          setServicesList(servicesRes.data);
          setStylistsList(staffRes.data);
        } catch (error) {
          console.error('Error fetching data:', error);
          toast.error('Failed to load services and staff.');
        } finally {
          setIsOptionsLoading(false);
        }
      };

      fetchOptions();
    }, []);

    // Hydrate user profile from backend on component mount
    useEffect(() => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsUserProfileHydrated(true);
        return;
      }

      const hydrateUserProfile = async () => {
        try {
          const response = await axios.get('http://localhost:5000/api/users/profile', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const profileData = response.data || {};
          setUser({
            ...user,
            ...profileData,
            phone: profileData?.phone || profileData?.mobile || profileData?.phoneNumber || user?.phone || ''
          });
        } catch (error) {
          console.error('Error hydrating user profile:', error);
        } finally {
          setIsUserProfileHydrated(true);
        }
      };

      hydrateUserProfile();
    }, []);

    useEffect(() => {
      if (hasUserSelectedStylist || stylist || stylistsList.length === 0) return;
      if (!preferredStylistName || preferredStylistName.toLowerCase() === 'not selected') return;

      const preferred = stylistsList.find(
        (stylistItem) => stylistItem.name?.toLowerCase() === preferredStylistName.toLowerCase()
      );

      if (preferred?._id) {
        setStylist(preferred._id);
      }
    }, [hasUserSelectedStylist, preferredStylistName, stylist, stylistsList]);

    useEffect(() => {
      const rebookAppointment = location.state?.rebookAppointment;

      if (hasHydratedRebook || !rebookAppointment || servicesList.length === 0 || stylistsList.length === 0) return;

      const serviceIds = (Array.isArray(rebookAppointment.services) ? rebookAppointment.services : [])
        .map((service) => {
          if (typeof service === 'string') {
            const matchingService = servicesList.find(
              (serviceItem) => serviceItem._id === service || serviceItem.name === service
            );

            return matchingService?._id || service;
          }

          if (!service) return null;

          const serviceId = service._id || service.id;
          if (serviceId) return serviceId;

          const matchingService = servicesList.find((serviceItem) => serviceItem.name === service.name);
          return matchingService?._id || null;
        })
        .filter(Boolean);

      const stylistPayload = rebookAppointment.stylist;
      const resolvedStylist = (() => {
        if (!stylistPayload) return ANY_STYLIST;

        if (typeof stylistPayload === 'string') {
          return stylistsList.some((stylistItem) => stylistItem._id === stylistPayload)
            ? stylistPayload
            : ANY_STYLIST;
        }

        const stylistId = stylistPayload._id || stylistPayload.id;
        if (stylistId && stylistsList.some((stylistItem) => stylistItem._id === stylistId)) {
          return stylistId;
        }

        const matchingStylist = stylistsList.find((stylistItem) => stylistItem.name === stylistPayload.name);
        return matchingStylist?._id || ANY_STYLIST;
      })();

      setSelectedServices([...new Set(serviceIds)]);
      setStylist(resolvedStylist);
      setStylistSearch('');
      setDate('');
      setTime('');
      setHasUserSelectedStylist(true);
      setStep(location.state?.startStep || 3);
      setHasHydratedRebook(true);
      toast.info('Your previous service and artist choices are ready. Pick a new date and time.');
    }, [hasHydratedRebook, location.state, servicesList, stylistsList]);

    const getLocalDateString = (value) => {
      const source = value instanceof Date ? value : new Date(value);
      const year = source.getFullYear();
      const month = String(source.getMonth() + 1).padStart(2, '0');
      const day = String(source.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    };

    const timeToMinutes = (timeValue) => {
      if (!timeValue || typeof timeValue !== 'string') return 0;

      const [rawTime, modifier] = timeValue.trim().split(' ');
      const [rawHours, rawMinutes] = rawTime.split(':');
      let hours = Number(rawHours);
      const minutes = Number(rawMinutes);

      if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
      if (hours === 12) hours = 0;
      if (modifier === 'PM') hours += 12;

      return hours * 60 + minutes;
    };

    const getFallbackBookedSlots = (stylistItem) => {
      if (!Array.isArray(stylistItem?.bookedSlots)) return [];

      return stylistItem.bookedSlots
        .filter((slot) => {
          if (typeof slot === 'string') return true;
          return !slot?.date || slot.date === date;
        })
        .map((slot) => (typeof slot === 'string' ? slot : slot?.time || slot?.startTime))
        .filter(Boolean);
    };

    useEffect(() => {
      let isCancelled = false;
      const stylistRecord = stylistsList.find((item) => item._id === stylist);

      if (date && stylist && stylist !== ANY_STYLIST && stylistRecord) {
        axios
          .get(`http://localhost:5000/api/appointments/booked-times?date=${date}&stylistId=${stylist}`)
          .then((response) => {
            if (isCancelled) return;
            setBookedTimes(response.data);
            setBookedTimesByStylist({});
            setTime('');
          })
          .catch((err) => {
            console.error('Error fetching booked times:', err);
            toast.error('Failed to check available times.');
          });
      } else if (date && stylist === ANY_STYLIST && stylistsList.length > 0) {
        Promise.all(
          stylistsList.map((stylistItem) =>
            axios
              .get(`http://localhost:5000/api/appointments/booked-times?date=${date}&stylistId=${stylistItem._id}`)
              .then((response) => [stylistItem._id, response.data])
          )
        )
          .then((results) => {
            if (isCancelled) return;
            setBookedTimes([]);
            setBookedTimesByStylist(Object.fromEntries(results));
            setTime('');
          })
          .catch((err) => {
            console.error('Error fetching aggregated booked times:', err);
            toast.error('Failed to check available times.');
          });
      } else {
        setBookedTimes([]);
        setBookedTimesByStylist({});
        setTime('');
      }

      return () => {
        isCancelled = true;
      };
    }, [date, stylist, stylistsList]);

    useEffect(() => {
      if (!date || settings.weekendBookings) return;

      const selectedDate = new Date(`${date}T00:00:00`);
      const day = selectedDate.getDay();

      if (day === 0 || day === 6) {
        setDate('');
        setTime('');
        toast.error('Weekend bookings are currently unavailable.');
      }
    }, [date, settings.weekendBookings]);

    const selectedServiceDetails = useMemo(
      () => servicesList.filter((service) => selectedServices.includes(service._id)),
      [selectedServices, servicesList]
    );

    const totalPrice = useMemo(
      () => selectedServiceDetails.reduce((sum, service) => sum + (service.price || 0), 0),
      [selectedServiceDetails]
    );

    const totalDuration = useMemo(
      () => selectedServiceDetails.reduce((sum, service) => sum + (service.duration || 0), 0),
      [selectedServiceDetails]
    );

    const stylistOptions = stylistsList;
    const filteredStylists = useMemo(() => {
      if (!stylistSearch.trim()) return stylistOptions;
      const query = stylistSearch.trim().toLowerCase();
      return stylistOptions.filter((stylistItem) => stylistItem.name?.toLowerCase().includes(query));
    }, [stylistOptions, stylistSearch]);

    const selectedStylist = stylistOptions.find((stylistItem) => stylistItem._id === stylist);
    const formattedDate = date ? new Date(`${date}T00:00:00`).toLocaleDateString() : 'Not selected';
    const isToday = date === getLocalDateString(currentDateTime);
    const nextAvailableMinutes = useMemo(() => {
      const currentMinutes = currentDateTime.getHours() * 60 + currentDateTime.getMinutes();
      const nextHour = currentDateTime.getMinutes() === 0
        ? currentMinutes
        : (currentDateTime.getHours() + 1) * 60;

      return nextHour;
    }, [currentDateTime]);
    const visibleTimeSlots = useMemo(
      () => allTimeSlots.filter((slot) => !isToday || timeToMinutes(slot) >= nextAvailableMinutes),
      [allTimeSlots, isToday, nextAvailableMinutes]
    );
    const isSlotBooked = (slot) => {
      if (stylist === ANY_STYLIST) {
        if (stylistsList.length === 0) return true;

        return stylistsList.every((stylistItem) => {
          const apiBookedSlots = bookedTimesByStylist[stylistItem._id] || [];
          const fallbackBookedSlots = getFallbackBookedSlots(stylistItem);

          return [...apiBookedSlots, ...fallbackBookedSlots].includes(slot);
        });
      }

      const fallbackBookedSlots = getFallbackBookedSlots(selectedStylist);

      return [...bookedTimes, ...fallbackBookedSlots].includes(slot);
    };
    const canMoveToStylist = selectedServices.length > 0;
    const canMoveToTime = stylist !== '';
    const canMoveToReview = Boolean(date && time && stylist);

    useEffect(() => {
      if (!time) return;

      if (!visibleTimeSlots.includes(time) || isSlotBooked(time)) {
        setTime('');
      }
    }, [time, visibleTimeSlots, stylist, bookedTimes, bookedTimesByStylist, stylistsList, selectedStylist]);

    const stepLabels = ['Select Service', 'Choose Artist', 'Pick Date & Time', 'Review Booking'];
    const currentStepLabel = stepLabels[step - 1];
    const stepMotion = {
      initial: { opacity: 0, x: 32 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -32 }
    };
    const serviceListVariants = {
      hidden: {},
      show: {
        transition: {
          staggerChildren: 0.08
        }
      }
    };
    const serviceItemVariants = {
      hidden: { opacity: 0, y: 12 },
      show: { opacity: 1, y: 0 }
    };

    const handleServiceToggle = (serviceId) => {
      setSelectedServices((prev) => {
        if (prev.includes(serviceId)) {
          return prev.filter((id) => id !== serviceId);
        }

        return [...prev, serviceId];
      });
    };

    const handleBooking = async (customerMobileNumber = '') => {
      if (selectedServices.length === 0) {
        toast.error('Please select at least one service.');
        return;
      }

      if (!time) {
        toast.error('Please select an available time slot.');
        return;
      }

      setIsLoading(true);

      try {
        const token = localStorage.getItem('token');
        const selectedDate = new Date(`${date}T00:00:00`);
        const day = selectedDate.getDay();

        if (!settings.weekendBookings && (day === 0 || day === 6)) {
          toast.error('Weekend bookings are currently unavailable.');
          setIsLoading(false);
          return;
        }

        const stylistRecord = stylistsList.find((item) => item._id === stylist);
        const stylistId = stylist === ANY_STYLIST ? '' : stylistRecord?._id || '';
        // Ensure stylist name is always human-readable (not hex ID)
        const stylistName = stylist === ANY_STYLIST 
          ? 'Any Available Artist' 
          : (stylistRecord?.name || 'Any Available Artist');

        const bookingData = {
          date,
          startTime: time,
          services: selectedServices,
          stylist: stylistId,
          customerMobile: customerMobileNumber || user?.phone || ''
        };

        const response = await axios.post(
          'http://localhost:5000/api/appointments',
          bookingData,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        // Construct the appointment object from response
        const createdAppointment = response.data?.appointment || response.data || {};
        
        // Ensure the appointment has all required fields
        const appointmentToAdd = {
          _id: createdAppointment?._id || createdAppointment?.id || `appt-${Date.now()}`,
          id: createdAppointment?._id || createdAppointment?.id || `appt-${Date.now()}`,
          date: createdAppointment?.date || date,
          startTime: createdAppointment?.startTime || time,
          endTime: createdAppointment?.endTime || '',
          services: createdAppointment?.services || selectedServices.map((id) => {
            const service = servicesList.find((s) => s._id === id);
            return service ? { _id: service._id, name: service.name, price: service.price, duration: service.duration } : { _id: id, name: 'Service' };
          }),
          stylistName: stylistName,
          status: createdAppointment?.status || 'Pending',
          totalAmount: createdAppointment?.totalAmount || 0,
          isHiddenByCustomer: false
        };

        // Add appointment to global context
        addAppointment(appointmentToAdd);

        toast.success('Great! Your appointment has been booked successfully.');
        
        // Reset wizard state
        setDate('');
        setTime('');
        setSelectedServices([]);
        setStylist('');
        setHasUserSelectedStylist(false);
        setStep(1);
        
        navigate('/dashboard');
      } catch (error) {
        console.error('Booking Error:', error);
        toast.error(error.response?.data?.message || 'Sorry! There was an error booking your appointment.');
      } finally {
        setIsLoading(false);
      }
    };

    const handleConfirmBookingClick = () => {
      // Wait for user profile to hydrate before opening verification modal
      if (!isUserProfileHydrated) {
        toast.error('Loading your profile. Please try again.');
        return;
      }
      
      // Get current phone from user profile
      const currentPhone = user?.phone || user?.mobile || user?.phoneNumber || '';
      
      // Show phone verification modal
      setPhoneVerificationStep('confirm');
      setPhoneVerificationInput('');
      setIsPhoneVerificationModalOpen(true);
    };

    const handlePhoneVerificationYes = () => {
      // User confirmed their phone number - proceed with booking
      const currentPhone = user?.phone || user?.mobile || user?.phoneNumber || '';
      setIsPhoneVerificationModalOpen(false);
      handleBooking(currentPhone);
    };

    const handlePhoneVerificationNo = () => {
      // User wants to update phone - show input field
      setPhoneVerificationStep('edit');
      setPhoneVerificationInput('');
    };

    const handlePhoneVerificationSaveAndBook = async () => {
      const newPhone = phoneVerificationInput.trim();
      
      if (!newPhone) {
        toast.error('Please enter your phone number.');
        return;
      }

      setIsPhoneVerificationLoading(true);

      try {
        const token = localStorage.getItem('token');
        
        // Update user profile with new phone number
        const response = await axios.put(
          'http://localhost:5000/api/users/profile',
          { phone: newPhone },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        // Update local user state
        const updatedUser = {
          ...user,
          ...(response.data || {}),
          phone: response.data?.phone || newPhone
        };

        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        toast.success('Phone number updated successfully.');
        
        // Close modal and proceed with booking using new phone
        setIsPhoneVerificationModalOpen(false);
        handleBooking(newPhone);
      } catch (error) {
        console.error('Update Phone Error:', error);
        toast.error(error.response?.data?.message || 'Failed to update phone number.');
      } finally {
        setIsPhoneVerificationLoading(false);
      }
    };

    const handleNextStep = () => {
      if (step === 1 && !canMoveToStylist) {
        toast.error('Please select at least one service first.');
        return;
      }
      if (step === 2 && !canMoveToTime) {
        toast.error('Please select a stylist option first.');
        return;
      }
      if (step === 3 && !canMoveToReview) {
        toast.error('Please choose a date and time first.');
        return;
      }

      setStep((currentStep) => Math.min(currentStep + 1, 4));
    };

    const handlePreviousStep = () => {
      setStep((currentStep) => Math.max(currentStep - 1, 1));
    };

    return (
      <div className="h-[calc(100dvh-104px)] overflow-hidden bg-[#070707] text-white md:h-[calc(100dvh-136px)] lg:h-[calc(100dvh-152px)]">
        <div className="mx-auto flex h-full max-w-7xl flex-col">
          <div className="flex h-full min-h-0 flex-col gap-4 sm:gap-6">
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
              <div className="flex items-center gap-3">
                {stepLabels.map((label, index) => {
                  const stepNumber = index + 1;
                  const isActive = step === stepNumber;
                  const isComplete = step > stepNumber;
                  const isFilled = isActive || isComplete;

                  return (
                    <React.Fragment key={label}>
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition ${
                          isFilled
                            ? 'border-[#D4AF37] bg-[#D4AF37] text-black shadow-[0_0_12px_rgba(212,175,55,0.35)]'
                            : 'border-white/20 text-white/40'
                        }`}
                      >
                        {stepNumber}
                      </div>
                      {stepNumber < stepLabels.length && (
                        <div
                          className={`h-px flex-1 transition ${
                            step > stepNumber ? 'bg-[#D4AF37]' : 'bg-white/15'
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h1 className="font-brand text-2xl text-white sm:text-4xl lg:text-5xl">
                Step {step}: {currentStepLabel}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/58 sm:text-base sm:leading-7">
                {step === 1 && 'Select one or more services to compose the booking.'}
                {step === 2 && 'Choose your artist, with your preferred stylist already highlighted.'}
                {step === 3 && 'Pick a date and a precise time from the curated schedule.'}
                {step === 4 && 'Confirm the final composition before we lock it into the salon calendar.'}
              </p>
            </div>

            <div className={`min-h-0 flex-1 pr-1 ${step === 3 ? 'overflow-hidden' : 'overflow-y-auto'}`}>
              {isOptionsLoading ? (
                <div className="flex h-full min-h-60 items-center justify-center">
                  <Spinner />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={stepMotion.initial}
                    animate={stepMotion.animate}
                    exit={stepMotion.exit}
                    transition={{ duration: 0.32, ease: 'easeOut' }}
                    className={step === 3 ? 'h-full min-h-0' : 'space-y-8'}
                  >
                    {step === 1 && (
                      <motion.ul variants={serviceListVariants} initial="hidden" animate="show" className="space-y-3">
                        {servicesList.map((serviceItem) => {
                          const isSelected = selectedServices.includes(serviceItem._id);

                          return (
                            <motion.li key={serviceItem._id} variants={serviceItemVariants}>
                              <button
                                type="button"
                                onClick={() => handleServiceToggle(serviceItem._id)}
                                className={`group flex w-full items-center justify-between gap-6 rounded-[1.75rem] border px-5 py-4 text-left transition-all duration-300 sm:px-6 ${
                                  isSelected
                                    ? 'border-[#D4AF37] bg-neutral-900/40 shadow-[0_0_0_1px_rgba(212,175,55,0.15)]'
                                    : 'border-white/8 bg-white/[0.015] hover:border-white/15 hover:bg-white/[0.03]'
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="font-brand text-lg text-white sm:text-xl">{serviceItem.name}</p>
                                  <p className="mt-2 text-xs uppercase tracking-[0.22em] text-white/40">
                                    {serviceItem.duration || 0} mins
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 sm:gap-5">
                                  <span className="text-sm text-white/55 sm:text-base">Rs. {serviceItem.price || 0}</span>
                                  <span
                                    className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-300 ${
                                      isSelected
                                        ? 'border-[#D4AF37] bg-[#D4AF37] text-black'
                                        : 'border-white/15 text-white/45 group-hover:border-white/30 group-hover:text-white'
                                    }`}
                                  >
                                    {isSelected ? '✓' : '+'}
                                  </span>
                                </div>
                              </button>
                            </motion.li>
                          );
                        })}
                      </motion.ul>
                    )}

                    {step === 2 && (
                      <div className="space-y-6">
                        <div className="w-full sm:max-w-sm">
                          <div className="relative">
                            <label className="text-[0.65rem] uppercase tracking-[0.35em] text-white/40">Search Artist</label>
                            <input
                              type="text"
                              value={stylistSearch}
                              onChange={(event) => setStylistSearch(event.target.value)}
                              placeholder="Search artist"
                              className="mt-2 w-full border-b border-white/15 bg-transparent pb-3 pr-8 text-sm text-white placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none"
                            />
                            {(stylistSearch || stylist) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setStylistSearch('');
                                  setStylist('');
                                  setHasUserSelectedStylist(true);
                                }}
                                className="absolute bottom-3 right-0 flex h-6 w-6 items-center justify-center rounded-full text-lg leading-none text-white/45 transition hover:bg-white/5 hover:text-[#D4AF37]"
                                aria-label="Clear artist selection and search"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          <button
                            type="button"
                            onClick={() => {
                              setStylist(ANY_STYLIST);
                              setHasUserSelectedStylist(true);
                            }}
                            className={`group flex items-center gap-4 rounded-[1.5rem] border border-dashed px-4 py-4 text-left transition-all duration-300 ${
                              stylist === ANY_STYLIST
                                ? 'border-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_0_1px_rgba(212,175,55,0.16)]'
                                : 'border-neutral-800 bg-white/[0.012] hover:border-[#D4AF37]/45 hover:bg-[#D4AF37]/5'
                            }`}
                          >
                            <div
                              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                                stylist === ANY_STYLIST
                                  ? 'border-[#D4AF37]/70 bg-[#D4AF37]/15 text-[#D4AF37]'
                                  : 'border-white/10 bg-white/[0.02] text-[#D4AF37]/70 group-hover:border-[#D4AF37]/35 group-hover:text-[#D4AF37]'
                              }`}
                            >
                              <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true" fill="none">
                                <circle cx="22" cy="25" r="6" stroke="currentColor" strokeWidth="2" />
                                <circle cx="41" cy="22" r="4" stroke="currentColor" strokeWidth="2" />
                                <circle cx="36" cy="42" r="5" stroke="currentColor" strokeWidth="2" />
                                <path
                                  d="M27 28l6 8M39 26l-2 10M25 41h6"
                                  stroke="currentColor"
                                  strokeLinecap="round"
                                  strokeWidth="2"
                                />
                              </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-brand text-base text-white">Any Available Artist</p>
                              <p className="mt-2 font-serif text-sm leading-5 text-white/45">
                                Optimal choice for expedited booking slots
                              </p>
                            </div>
                          </button>

                          {filteredStylists.map((stylistItem) => {
                            const isSelected = stylist === stylistItem._id;
                            const isPreferred = preferredStylistName
                              ? stylistItem.name?.toLowerCase() === preferredStylistName.toLowerCase()
                              : false;
                            const imageSrc = stylistItem.imageUrl?.trim();

                            return (
                              <button
                                key={stylistItem._id}
                                type="button"
                                onClick={() => {
                                  setStylist(stylistItem._id);
                                  setHasUserSelectedStylist(true);
                                }}
                                className={`group flex items-center gap-4 rounded-[1.5rem] border px-4 py-4 text-left transition-all duration-300 ${
                                  isSelected
                                    ? 'border-[#D4AF37]/70 bg-neutral-900/40 shadow-[0_0_0_1px_rgba(212,175,55,0.12)]'
                                    : 'border-white/8 bg-white/[0.015] hover:border-white/15 hover:bg-white/[0.03]'
                                }`}
                              >
                                <div
                                  className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#D4AF37]/10 ring-1 transition-all duration-300 ${
                                    isSelected ? 'ring-[#D4AF37]' : 'ring-white/10'
                                  }`}
                                  aria-label={`${stylistItem.name || 'Stylist'} avatar`}
                                >
                                  {fallbackAvatar}
                                  {imageSrc && (
                                    <img
                                      src={imageSrc}
                                      alt={stylistItem.name}
                                      className="absolute inset-0 h-full w-full object-cover"
                                      onError={(event) => {
                                        event.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-brand text-base text-white">{stylistItem.name}</p>
                                    {isPreferred && (
                                      <span className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">
                                        Your Preferred Stylist
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/40">
                                    {stylistItem.specialty || 'Luxury artist'}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="flex h-full min-h-0 flex-col gap-6">
                        <div className="shrink-0 grid gap-4 border-y border-white/8 py-5 md:grid-cols-[0.9fr_1.1fr] md:items-end">
                          <div>
                            <label className="text-[0.65rem] uppercase tracking-[0.35em] text-white/40">Select Date</label>
                            <input
                              type="date"
                              value={date}
                              min={new Date().toISOString().split('T')[0]}
                              onChange={(event) => setDate(event.target.value)}
                              className="mt-3 w-full border-b border-white/15 bg-transparent pb-3 text-sm text-white focus:border-[#D4AF37] focus:outline-none [color-scheme:dark]"
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-3 md:justify-end">
                            {!settings.weekendBookings && (
                              <span className="text-xs uppercase tracking-[0.24em] text-[#D4AF37]">
                                Weekend bookings disabled
                              </span>
                            )}
                            <span className="text-xs uppercase tracking-[0.24em] text-white/35">
                              {date && stylist ? 'Choose from available hours' : 'Select artist and date to unlock hours'}
                            </span>
                          </div>
                        </div>

                        {date && stylist ? (
                          visibleTimeSlots.length > 0 ? (
                            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                              {visibleTimeSlots.map((slot) => {
                                const isBooked = isSlotBooked(slot);

                                return (
                                  <button
                                    key={slot}
                                    type="button"
                                    disabled={isBooked}
                                    onClick={() => setTime(slot)}
                                    className={`rounded-full border px-4 py-3 text-xs uppercase tracking-[0.22em] transition-all duration-300 ${
                                      isBooked
                                        ? 'pointer-events-none cursor-not-allowed border-white/5 text-white/30 opacity-30 line-through'
                                        : time === slot
                                          ? 'border-[#D4AF37] bg-[#D4AF37] text-black shadow-[0_0_0_1px_rgba(212,175,55,0.2)]'
                                          : 'border-white/15 text-white/60 hover:border-[#D4AF37]/70 hover:text-[#D4AF37] hover:shadow-[0_0_18px_rgba(212,175,55,0.16)]'
                                    }`}
                                  >
                                    {slot}
                                  </button>
                                );
                              })}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-white/40">
                              No remaining time slots are available for today.
                            </p>
                          )
                        ) : (
                          <p className="text-sm text-white/40">Choose a stylist and date to unlock time slots.</p>
                        )}
                      </div>
                    )}

                    {step === 4 && (
                      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
                        <div className="rounded-[2rem] border border-white/8 bg-white/[0.02] p-6 lg:p-7">
                          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/40">Review Dossier</p>
                          <h2 className="mt-3 font-brand text-3xl text-white">Final composition</h2>

                          <div className="mt-8 space-y-6">
                            <div>
                              <p className="text-xs uppercase tracking-[0.25em] text-white/35">Chosen services</p>
                              <div className="mt-4 space-y-3">
                                {selectedServiceDetails.map((service) => (
                                  <div
                                    key={service._id}
                                    className="flex items-center justify-between gap-4 border-b border-white/8 pb-3 last:border-b-0 last:pb-0"
                                  >
                                    <div>
                                      <p className="text-base text-white">{service.name}</p>
                                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/35">
                                        {service.duration || 0} mins
                                      </p>
                                    </div>
                                    <p className="text-sm text-[#D4AF37]">Rs. {service.price || 0}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                              <div className="rounded-[1.25rem] border border-white/8 bg-neutral-950/50 p-4">
                                <p className="text-[0.65rem] uppercase tracking-[0.3em] text-white/35">Artist</p>
                                <p className="mt-3 text-sm text-white">
                                  {stylist === ANY_STYLIST ? 'Any Available Stylist' : selectedStylist?.name || 'Not selected'}
                                </p>
                              </div>
                              <div className="rounded-[1.25rem] border border-white/8 bg-neutral-950/50 p-4">
                                <p className="text-[0.65rem] uppercase tracking-[0.3em] text-white/35">Date</p>
                                <p className="mt-3 text-sm text-white">{formattedDate}</p>
                              </div>
                              <div className="rounded-[1.25rem] border border-white/8 bg-neutral-950/50 p-4">
                                <p className="text-[0.65rem] uppercase tracking-[0.3em] text-white/35">Time</p>
                                <p className="mt-3 text-sm text-white">{time || 'Not selected'}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <aside className="space-y-4 rounded-[2rem] border border-[#D4AF37]/20 bg-[linear-gradient(180deg,rgba(212,175,55,0.08),rgba(255,255,255,0.02))] p-6 lg:p-7">
                          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#D4AF37]">Investment Summary</p>
                          <div className="space-y-4 border-b border-white/8 pb-5">
                            <div>
                              <p className="text-xs uppercase tracking-[0.25em] text-white/35">Services selected</p>
                              <p className="mt-2 text-3xl text-[#D4AF37]">{selectedServices.length}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-[0.25em] text-white/35">Estimated duration</p>
                              <p className="mt-2 text-3xl text-[#D4AF37]">{totalDuration} mins</p>
                            </div>
                          </div>
                          <div className="pt-2">
                            <p className="text-xs uppercase tracking-[0.3em] text-white/35">Total Investment</p>
                            <p className="mt-3 font-brand text-4xl text-white sm:text-5xl">Rs. {totalPrice}</p>
                          </div>
                        </aside>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-white/8 pt-4 sm:pt-6">
              <motion.button
                type="button"
                onClick={handlePreviousStep}
                disabled={step === 1}
                whileHover={{ scale: 1.02 }}
                className="text-xs uppercase tracking-[0.3em] text-neutral-300 transition hover:text-white disabled:cursor-not-allowed disabled:text-white/20"
              >
                Back
              </motion.button>

              {step < 4 ? (
                <motion.button
                  type="button"
                  onClick={handleNextStep}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="rounded-full bg-[#D4AF37] px-8 py-3 text-xs font-semibold uppercase tracking-[0.38em] text-black shadow-[0_18px_36px_rgba(212,175,55,0.18)] transition"
                >
                  Continue
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  onClick={handleConfirmBookingClick}
                  disabled={isLoading || !canMoveToReview || selectedServices.length === 0}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="rounded-full bg-[#D4AF37] px-8 py-3 text-xs font-semibold uppercase tracking-[0.38em] text-black shadow-[0_18px_36px_rgba(212,175,55,0.18)] transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? <Spinner /> : 'Confirm Appointment'}
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {isPhoneVerificationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 backdrop-blur-sm">
            <motion.div 
              className="w-full max-w-md rounded-[1.75rem] border border-[#D4AF37]/30 bg-[#0b0b0b] p-6 shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              {phoneVerificationStep === 'confirm' ? (
                <>
                  <h3 className="font-brand text-xl text-[#D4AF37]">Verify Your Contact Number</h3>
                  <p className="mt-3 text-sm leading-6 text-white/70">
                    Is your registered mobile number still working?
                  </p>

                  <div className="mt-6 rounded-lg border border-white/10 bg-neutral-950/50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">Your Registered Number</p>
                    <p className="mt-3 text-lg font-semibold text-[#D4AF37]">
                      {user?.phone || user?.mobile || user?.phoneNumber || 'No number on file'}
                    </p>
                  </div>

                  <div className="mt-7 flex gap-3">
                    <button
                      type="button"
                      onClick={handlePhoneVerificationNo}
                      disabled={isPhoneVerificationLoading}
                      className="flex-1 rounded-full border border-white/15 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/30 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      No, Update It
                    </button>
                    <button
                      type="button"
                      onClick={handlePhoneVerificationYes}
                      disabled={isPhoneVerificationLoading}
                      className="flex-1 rounded-full bg-[#D4AF37] px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-black transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPhoneVerificationLoading ? 'Processing...' : 'Yes, Continue'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-brand text-xl text-[#D4AF37]">Update Mobile Number</h3>
                  <p className="mt-3 text-sm leading-6 text-white/70">
                    Please enter your current working mobile number so our staff can contact you.
                  </p>

                  <input
                    type="tel"
                    value={phoneVerificationInput}
                    onChange={(e) => setPhoneVerificationInput(e.target.value)}
                    placeholder="Enter your phone number"
                    disabled={isPhoneVerificationLoading}
                    className="mt-6 w-full border-b border-white/15 bg-transparent pb-3 text-sm text-white placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none disabled:opacity-50"
                  />

                  <div className="mt-8 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneVerificationStep('confirm');
                        setPhoneVerificationInput('');
                      }}
                      disabled={isPhoneVerificationLoading}
                      className="flex-1 rounded-full border border-white/15 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/30 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handlePhoneVerificationSaveAndBook}
                      disabled={isPhoneVerificationLoading || !phoneVerificationInput.trim()}
                      className="flex-1 rounded-full bg-[#D4AF37] px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-black transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPhoneVerificationLoading ? 'Updating...' : 'Save & Confirm'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </div>
    );
}

export default BookAppointment;
