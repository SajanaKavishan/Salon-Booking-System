import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Spinner from './components/Spinner';
import { DarkInput, GlassCard, GoldButton, SectionPanel } from './components/SystemUI';

const ANY_STYLIST = '__ANY_STYLIST__';

function BookAppointment() {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [stylist, setStylist] = useState('');
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [missingPhone, setMissingPhone] = useState('');
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
  const [totalPrice, setTotalPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOptionsLoading, setIsOptionsLoading] = useState(true);

  const navigate = useNavigate();
  const fallbackAvatarUrl = 'https://ui-avatars.com/api/?name=Stylist&background=d4af37&color=111111&bold=true&size=256';

  const generateTimeSlots = () => {
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
  };

  const allTimeSlots = useMemo(() => generateTimeSlots(), []);

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

  useEffect(() => {
    if (date && stylist && stylist !== ANY_STYLIST) {
      axios.get(`http://localhost:5000/api/appointments/booked-times?date=${date}&stylistId=${stylist}`)
        .then((response) => {
          setBookedTimes(response.data);
          setTime('');
        })
        .catch((err) => {
          console.error('Error fetching booked times:', err);
          toast.error('Failed to check available times.');
        });
    } else {
      setBookedTimes([]);
      setTime('');
    }
  }, [date, stylist]);

  useEffect(() => {
    const total = servicesList
      .filter((service) => selectedServices.includes(service._id))
      .reduce((sum, service) => sum + (service.price || 0), 0);
    setTotalPrice(total);
  }, [selectedServices, servicesList]);

  const selectedServiceDetails = useMemo(
    () => servicesList.filter((service) => selectedServices.includes(service._id)),
    [selectedServices, servicesList]
  );

  const totalDuration = selectedServiceDetails.reduce((sum, service) => sum + (service.duration || 0), 0);
  const selectedStylist = stylistsList.find((stylistItem) => stylistItem._id === stylist);
  const formattedDate = date ? new Date(`${date}T00:00:00`).toLocaleDateString() : 'Not selected';
  const canMoveToStylist = selectedServices.length > 0;
  const canMoveToTime = stylist !== '';
  const canMoveToReview = Boolean(date && time && stylist);

  const stepItems = [
    { number: 1, title: 'Services' },
    { number: 2, title: 'Stylist' },
    { number: 3, title: 'Date & Time' },
    { number: 4, title: 'Review' }
  ];

  const handleServiceToggle = (serviceId) => {
    setSelectedServices((prev) => (
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    ));
  };

  const handleBooking = async () => {
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
      const bookingData = {
        date,
        startTime: time,
        services: selectedServices,
        stylist: stylist === ANY_STYLIST ? '' : stylist
      };

      await axios.post(
        'http://localhost:5000/api/appointments',
        bookingData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      toast.success('Great! Your appointment has been booked successfully.');
      setDate('');
      setTime('');
      setSelectedServices([]);
      setStylist('');
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
    if (!user?.phone || !String(user.phone).trim()) {
      setMissingPhone('');
      setIsPhoneModalOpen(true);
      return;
    }

    handleBooking();
  };

  const handleSavePhoneAndBook = async () => {
    if (!missingPhone.trim()) {
      toast.error('Please enter your phone number.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        'http://localhost:5000/api/users/profile',
        { phone: missingPhone.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const updatedUser = {
        ...(user || {}),
        ...(response.data || {}),
        phone: response.data?.phone || missingPhone.trim()
      };

      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setIsPhoneModalOpen(false);
      setMissingPhone('');
      toast.success('Phone number saved successfully.');
      handleBooking();
    } catch (error) {
      console.error('Save Phone Error:', error);
      toast.error(error.response?.data?.message || 'Failed to save phone number.');
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
    <div className="salon-page bg-[url('/bookingBg.jpg')]">
      <div className="salon-page-overlay fixed inset-0"></div>

      <div className="relative z-10 min-h-screen py-10">
        <div className="salon-shell max-w-6xl">
          <div className="mb-6">
            <GoldButton type="button" variant="ghost" onClick={() => navigate('/dashboard')} className="px-0 py-0 text-sm font-medium text-[#d4af37] hover:bg-transparent hover:text-yellow-400">
              <span aria-hidden="true">←</span>
              Back to Dashboard
            </GoldButton>
          </div>

          <div className="grid gap-8 xl:grid-cols-[1.5fr_0.85fr]">
            <SectionPanel className="p-8">
              <div className="mb-8">
                <h2 className="text-3xl font-serif text-white">
                  Book an <span className="text-[#d4af37]">Appointment</span>
                </h2>
                <p className="mt-2 text-sm font-light text-gray-400">
                  Move step by step and build a booking that fits your schedule.
                </p>
              </div>

              <div className="mb-8 grid gap-4 sm:grid-cols-4">
                {stepItems.map((item) => {
                  const isActive = step === item.number;
                  const isComplete = step > item.number;

                  return (
                    <button
                      key={item.number}
                      type="button"
                      onClick={() => {
                        if (item.number < step) setStep(item.number);
                      }}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                        isActive
                          ? 'border-[#d4af37] bg-[#d4af37]/10'
                          : isComplete
                            ? 'border-[#d4af37]/30 bg-[#d4af37]/5 hover:border-[#d4af37]/50'
                            : 'border-white/10 bg-[#0a0a0a]/40'
                      }`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        isActive
                          ? 'bg-[#d4af37] text-black'
                          : isComplete
                            ? 'border border-[#d4af37]/40 bg-[#d4af37]/10 text-[#d4af37]'
                            : 'border border-white/10 bg-[#111111] text-gray-400'
                      }`}>
                        {isComplete ? '✓' : item.number}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-300'}`}>{item.title}</p>
                        <p className="text-xs text-gray-500">Step {item.number}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {isOptionsLoading ? (
                <div className="flex min-h-[420px] items-center justify-center">
                  <Spinner />
                </div>
              ) : (
                <div className="min-h-[420px]">
                  {step === 1 && (
                    <div>
                      <div className="mb-5">
                        <h3 className="salon-heading">Choose Services</h3>
                        <p className="salon-subtext mt-2">Select one or more services for this appointment.</p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        {servicesList.map((serviceItem) => {
                          const isSelected = selectedServices.includes(serviceItem._id);

                          return (
                            <button
                              key={serviceItem._id}
                              type="button"
                              onClick={() => handleServiceToggle(serviceItem._id)}
                              className={`rounded-xl border p-5 text-left transition-all duration-300 ${
                                isSelected
                                  ? 'border-[#d4af37] bg-[#d4af37]/10 shadow-[0_0_18px_rgba(212,175,55,0.1)]'
                                  : 'border-white/10 bg-[#0a0a0a]/60 hover:border-[#d4af37]/50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <h4 className="font-semibold text-white">{serviceItem.name}</h4>
                                  <p className="mt-1 text-sm text-gray-500">{serviceItem.duration || 0} mins</p>
                                </div>
                                <div className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${
                                  isSelected
                                    ? 'border-[#d4af37] bg-[#d4af37] text-black'
                                    : 'border-white/15 text-gray-500'
                                }`}>
                                  {isSelected ? '✓' : '+'}
                                </div>
                              </div>
                              <p className="mt-4 text-lg font-semibold text-[#d4af37]">Rs. {serviceItem.price || 0}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div>
                      <div className="mb-5">
                        <h3 className="salon-heading">Choose a Stylist</h3>
                        <p className="salon-subtext mt-2">Pick a specific stylist or let the salon assign the next available one.</p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => setStylist(ANY_STYLIST)}
                          className={`rounded-xl border p-5 text-left transition-all duration-300 ${
                            stylist === ANY_STYLIST
                              ? 'border-[#d4af37] bg-[#d4af37]/10 shadow-[0_0_18px_rgba(212,175,55,0.1)]'
                              : 'border-white/10 bg-[#0a0a0a]/60 hover:border-[#d4af37]/50'
                          }`}
                        >
                          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 text-xl font-bold text-[#d4af37]">
                            A
                          </div>
                          <h4 className="mt-4 font-semibold text-white">Any Available Stylist</h4>
                          <p className="mt-1 text-sm text-gray-400">We’ll match you with someone available for your selected time.</p>
                        </button>

                        {stylistsList.map((stylistItem) => {
                          const isSelected = stylist === stylistItem._id;
                          const imageSrc = stylistItem.imageUrl?.trim() ? stylistItem.imageUrl : fallbackAvatarUrl;

                          return (
                            <button
                              key={stylistItem._id}
                              type="button"
                              onClick={() => setStylist(stylistItem._id)}
                              className={`rounded-xl border p-5 text-left transition-all duration-300 ${
                                isSelected
                                  ? 'border-[#d4af37] bg-[#d4af37]/10 shadow-[0_0_18px_rgba(212,175,55,0.1)]'
                                  : 'border-white/10 bg-[#0a0a0a]/60 hover:border-[#d4af37]/50'
                              }`}
                            >
                              <img
                                src={imageSrc}
                                alt={stylistItem.name}
                                className={`h-14 w-14 rounded-full border-2 object-cover ${
                                  isSelected ? 'border-[#d4af37]' : 'border-white/10'
                                }`}
                                onError={(e) => {
                                  e.currentTarget.src = fallbackAvatarUrl;
                                }}
                              />
                              <h4 className="mt-4 font-semibold text-white">{stylistItem.name}</h4>
                              <p className="mt-1 text-sm text-gray-400">{stylistItem.specialty}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div>
                      <div className="mb-5">
                        <h3 className="salon-heading">Pick Date & Time</h3>
                        <p className="salon-subtext mt-2">Select your preferred date, then choose from the available time slots.</p>
                      </div>

                      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                        <GlassCard className="p-5">
                          <label className="mb-2 block text-sm font-medium text-gray-300">Select Date</label>
                          <DarkInput
                            type="date"
                            value={date}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setDate(e.target.value)}
                            required
                            className="color-scheme-dark"
                            style={{ colorScheme: 'dark' }}
                          />

                          <div className="mt-5 rounded-xl border border-white/10 bg-[#0a0a0a]/50 p-4">
                            <p className="text-xs uppercase tracking-[0.15em] text-gray-500">Stylist</p>
                            <p className="mt-2 text-sm font-semibold text-white">
                              {stylist === ANY_STYLIST
                                ? 'Any Available Stylist'
                                : selectedStylist?.name || 'Not selected'}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                              {stylist === ANY_STYLIST
                                ? 'All open slots are available for auto-assignment.'
                                : selectedStylist?.specialty || 'Choose a stylist in the previous step.'}
                            </p>
                          </div>
                        </GlassCard>

                        <GlassCard className="p-5">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-gray-300">Available Time Slots</p>
                              <p className="mt-1 text-xs text-gray-500">
                                {stylist === ANY_STYLIST
                                  ? 'Auto-assigned bookings can use any visible slot.'
                                  : 'Booked times are automatically disabled.'}
                              </p>
                            </div>
                          </div>

                          {date && stylist ? (
                            <div className="grid max-h-[280px] grid-cols-2 gap-3 overflow-y-auto pr-2 sm:grid-cols-3 salon-scrollbar">
                              {allTimeSlots.map((slot) => {
                                const isBooked = stylist !== ANY_STYLIST && bookedTimes.includes(slot);

                                return (
                                  <button
                                    key={slot}
                                    type="button"
                                    disabled={isBooked}
                                    onClick={() => setTime(slot)}
                                    className={`rounded-lg border py-2.5 text-sm font-medium transition-all duration-300 ${
                                      isBooked
                                        ? 'cursor-not-allowed border-red-900/20 bg-red-950/30 text-red-500/50 line-through'
                                        : time === slot
                                          ? 'border-[#d4af37] bg-[#d4af37] text-black shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                                          : 'border-white/10 bg-[#0a0a0a]/80 text-gray-300 hover:border-[#d4af37] hover:text-[#d4af37]'
                                    }`}
                                  >
                                    {slot}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-white/10 bg-[#0a0a0a]/40 p-6 text-center">
                              <p className="text-sm text-gray-400">
                                Please choose a <span className="text-[#d4af37]">stylist option</span> and a <span className="text-[#d4af37]">date</span> first.
                              </p>
                            </div>
                          )}
                        </GlassCard>
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div>
                      <div className="mb-5">
                        <h3 className="salon-heading">Review Booking</h3>
                        <p className="salon-subtext mt-2">Check the summary before confirming your appointment.</p>
                      </div>

                      <div className="grid gap-4">
                        <GlassCard className="p-5">
                          <p className="text-xs uppercase tracking-[0.15em] text-gray-500">Services</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {selectedServiceDetails.map((service) => (
                              <span key={service._id} className="rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 px-3 py-1 text-sm font-medium text-[#d4af37]">
                                {service.name}
                              </span>
                            ))}
                          </div>
                        </GlassCard>

                        <div className="grid gap-4 md:grid-cols-3">
                          <GlassCard className="p-5">
                            <p className="text-xs uppercase tracking-[0.15em] text-gray-500">Stylist</p>
                            <p className="mt-3 font-semibold text-white">
                              {stylist === ANY_STYLIST ? 'Any Available Stylist' : selectedStylist?.name || 'Not selected'}
                            </p>
                          </GlassCard>
                          <GlassCard className="p-5">
                            <p className="text-xs uppercase tracking-[0.15em] text-gray-500">Date</p>
                            <p className="mt-3 font-semibold text-white">{formattedDate}</p>
                          </GlassCard>
                          <GlassCard className="p-5">
                            <p className="text-xs uppercase tracking-[0.15em] text-gray-500">Time</p>
                            <p className="mt-3 font-semibold text-white">{time || 'Not selected'}</p>
                          </GlassCard>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <GoldButton
                  type="button"
                  variant="ghost"
                  onClick={handlePreviousStep}
                  disabled={step === 1}
                  className="justify-center border border-white/10 bg-[#0a0a0a]/60 px-5 py-3 hover:bg-white/10 hover:text-white disabled:border-white/5 disabled:bg-transparent"
                >
                  Previous
                </GoldButton>

                <div className="flex flex-col items-stretch gap-3 sm:flex-row">
                  {step < 4 ? (
                    <GoldButton type="button" onClick={handleNextStep} className="px-6 py-3">
                      Next Step
                    </GoldButton>
                  ) : (
                    <GoldButton
                      type="button"
                      onClick={handleConfirmBookingClick}
                      disabled={isLoading || !canMoveToReview || selectedServices.length === 0}
                      className="px-6 py-3"
                    >
                      {isLoading ? <Spinner /> : 'Confirm Booking'}
                    </GoldButton>
                  )}
                </div>
              </div>
            </SectionPanel>

            <div className="space-y-6">
              <GlassCard className="p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Booking Summary</p>
                <p className="mt-2 text-lg font-semibold text-white">Your appointment snapshot</p>

                <div className="mt-6 space-y-4">
                  <div className="rounded-xl border border-white/10 bg-[#0a0a0a]/50 p-4">
                    <p className="text-xs uppercase tracking-[0.15em] text-gray-500">Services Selected</p>
                    <p className="mt-2 text-2xl font-serif text-[#d4af37]">{selectedServices.length}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#0a0a0a]/50 p-4">
                    <p className="text-xs uppercase tracking-[0.15em] text-gray-500">Estimated Total</p>
                    <p className="mt-2 text-2xl font-serif text-[#d4af37]">Rs. {totalPrice}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#0a0a0a]/50 p-4">
                    <p className="text-xs uppercase tracking-[0.15em] text-gray-500">Estimated Duration</p>
                    <p className="mt-2 text-2xl font-serif text-[#d4af37]">{totalDuration} mins</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Current Selection</p>
                <div className="mt-5 space-y-4 text-sm text-gray-300">
                  <div>
                    <p className="text-xs uppercase tracking-[0.15em] text-gray-500">Stylist</p>
                    <p className="mt-1 font-medium text-white">
                      {stylist === ANY_STYLIST ? 'Any Available Stylist' : selectedStylist?.name || 'Not selected'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.15em] text-gray-500">Date</p>
                    <p className="mt-1 font-medium text-white">{formattedDate}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.15em] text-gray-500">Time</p>
                    <p className="mt-1 font-medium text-white">{time || 'Not selected'}</p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>

      {isPhoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm border border-[#d4af37]/50 bg-[#111111] p-6 mx-4">
            <h3 className="text-xl font-serif text-[#d4af37]">Phone Number Required</h3>
            <p className="mt-2 text-sm text-gray-300">
              Please provide a contact number so our staff can reach you if needed.
            </p>

            <DarkInput
              type="text"
              value={missingPhone}
              onChange={(e) => setMissingPhone(e.target.value)}
              placeholder="Enter phone number"
              className="mt-4"
            />

            <div className="mt-5 flex justify-end gap-3">
              <GoldButton
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsPhoneModalOpen(false);
                  setMissingPhone('');
                }}
                className="border border-white/20 bg-transparent px-4 py-2 text-white hover:bg-white/10 hover:text-white"
              >
                Cancel
              </GoldButton>
              <GoldButton type="button" onClick={handleSavePhoneAndBook} className="px-4 py-2">
                Save & Continue
              </GoldButton>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

export default BookAppointment;
