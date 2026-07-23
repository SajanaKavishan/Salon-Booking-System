import React, { useEffect, useMemo, useState } from 'react';
import { apiClient as axios } from '../../utils/apiConfig';
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
import { useModalFocus } from '../../hooks/useModalFocus';
import { storage } from '../../utils/storage';

const BLOCKED_STATUSES = ['cancelled', 'canceled', 'cancelled_by_salon', 'cancelled by salon', 'rejected', 'completed', 'no-show'];
const SRI_LANKAN_MOBILE_REGEX = /^(?:\+94|0)7[0-9]{8}$/;
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const initialOverrides = {
  ignoreLeadTimeBuffer: false,
  ignoreStaffLeave: false,
  ignoreWorkingHours: false
};

const initialForm = {
  customerId: '',
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

const getEntityId = (entity) => String(
  typeof entity === 'object' && entity !== null ? entity._id || '' : entity || ''
);

const getDateKey = (value) => {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

const getScheduleDay = (dateKey) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ''))) return null;

  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) return null;

  const dayIndex = date.getUTCDay();
  return {
    dayIndex,
    dayKey: DAY_KEYS[dayIndex]
  };
};

const normalizeOffDays = (offDays) => {
  if (Array.isArray(offDays)) return offDays;
  if (typeof offDays === 'string') return offDays.split(',');
  return [];
};

function AddAppointmentModal({ isOpen, onClose, appointments = [], onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [approvedLeaves, setApprovedLeaves] = useState([]);
  const [scheduleSettings, setScheduleSettings] = useState(null);
  const [bufferMinutes, setBufferMinutes] = useState(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overrides, setOverrides] = useState(initialOverrides);
  const [overrideReason, setOverrideReason] = useState('');
  const [conflictDetails, setConflictDetails] = useState(null);
  const isModalDismissBlocked = isSubmitting || isLoadingOptions;
  const handleModalClose = () => {
    if (!isModalDismissBlocked) onClose?.();
  };
  const dialogRef = useModalFocus({
    isOpen,
    onClose: handleModalClose,
    canClose: !isModalDismissBlocked,
  });

  useEffect(() => {
    if (!isOpen) return undefined;

    const controller = new AbortController();
    let isMounted = true;

    const loadOptions = async () => {
      try {
        setIsLoadingOptions(true);
        setBufferMinutes(null);
        const requestConfig = {
          signal: controller.signal,
        };
        const [servicesResponse, staffResponse, customersResponse, settingsResponse, leavesResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/services`, { signal: controller.signal }),
          axios.get(`${API_BASE_URL}/api/staff`, requestConfig),
          axios.get(`${API_BASE_URL}/api/users?role=customer`, requestConfig),
          axios.get(`${API_BASE_URL}/api/settings`, { signal: controller.signal }),
          axios.get(`${API_BASE_URL}/api/leaves`, requestConfig)
        ]);

        if (!isMounted) return;

        const servicesList = servicesResponse.data?.data || servicesResponse.data;
        const staffList = staffResponse.data?.data || staffResponse.data;
        const customersList = customersResponse.data?.data || customersResponse.data;
        const settings = settingsResponse.data?.data || settingsResponse.data;
        const leavesList = leavesResponse.data?.data || leavesResponse.data;
        const configuredBuffer = Number(settings?.defaultBufferTime);

        if (!Number.isInteger(configuredBuffer) || configuredBuffer < 0) {
          throw new Error('The system buffer setting is unavailable or invalid.');
        }

        setServices(Array.isArray(servicesList) ? servicesList : []);
        setStaff(Array.isArray(staffList) ? staffList : []);
        setCustomers(Array.isArray(customersList) ? customersList : []);
        setApprovedLeaves(Array.isArray(leavesList) ? leavesList : []);
        setScheduleSettings(settings || null);
        setBufferMinutes(configuredBuffer);
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
    setOverrides(initialOverrides);
    setOverrideReason('');
    setApprovedLeaves([]);
    setScheduleSettings(null);
    setBufferMinutes(null);
    setConflictDetails(null);
  }, [isOpen]);

  const selectedServices = useMemo(
    () => services.filter((service) => form.services.includes(service._id)),
    [form.services, services]
  );

  const selectedStaff = useMemo(
    () => staff.find((member) => member._id === form.staffId),
    [form.staffId, staff]
  );

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer._id === form.customerId),
    [customers, form.customerId]
  );

  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, service) => sum + (Number(service.duration) || 0), 0),
    [selectedServices]
  );

  const totalCost = useMemo(
    () => selectedServices.reduce((sum, service) => sum + (Number(service.price) || 0), 0),
    [selectedServices]
  );
  const selectedCustomerPhone = String(selectedCustomer?.phone || '').trim();
  const hasValidCustomerPhone = SRI_LANKAN_MOBILE_REGEX.test(selectedCustomerPhone);
  const requiresOverrideReason = overrides.ignoreStaffLeave || overrides.ignoreWorkingHours;
  const hasValidOverrideReason = !requiresOverrideReason || overrideReason.trim().length >= 5;
  const hasAnyOverride = Object.values(overrides).some(Boolean);
  const hasExactOverlap = conflictDetails?.type === 'overlap';
  const hasBufferConflict = conflictDetails?.type === 'buffer';

  const proposedRange = useMemo(() => {
    if (!form.startTime || totalDuration <= 0) return null;

    const start = toMinutes(form.startTime);
    return {
      start,
      end: start + totalDuration
    };
  }, [form.startTime, totalDuration]);

  const hasCompleteScheduleSelection = Boolean(
    selectedStaff
    && form.bookingDate
    && form.startTime
    && proposedRange
    && Number.isInteger(bufferMinutes)
    && scheduleSettings
  );

  const hasStaffLeaveConflict = useMemo(() => {
    if (!selectedStaff || !form.bookingDate) return false;

    const selectedStaffIds = new Set([
      getEntityId(selectedStaff._id),
      getEntityId(selectedStaff.userId)
    ].filter(Boolean));

    return approvedLeaves.some((leave) => {
      if (String(leave?.status || '').trim().toLowerCase() !== 'approved') return false;
      if (!selectedStaffIds.has(getEntityId(leave?.staffId))) return false;

      const startDate = getDateKey(leave?.startDate);
      const endDate = getDateKey(leave?.endDate || leave?.startDate);
      return startDate && endDate && form.bookingDate >= startDate && form.bookingDate <= endDate;
    });
  }, [approvedLeaves, form.bookingDate, selectedStaff]);

  const hasWorkingHoursConflict = useMemo(() => {
    if (!selectedStaff || !form.bookingDate || !proposedRange || !scheduleSettings) return false;

    const scheduleDay = getScheduleDay(form.bookingDate);
    if (!scheduleDay) return true;

    const isWeekend = scheduleDay.dayIndex === 0 || scheduleDay.dayIndex === 6;
    if (scheduleSettings.weekendBookings === false && isWeekend) return true;

    const staffOffDays = normalizeOffDays(selectedStaff.offDays)
      .map((day) => String(day).trim().toLowerCase());
    if (staffOffDays.includes(scheduleDay.dayKey)) return true;

    const salonHours = scheduleSettings.openingHours?.[scheduleDay.dayKey] || {
      isOpen: true,
      start: '09:00',
      end: '22:00'
    };
    if (salonHours.isOpen === false) return true;

    const staffStart = toMinutes(selectedStaff.workingHours?.start || '09:00');
    const staffEnd = toMinutes(selectedStaff.workingHours?.end || '17:00');
    const salonStart = toMinutes(salonHours.start || '09:00');
    const salonEnd = toMinutes(salonHours.end || '22:00');
    const availabilityStart = Math.max(staffStart, salonStart);
    const availabilityEnd = Math.min(staffEnd, salonEnd);

    return (
      staffEnd <= staffStart
      || salonEnd <= salonStart
      || availabilityEnd <= availabilityStart
      || proposedRange.start < availabilityStart
      || proposedRange.end > availabilityEnd
    );
  }, [form.bookingDate, proposedRange, scheduleSettings, selectedStaff]);

  const hasConflict = Boolean(
    hasExactOverlap
    || hasBufferConflict
    || hasStaffLeaveConflict
    || hasWorkingHoursConflict
  );

  const canSubmit = Boolean(
    form.customerId &&
    hasValidCustomerPhone &&
    form.staffId &&
    form.bookingDate &&
    form.startTime &&
    form.services.length > 0 &&
    Number.isInteger(bufferMinutes) &&
    !hasExactOverlap &&
    (!hasBufferConflict || overrides.ignoreLeadTimeBuffer) &&
    (!hasStaffLeaveConflict || overrides.ignoreStaffLeave) &&
    (!hasWorkingHoursConflict || overrides.ignoreWorkingHours) &&
    hasValidOverrideReason &&
    !isSubmitting
  );

  useEffect(() => {
    setOverrides(initialOverrides);
    setOverrideReason('');
  }, [form.staffId, form.bookingDate, form.startTime]);

  useEffect(() => {
    if (!Number.isInteger(bufferMinutes) || !form.staffId || !form.bookingDate || !form.startTime || selectedServices.length === 0 || !proposedRange) {
      setConflictDetails(null);
      return;
    }

    let matchedOverlap = null;
    let matchedBufferConflict = null;

    appointments.forEach((appointment) => {
      const status = String(appointment.status || '').trim().toLowerCase();
      if (BLOCKED_STATUSES.includes(status)) return;
      if (getAppointmentDate(appointment) !== form.bookingDate) return;
      if (String(getStaffId(appointment)) !== form.staffId) return;

      const { startTime, endTime } = getAppointmentTimes(appointment);
      const busyStart = toMinutes(startTime);
      const busyEnd = toMinutes(endTime);
      if (busyEnd <= busyStart) return;

      const details = {
        appointment,
        message: `${startTime} - ${endTime}`,
        startTime,
        endTime
      };
      const overlapsExactly = proposedRange.start < busyEnd && proposedRange.end > busyStart;
      const violatesBuffer = (
        proposedRange.start < busyEnd + bufferMinutes
        && proposedRange.end > busyStart - bufferMinutes
      );

      if (overlapsExactly && !matchedOverlap) {
        matchedOverlap = { ...details, type: 'overlap' };
      } else if (violatesBuffer && !matchedBufferConflict) {
        matchedBufferConflict = { ...details, type: 'buffer' };
      }
    });

    const matchedConflict = matchedOverlap || matchedBufferConflict;

    if (matchedConflict) {
      setConflictDetails(matchedConflict);
      return;
    }

    setConflictDetails(null);
  }, [appointments, bufferMinutes, form.bookingDate, form.staffId, form.startTime, proposedRange, selectedServices]);

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
    if (!hasValidCustomerPhone) {
      toast.error('Selected customer needs a valid Sri Lankan mobile number, e.g. 0771234567 or +94771234567.');
      return;
    }

    if (!canSubmit) return;

    try {
      setIsSubmitting(true);

      const token = storage.get('token');
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
          customerId: selectedCustomer._id,
          customerMobile: selectedCustomerPhone,
          bookingDate: form.bookingDate,
          date: form.bookingDate,
          startTime,
          timeSlot: `${startTime} - ${endTime}`,
          services: form.services,
          ...overrides,
          ...(requiresOverrideReason ? { overrideReason: overrideReason.trim() } : {})
        },
        {}
      );

      toast.success(hasAnyOverride ? 'Appointment created with approved schedule overrides.' : 'Appointment created successfully.');
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
      className="salon-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 py-4 backdrop-blur-sm sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleModalClose();
      }}
    >
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-book-appointment-title"
        tabIndex={-1}
        onSubmit={handleSubmit}
        className="salon-modal-dialog relative h-fit max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-[#070707] text-white shadow-[0_0_0_1px_rgba(212,175,55,0.18),0_28px_90px_rgba(0,0,0,0.7)] sm:max-h-[90vh] sm:rounded-[28px]"
      >
        <div className="absolute -left-12 top-8 h-48 w-48 rounded-full bg-[#D4AF37]/10 blur-3xl" />

        <div className="relative px-4 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-7">
          <button
            type="button"
            onClick={handleModalClose}
            disabled={isModalDismissBlocked}
            className="salon-modal-icon-button absolute right-3 top-4 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] p-2 text-neutral-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:right-6 sm:top-6 sm:border-0 sm:bg-transparent sm:p-0"
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
              <div>
                <label htmlFor="quick-book-customer" className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#D4AF37]">
                  <UserRound className="h-3.5 w-3.5" />
                  Customer
                </label>
                <select
                  id="quick-book-customer"
                  value={form.customerId}
                  onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value }))}
                  disabled={isLoadingOptions || customers.length === 0}
                  className="w-full border-b border-[#D4AF37]/30 bg-transparent px-0 py-3 text-sm text-white outline-none transition [color-scheme:dark] focus:border-[#D4AF37]"
                  required
                >
                  <option value="">{customers.length === 0 ? 'No customers found' : 'Select customer'}</option>
                  {customers.map((customer) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.name} {customer.phone ? `- ${customer.phone}` : '- no phone'}
                    </option>
                  ))}
                </select>
                {form.customerId && !hasValidCustomerPhone && (
                  <p className="mt-2 text-xs text-red-300">
                    Selected customer needs a valid Sri Lankan mobile number, e.g. 0771234567 or +94771234567.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="quick-book-stylist" className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#D4AF37]">
                  <UserRound className="h-3.5 w-3.5" />
                  Stylist
                </label>
                <select
                  id="quick-book-stylist"
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
              </div>

              <div>
                <label htmlFor="quick-book-date" className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#D4AF37]">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Date
                </label>
                <input
                  id="quick-book-date"
                  type="date"
                  value={form.bookingDate}
                  onChange={(event) => setForm((current) => ({ ...current, bookingDate: event.target.value }))}
                  className="w-full border-b border-[#D4AF37]/30 bg-transparent px-0 py-3 text-sm text-white outline-none transition [color-scheme:dark] focus:border-[#D4AF37]"
                  required
                />
              </div>

              <div>
                <label htmlFor="quick-book-time" className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#D4AF37]">
                  <Clock className="h-3.5 w-3.5" />
                  Time
                </label>
                <input
                  id="quick-book-time"
                  type="time"
                  step="60"
                  value={form.startTime}
                  onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                  className="w-full border-b border-[#D4AF37]/30 bg-transparent px-0 py-3 text-sm text-white outline-none transition [color-scheme:dark] focus:border-[#D4AF37]"
                  required
                />
              </div>
            </div>

            <div className="mt-7 sm:mt-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#D4AF37]">Services</p>
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
              <p className="text-xs font-semibold uppercase tracking-widest text-[#D4AF37]">Booking Preview</p>
              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-300">Customer</p>
                  <p className="mt-2 text-sm font-semibold text-white">{selectedCustomer?.name || 'No customer selected'}</p>
                  {selectedCustomerPhone && <p className="mt-1 text-xs text-neutral-400">{selectedCustomerPhone}</p>}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-300">Stylist</p>
                  <p className="mt-2 text-sm font-semibold text-white">{selectedStaff?.name || 'No stylist selected'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-300">Date & Time</p>
                  <p className="mt-2 text-sm text-white">{formatDate(form.bookingDate)}</p>
                  <p className="mt-1 text-xs text-neutral-400">{summaryTime}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-[#D4AF37]/10 pt-5 sm:gap-5">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-300">Duration</p>
                    <p className="mt-2 text-xl font-semibold text-white sm:text-2xl">{totalDuration || 0}</p>
                    <p className="text-xs text-neutral-500">minutes</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-300">Total</p>
                    <p className="mt-2 text-xl font-semibold text-[#D4AF37] sm:text-2xl">{formatCurrency(totalCost)}</p>
                  </div>
                </div>
              </div>

              <div className="my-4">
                <div className="space-y-3 animate-fadeIn">
                  {(hasExactOverlap || hasBufferConflict) && (
                    <div className={`flex items-start gap-2 rounded-lg border p-3 text-xs shadow-[0_0_22px_rgba(245,158,11,0.08)] ${
                      hasExactOverlap
                        ? 'border-red-500/30 bg-red-500/10 text-red-300'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                    }`}>
                      <span aria-hidden="true">Warning!</span>
                      <div>
                        <p className="font-semibold">
                          {hasExactOverlap ? 'Exact Appointment Overlap' : 'Buffer Gap Conflict'}
                        </p>
                        <p className="mt-0.5 opacity-75">
                          {hasExactOverlap
                            ? 'Exact appointment overlaps cannot be overridden.'
                            : `This time violates the configured ${bufferMinutes}-minute buffer gap.`}
                        </p>
                        {conflictDetails?.message && (
                          <p className="mt-1 opacity-80">
                            Existing booking: {conflictDetails.message}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {hasStaffLeaveConflict && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 shadow-[0_0_22px_rgba(245,158,11,0.08)]">
                      <span aria-hidden="true">Warning!</span>
                      <div>
                        <p className="font-semibold">Stylist On Approved Leave</p>
                        <p className="mt-0.5 text-amber-300/75">
                          Enable the Staff Leave override and provide an approved reason to continue.
                        </p>
                      </div>
                    </div>
                  )}

                  {hasWorkingHoursConflict && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 shadow-[0_0_22px_rgba(245,158,11,0.08)]">
                      <span aria-hidden="true">Warning!</span>
                      <div>
                        <p className="font-semibold">Outside Working Hours</p>
                        <p className="mt-0.5 text-amber-300/75">
                          This time is outside the salon or stylist schedule. Enable the Working Hours override to continue.
                        </p>
                      </div>
                    </div>
                  )}

                  {!hasCompleteScheduleSelection ? (
                    <p className="text-xs font-medium text-neutral-500">
                      Select a stylist, date, time, and services to validate the schedule.
                    </p>
                  ) : !hasConflict && (
                    <p className="text-xs font-medium text-emerald-400">Schedule clear</p>
                  )}

                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                    <div className="mb-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-[#D4AF37]">Admin Overrides</p>
                      <p className="mt-1 text-xs text-zinc-500">Enable only the rule that management has authorized.</p>
                    </div>

                    <div className="space-y-2.5">
                      {[
                        {
                          key: 'ignoreLeadTimeBuffer',
                          label: 'Buffer Gap',
                          description: `Ignore the configured ${Number.isInteger(bufferMinutes) ? bufferMinutes : '-'}-minute rest gap only.`
                        },
                        {
                          key: 'ignoreStaffLeave',
                          label: 'Staff Leave',
                          description: 'Allow booking during approved staff leave.'
                        },
                        {
                          key: 'ignoreWorkingHours',
                          label: 'Working Hours',
                          description: 'Allow booking outside roster, opening, or weekend hours.'
                        }
                      ].map((option) => (
                        <div key={option.key} className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800/80 bg-black/20 p-2.5">
                          <span>
                            <span className="block text-xs font-medium text-zinc-300">{option.label}</span>
                            <span className="mt-0.5 block text-xs leading-4 text-zinc-400">{option.description}</span>
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={overrides[option.key]}
                            aria-label={`Override ${option.label.toLowerCase()}`}
                            onClick={() => setOverrides((current) => ({
                              ...current,
                              [option.key]: !current[option.key]
                            }))}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50 ${
                              overrides[option.key] ? 'bg-amber-500' : 'bg-zinc-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                overrides[option.key] ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>

                    {requiresOverrideReason && (
                      <div className="mt-4">
                        <label htmlFor="quick-book-override-reason" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[#D4AF37]">
                          Override Reason <span className="text-red-400">*</span>
                        </label>
                        <input
                          id="quick-book-override-reason"
                          type="text"
                          value={overrideReason}
                          onChange={(event) => setOverrideReason(event.target.value)}
                          minLength={5}
                          maxLength={300}
                          required
                          placeholder="Enter the management-approved reason"
                          className="w-full border-b border-[#D4AF37]/30 bg-transparent px-0 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-[#D4AF37]"
                        />
                        {overrideReason.length > 0 && overrideReason.trim().length < 5 && (
                          <span className="mt-1.5 block text-xs text-red-400">Reason must contain at least 5 characters.</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
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
                  onClick={handleModalClose}
                  disabled={isModalDismissBlocked}
                  className="px-6 py-3 text-sm font-semibold text-neutral-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-neutral-400"
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
