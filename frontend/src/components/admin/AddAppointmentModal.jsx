import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  CalendarDays,
  CalendarPlus,
  Check,
  Clock,
  Loader2,
  UserRound,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';
import { GoldButton } from './SystemUI';
import API_BASE_URL from '../../utils/apiConfig';

const BUFFER_MINUTES = 15;
const BLOCKED_STATUSES = ['cancelled', 'rejected', 'completed', 'no-show'];

const initialForm = {
  staffId: '',
  bookingDate: '',
  startTime: '',
  services: []
};

const toMinutes = (time) => {
  if (!time || typeof time !== 'string') return 0;

  const trimmed = time.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    const [hours, minutes] = trimmed.split(':').map(Number);
    return hours * 60 + minutes;
  }

  const [clock, modifier] = trimmed.split(/\s+/);
  const [rawHours, minutes] = clock.split(':').map(Number);
  if (Number.isNaN(rawHours) || Number.isNaN(minutes)) return 0;

  let hours = rawHours;
  if (hours === 12) hours = 0;
  if (modifier?.toUpperCase() === 'PM') hours += 12;

  return hours * 60 + minutes;
};

const minutesToDisplayTime = (minutes) => {
  let hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const modifier = hours >= 12 ? 'PM' : 'AM';

  hours %= 12;
  if (hours === 0) hours = 12;

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${modifier}`;
};

const formatCurrency = (amount) => `Rs. ${Number(amount || 0).toLocaleString()}`;

const formatDate = (date) => {
  if (!date) return 'Not selected';

  const parsedDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return date;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(parsedDate);
};

const getStaffId = (appointment) => {
  const stylist = appointment?.staffId || appointment?.stylist;
  return typeof stylist === 'object' ? stylist?._id : stylist;
};

const getAppointmentDate = (appointment) => (
  String(appointment?.date || appointment?.bookingDate || '').slice(0, 10)
);

const getAppointmentTimes = (appointment) => {
  if (appointment?.startTime && appointment?.endTime) {
    return { startTime: appointment.startTime, endTime: appointment.endTime };
  }

  if (typeof appointment?.timeSlot === 'string') {
    const [startTime, endTime] = appointment.timeSlot.split(/\s+-\s+/);
    return { startTime, endTime };
  }

  return { startTime: '', endTime: '' };
};

function AddAppointmentModal({ isOpen, onClose, appointments = [], onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);
  const [isOverriding, setIsOverriding] = useState(false);
  const [conflictDetails, setConflictDetails] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const controller = new AbortController();
    let isMounted = true;

    const loadOptions = async () => {
      try {
        setIsLoadingOptions(true);
        const token = localStorage.getItem('token');
        const requestConfig = {
          signal: controller.signal,
          ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {})
        };
        const [servicesResponse, staffResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/services`, { signal: controller.signal }),
          axios.get(`${API_BASE_URL}/api/staff`, requestConfig)
        ]);

        if (!isMounted) return;

        setServices(servicesResponse.data || []);
        setStaff(staffResponse.data || []);
      } catch (error) {
        if (axios.isCancel(error) || error.name === 'CanceledError' || controller.signal.aborted) {
          return;
        }

        console.error('Force book option load error:', error);
        toast.error('Could not load booking options.');
      } finally {
        if (isMounted) {
          setIsLoadingOptions(false);
        }
      }
    };

    loadOptions();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    setForm(initialForm);
    setHasConflict(false);
    setIsOverriding(false);
    setConflictDetails(null);
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }, [isOpen]);

  const selectedServices = useMemo(
    () => services.filter((service) => form.services.includes(service._id)),
    [form.services, services]
  );

  const selectedStaff = useMemo(
    () => staff.find((member) => member._id === form.staffId),
    [form.staffId, staff]
  );

  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, service) => sum + (Number(service.duration) || 0), 0),
    [selectedServices]
  );

  const totalCost = useMemo(
    () => selectedServices.reduce((sum, service) => sum + (Number(service.price) || 0), 0),
    [selectedServices]
  );

  const proposedRange = useMemo(() => {
    if (!form.startTime || totalDuration <= 0) return null;

    const start = toMinutes(form.startTime);
    return {
      start,
      end: start + totalDuration
    };
  }, [form.startTime, totalDuration]);

  const canSubmit = Boolean(
    form.staffId &&
    form.bookingDate &&
    form.startTime &&
    form.services.length > 0 &&
    (!hasConflict || isOverriding) &&
    !isSubmitting
  );

  useEffect(() => {
    if (!form.staffId || !form.bookingDate || !form.startTime || selectedServices.length === 0 || !proposedRange) {
      setHasConflict(false);
      setIsOverriding(false);
      setConflictDetails(null);
      return;
    }

    const matchedConflict = appointments.find((appointment) => {
      const status = String(appointment.status || '').trim().toLowerCase();
      if (BLOCKED_STATUSES.includes(status)) return false;
      if (getAppointmentDate(appointment) !== form.bookingDate) return false;
      if (String(getStaffId(appointment)) !== form.staffId) return false;

      const { startTime, endTime } = getAppointmentTimes(appointment);
      const busyStart = toMinutes(startTime);
      const busyEnd = toMinutes(endTime);
      if (!busyStart || !busyEnd) return false;

      return proposedRange.start < busyEnd + BUFFER_MINUTES && proposedRange.end > busyStart - BUFFER_MINUTES;
    });

    if (matchedConflict) {
      const { startTime, endTime } = getAppointmentTimes(matchedConflict);

      setHasConflict(true);
      setConflictDetails({
        appointment: matchedConflict,
        message: `${startTime} - ${endTime}`,
        startTime,
        endTime
      });
      return;
    }

    setHasConflict(false);
    setIsOverriding(false);
    setConflictDetails(null);
  }, [appointments, form.bookingDate, form.staffId, form.startTime, proposedRange, selectedServices]);

  const summaryStartTime = form.startTime ? minutesToDisplayTime(toMinutes(form.startTime)) : 'Not selected';
  const summaryEndTime = proposedRange ? minutesToDisplayTime(proposedRange.end) : null;
  const summaryTime = summaryEndTime ? `${summaryStartTime} - ${summaryEndTime}` : summaryStartTime;

  const handleServiceToggle = (serviceId) => {
    setForm((current) => ({
      ...current,
      services: current.services.includes(serviceId)
        ? current.services.filter((id) => id !== serviceId)
        : [...current.services, serviceId]
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      setIsSubmitting(true);

      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in again to save this appointment.');
        return;
      }

      const startTime = minutesToDisplayTime(toMinutes(form.startTime));
      const endTime = minutesToDisplayTime(toMinutes(form.startTime) + totalDuration);

      const response = await axios.post(
        `${API_BASE_URL}/api/appointments`,
        {
          staffId: form.staffId,
          stylist: form.staffId,
          bookingDate: form.bookingDate,
          date: form.bookingDate,
          startTime,
          timeSlot: `${startTime} - ${endTime}`,
          services: form.services,
          bypassBuffer: hasConflict && isOverriding
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(hasConflict && isOverriding ? 'Appointment force booked successfully.' : 'Appointment created successfully.');
      onCreated?.(response.data?.appointment);
      onClose();
    } catch (error) {
      console.error('Force book submit error:', error);
      toast.error(error.response?.data?.message || 'Could not save the appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-book-appointment-title"
    >
      <form
        onSubmit={handleSubmit}
        className="relative h-fit max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-[#070707] text-white shadow-[0_0_0_1px_rgba(212,175,55,0.18),0_28px_90px_rgba(0,0,0,0.7)] sm:max-h-[90vh] sm:rounded-[28px]"
      >
        <div className="absolute -left-12 top-8 h-48 w-48 rounded-full bg-[#D4AF37]/10 blur-3xl" />

        <div className="relative px-4 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-7">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-5 rounded-full border border-white/10 bg-white/[0.04] p-2 text-neutral-400 transition hover:text-white sm:right-6 sm:top-6 sm:border-0 sm:bg-transparent sm:p-0"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-start gap-3 pr-12 sm:items-center sm:gap-4 sm:pr-10">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D4AF37]/40 text-[#D4AF37] sm:h-11 sm:w-11">
              <CalendarPlus className="h-5 w-5" />
            </span>
            <div>
              <h2 id="quick-book-appointment-title" className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">Quick Book Appointment</h2>
              <p className="mt-1 text-sm leading-6 text-neutral-400">Pick a stylist, time, and services in one quick pass.</p>
            </div>
          </div>
        </div>

        <div className="relative grid gap-6 px-4 pb-6 sm:gap-8 sm:px-8 sm:pb-8 lg:grid-cols-[1.45fr_0.85fr]">
          <section>
            <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
              <label>
                <span className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[#D4AF37]">
                  <UserRound className="h-3.5 w-3.5" />
                  Stylist
                </span>
                <select
                  value={form.staffId}
                  onChange={(event) => setForm((current) => ({ ...current, staffId: event.target.value }))}
                  disabled={isLoadingOptions || staff.length === 0}
                  className="w-full border-b border-[#D4AF37]/30 bg-transparent px-0 py-3 text-sm text-white outline-none transition [color-scheme:dark] focus:border-[#D4AF37]"
                  required
                >
                  <option value="">{staff.length === 0 ? 'No available staff' : 'Select stylist'}</option>
                  {staff.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[#D4AF37]">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Date
                </span>
                <input
                  type="date"
                  value={form.bookingDate}
                  onChange={(event) => setForm((current) => ({ ...current, bookingDate: event.target.value }))}
                  className="w-full border-b border-[#D4AF37]/30 bg-transparent px-0 py-3 text-sm text-white outline-none transition [color-scheme:dark] focus:border-[#D4AF37]"
                  required
                />
              </label>

              <label>
                <span className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[#D4AF37]">
                  <Clock className="h-3.5 w-3.5" />
                  Time
                </span>
                <input
                  type="time"
                  step="60"
                  value={form.startTime}
                  onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                  className="w-full border-b border-[#D4AF37]/30 bg-transparent px-0 py-3 text-sm text-white outline-none transition [color-scheme:dark] focus:border-[#D4AF37]"
                  required
                />
              </label>
            </div>

            <div className="mt-7 sm:mt-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#D4AF37]">Services</p>
                  <p className="mt-1 text-sm text-neutral-400">Choose what the client needs today.</p>
                </div>
                <span className="text-xs font-semibold text-neutral-400">{form.services.length} selected</span>
              </div>

              {isLoadingOptions ? (
                <div className="mt-5 flex min-h-[180px] items-center justify-center border-t border-[#D4AF37]/10">
                  <Loader2 className="h-7 w-7 animate-spin text-[#D4AF37]" />
                </div>
              ) : (
                <div className="mt-5 grid gap-x-8 gap-y-5 border-t border-[#D4AF37]/10 pt-5 sm:grid-cols-2">
                  {services.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-400 sm:col-span-2">
                      No active services found.
                    </div>
                  ) : (
                    services.map((service) => {
                      const selected = form.services.includes(service._id);

                      return (
                        <button
                          key={service._id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => handleServiceToggle(service._id)}
                          className="group text-left"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-base font-semibold text-white transition group-hover:text-[#f3d77a]">{service.name}</p>
                              <p className="mt-1 text-xs text-neutral-500">{service.duration} min</p>
                            </div>
                            <span
                              className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
                                selected
                                  ? 'border-[#D4AF37] bg-[#D4AF37] text-black'
                                  : 'border-[#D4AF37]/35 text-transparent group-hover:border-[#D4AF37]'
                              }`}
                            >
                              <Check className="h-4 w-4" />
                            </span>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-[#D4AF37]">{formatCurrency(service.price)}</p>
                          <div className={`mt-4 h-px transition ${selected ? 'bg-[#D4AF37]/60' : 'bg-white/10 group-hover:bg-[#D4AF37]/30'}`} />
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </section>

          <aside className="lg:pt-2">
            <div className="rounded-2xl bg-[#0d0d0d] p-4 shadow-[inset_0_0_0_1px_rgba(212,175,55,0.14)] sm:rounded-3xl sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#D4AF37]/80">Booking Preview</p>
              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500">Stylist</p>
                  <p className="mt-2 text-sm font-semibold text-white">{selectedStaff?.name || 'No stylist selected'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500">Date & Time</p>
                  <p className="mt-2 text-sm text-white">{formatDate(form.bookingDate)}</p>
                  <p className="mt-1 text-xs text-neutral-400">{summaryTime}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-[#D4AF37]/10 pt-5 sm:gap-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500">Duration</p>
                    <p className="mt-2 text-xl font-semibold text-white sm:text-2xl">{totalDuration || 0}</p>
                    <p className="text-xs text-neutral-500">minutes</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500">Total</p>
                    <p className="mt-2 text-xl font-semibold text-[#D4AF37] sm:text-2xl">{formatCurrency(totalCost)}</p>
                  </div>
                </div>
              </div>

              <div className="my-4">
                {hasConflict ? (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400 shadow-[0_0_22px_rgba(245,158,11,0.08)]">
                      <span>⚠️</span>
                      <div>
                        <p className="font-semibold">Schedule Conflict Detected</p>
                        <p className="mt-0.5 text-amber-400/70">
                          This time overlaps with another booking or required cleaning buffer.
                        </p>
                        {conflictDetails?.message && (
                          <p className="mt-1 text-amber-300/80">
                            Existing booking: {conflictDetails.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
                      <span className="text-xs font-medium text-zinc-400">Force Override Schedule</span>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={isOverriding}
                        aria-label="Force override scheduling conflicts"
                        onClick={() => setIsOverriding((current) => !current)}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isOverriding ? 'bg-amber-500' : 'bg-zinc-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isOverriding ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-medium text-emerald-400">✓ Schedule clear</p>
                )}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col">
                <GoldButton
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-full px-6 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Saving...' : 'Save Appointment'}
                </GoldButton>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-sm font-semibold text-neutral-400 transition hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}

export default AddAppointmentModal;
