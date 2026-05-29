import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Spinner from '../../components/common/Spinner';
import { Button } from '../../components/common/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/common/card';
import { DarkInput, GlassCard } from '../../components/admin/SystemUI';
import { useSalonSettings } from '../../hooks/useSalonSettings';

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
  const { settings } = useSalonSettings();

  const navigate = useNavigate();
  const fallbackAvatarUrl = 'https://ui-avatars.com/api/?name=Stylist&background=d6b36a&color=0f1115&bold=true&size=256';

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
    if (!date || settings.weekendBookings) return;

    const selectedDate = new Date(`${date}T00:00:00`);
    const day = selectedDate.getDay();

    if (day === 0 || day === 6) {
      setDate('');
      setTime('');
      toast.error('Weekend bookings are currently unavailable.');
    }
  }, [date, settings.weekendBookings]);

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

  const stepHeader = {
    1: {
      title: 'Step 1: Select Service',
      description: 'Choose one or more services to personalize this appointment.'
    },
    2: {
      title: 'Step 2: Choose a Stylist',
      description: 'Pick a specific stylist or let us match you with the next available.'
    },
    3: {
      title: 'Step 3: Pick Date & Time',
      description: 'Select your preferred date, then choose from the open time slots.'
    },
    4: {
      title: 'Step 4: Review Booking',
      description: 'Confirm the details before you finalize your appointment.'
    }
  }[step];

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
      const selectedDate = new Date(`${date}T00:00:00`);
      const day = selectedDate.getDay();

      if (!settings.weekendBookings && (day === 0 || day === 6)) {
        toast.error('Weekend bookings are currently unavailable.');
        setIsLoading(false);
        return;
      }

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
    <div className="salon-page">
      <div className="salon-page-overlay fixed inset-0"></div>
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#7c5cfc]/20 blur-[140px]" />
      <div className="pointer-events-none absolute right-[-10%] top-[20%] h-96 w-96 rounded-full bg-[#d6b36a]/15 blur-[160px]" />

      <div className="relative z-10 min-h-screen py-10">
        <div className="salon-shell max-w-6xl">
          <div className="mb-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="px-0 py-0 text-lg font-medium text-[#d6b36a] hover:bg-transparent hover:text-white"
            >
              <span aria-hidden="true">←</span>
              Back to Dashboard
            </Button>
          </div>

          <div className="grid gap-8 xl:grid-cols-[1.5fr_0.85fr]">
            <Card className="max-w-2xl mx-auto salon-glass">
              <CardHeader>
                <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Book an Appointment</p>
                <CardTitle className="text-primary font-serif">{stepHeader.title}</CardTitle>
                <CardDescription>{stepHeader.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mb-8 grid gap-3 rounded-2xl border border-white/10 bg-[#0f1115]/60 p-3 sm:grid-cols-4">
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
                        className={`lux-step flex items-center gap-3 rounded-xl border border-white/10 bg-[#0f1115]/70 p-3 transition ${
                          isActive ? 'lux-step-active shadow-[0_0_0_1px_rgba(214,179,106,0.35)]' : isComplete ? 'lux-step-complete' : ''
                        } hover:border-white/20`}
                      >
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                          isActive
                            ? 'bg-[#d6b36a] text-[#0f1115]'
                            : isComplete
                              ? 'border border-[#d6b36a]/40 bg-[#d6b36a]/10 text-[#d6b36a]'
                              : 'border border-white/10 bg-[#141821] text-gray-400'
                        }`}>
                          {isComplete ? '✓' : item.number}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>{item.title}</p>
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
                    <div className="min-h-[420px] lux-fade-in">
                      {step === 1 && (
                        <div>
                          <div className="grid gap-4 md:grid-cols-2">
                            {servicesList.map((serviceItem) => {
                              const isSelected = selectedServices.includes(serviceItem._id);

                              return (
                                <button
                                  key={serviceItem._id}
                                  type="button"
                                  onClick={() => handleServiceToggle(serviceItem._id)}
                                  className={`lux-card lux-card-hover p-5 text-left ${
                                    isSelected
                                      ? 'lux-card-selected'
                                      : 'hover:border-[#d6b36a]/30'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <h4 className="text-white font-medium">{serviceItem.name}</h4>
                                      <p className="mt-1 text-sm text-gray-500">{serviceItem.duration || 0} mins</p>
                                    </div>
                                    <div className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${
                                      isSelected
                                        ? 'border-[#d6b36a] bg-[#d6b36a] text-[#0f1115]'
                                        : 'border-white/15 text-gray-500'
                                    }`}>
                                      {isSelected ? '✓' : '+'}
                                    </div>
                                  </div>
                                  <p className="mt-4 text-lg font-semibold text-[#d6b36a]">Rs. {serviceItem.price || 0}</p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {step === 2 && (
                        <div>
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <button
                              type="button"
                              onClick={() => setStylist(ANY_STYLIST)}
                              className={`lux-card lux-card-hover p-5 text-left ${
                                stylist === ANY_STYLIST
                                  ? 'lux-card-selected'
                                  : 'hover:border-[#d6b36a]/30'
                              }`}
                            >
                              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#d6b36a]/20 bg-[#d6b36a]/10 text-xl font-bold text-[#d6b36a]">
                                A
                              </div>
                              <h4 className="mt-4 text-white font-medium">Any Available Stylist</h4>
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
                                  className={`lux-card lux-card-hover p-5 text-left ${
                                    isSelected
                                      ? 'lux-card-selected'
                                      : 'hover:border-[#d6b36a]/30'
                                  }`}
                                >
                                  <img
                                    src={imageSrc}
                                    alt={stylistItem.name}
                                    className={`h-14 w-14 rounded-full border-2 object-cover ${
                                      isSelected ? 'border-[#d6b36a]' : 'border-white/10'
                                    }`}
                                    onError={(e) => {
                                      e.currentTarget.src = fallbackAvatarUrl;
                                    }}
                                  />
                                  <h4 className="mt-4 text-white font-medium">{stylistItem.name}</h4>
                                  <p className="mt-1 text-sm text-gray-400">{stylistItem.specialty}</p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {step === 3 && (
                        <div>
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
                          {!settings.weekendBookings && (
                            <p className="mt-3 text-xs text-amber-300">Weekend bookings are disabled by salon settings.</p>
                          )}

                          <div className="mt-5 rounded-xl border border-white/10 bg-[#0f1115]/60 p-4">
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
                                    className={`rounded-xl border py-2.5 text-sm font-medium transition-all duration-300 ${
                                      isBooked
                                        ? 'cursor-not-allowed border-red-900/20 bg-red-950/30 text-red-500/50 line-through'
                                        : time === slot
                                          ? 'border-[#d6b36a] bg-[#d6b36a] text-[#0f1115] shadow-[0_0_10px_rgba(214,179,106,0.35)]'
                                          : 'border-white/10 bg-[#0f1115]/80 text-gray-300 hover:border-[#d6b36a]/60 hover:text-[#d6b36a]'
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
                                Please choose a <span className="text-[#d6b36a]">stylist option</span> and a <span className="text-[#d6b36a]">date</span> first.
                              </p>
                            </div>
                          )}
                        </GlassCard>
                      </div>
                    </div>
                  )}

                      {step === 4 && (
                        <div>
                      <div className="grid gap-4">
                        <GlassCard className="p-5">
                          <p className="text-xs uppercase tracking-[0.15em] text-gray-500">Services</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {selectedServiceDetails.map((service) => (
                              <span key={service._id} className="rounded-full border border-[#d6b36a]/20 bg-[#d6b36a]/10 px-3 py-1 text-sm font-medium text-[#d6b36a]">
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
              </CardContent>

              <CardFooter className="flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreviousStep}
                  disabled={step === 1}
                  className="justify-center border-white/10 bg-[#0f1115]/60 px-5 py-3 text-white hover:bg-white/10"
                >
                  Back
                </Button>

                <div className="flex flex-col items-stretch gap-3 sm:flex-row">
                  {step < 4 ? (
                    <Button type="button" onClick={handleNextStep} className="px-6 py-3">
                      Continue
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleConfirmBookingClick}
                      disabled={isLoading || !canMoveToReview || selectedServices.length === 0}
                      className="px-6 py-3"
                    >
                      {isLoading ? <Spinner /> : 'Confirm Booking'}
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>

            <div className="space-y-6">
              <GlassCard className="p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Booking Summary</p>
                <p className="mt-2 text-lg font-semibold text-white">Your appointment snapshot</p>

                <div className="mt-6 space-y-4">
                  <div className="rounded-xl border border-white/10 bg-[#0f1115]/60 p-4">
                    <p className="text-xs uppercase tracking-[0.15em] text-gray-500">Services Selected</p>
                    <p className="mt-2 text-2xl text-[#d6b36a] font-heading">{selectedServices.length}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#0f1115]/60 p-4">
                    <p className="text-xs uppercase tracking-[0.15em] text-gray-500">Estimated Total</p>
                    <p className="mt-2 text-2xl text-[#d6b36a] font-heading">Rs. {totalPrice}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#0f1115]/60 p-4">
                    <p className="text-xs uppercase tracking-[0.15em] text-gray-500">Estimated Duration</p>
                    <p className="mt-2 text-2xl text-[#d6b36a] font-heading">{totalDuration} mins</p>
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
          <GlassCard className="w-full max-w-sm border border-[#d6b36a]/40 bg-[#141821] p-6 mx-4">
            <h3 className="text-xl text-[#d6b36a] font-heading">Phone Number Required</h3>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsPhoneModalOpen(false);
                  setMissingPhone('');
                }}
                className="border border-white/20 bg-transparent px-4 py-2 text-white hover:bg-white/10 hover:text-white"
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSavePhoneAndBook} className="px-4 py-2">
                Save & Continue
              </Button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

export default BookAppointment;
