import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  startOfMonth
} from 'date-fns';
import { toast } from 'react-toastify';
import { GlassCard, GoldButton, SectionPanel } from '../../components/admin/SystemUI';
import { WEEKLY_OPENING_HOURS, defaultOpeningHours, useSalonSettings } from '../../hooks/useSalonSettings';

function SettingsToggle({ label, description, checked, onChange, disabled = false }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 py-4 last:border-b-0 sm:items-center">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="mt-1 text-xs leading-5 text-gray-400">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-45 ${
          checked
            ? 'border-[#d4af37]/70 bg-[#d4af37]'
            : 'border-white/10 bg-white/10'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-black transition-transform ${
            checked ? 'translate-x-8' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function SmartNumberField({ label, description, name, value, onChange }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-white">{label}</span>
      <input
        type="number"
        name={name}
        value={value}
        min="0"
        step="1"
        onChange={onChange}
        className="salon-field mt-3"
      />
      <span className="mt-2 block text-xs leading-5 text-gray-400">{description}</span>
    </label>
  );
}

const normalizeMinutes = (value, fallback = 15) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : fallback;
};

const normalizeOpeningHours = (openingHours = {}) => (
  WEEKLY_OPENING_HOURS.reduce((normalized, day) => ({
    ...normalized,
    [day.key]: {
      ...defaultOpeningHours[day.key],
      ...(openingHours?.[day.key] || {})
    }
  }), {})
);

const createOpeningSlot = (overrides = {}) => ({
  id: `slot-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  activeDays: [],
  openTime: '09:00',
  closeTime: '22:00',
  ...overrides
});

const getOpeningHoursSignature = (openingHours = {}) => (
  JSON.stringify(
    WEEKLY_OPENING_HOURS.map((day) => {
      const dayHours = {
        ...defaultOpeningHours[day.key],
        ...(openingHours?.[day.key] || {})
      };

      return [day.key, dayHours.isOpen, dayHours.start, dayHours.end];
    })
  )
);

const getSettingsSignature = (settings = {}) => (
  JSON.stringify({
    salonName: settings.salonName || '',
    supportEmail: settings.supportEmail || '',
    contactNumber: settings.contactNumber || '',
    address: settings.address || '',
    bookingAlerts: Boolean(settings.bookingAlerts),
    customerEmails: Boolean(settings.customerEmails),
    weekendBookings: Boolean(settings.weekendBookings),
    darkReceipts: Boolean(settings.darkReceipts),
    defaultBufferTime: normalizeMinutes(settings.defaultBufferTime),
    gracePeriod: normalizeMinutes(settings.gracePeriod),
    openingHours: getOpeningHoursSignature(settings.openingHours)
  })
);

const openingHoursToSlots = (openingHours = {}) => {
  const normalizedHours = normalizeOpeningHours(openingHours);
  const groups = [];

  WEEKLY_OPENING_HOURS.forEach((day) => {
    const dayHours = normalizedHours[day.key];

    if (!dayHours.isOpen) return;

    const existingGroup = groups.find((group) => (
      group.openTime === dayHours.start && group.closeTime === dayHours.end
    ));

    if (existingGroup) {
      existingGroup.activeDays.push(day.key);
      return;
    }

    groups.push(createOpeningSlot({
      activeDays: [day.key],
      openTime: dayHours.start,
      closeTime: dayHours.end
    }));
  });

  return groups.length > 0 ? groups : [createOpeningSlot()];
};

const slotsToOpeningHours = (slots = []) => {
  const openingHours = WEEKLY_OPENING_HOURS.reduce((hours, day) => ({
    ...hours,
    [day.key]: {
      ...defaultOpeningHours[day.key],
      isOpen: false
    }
  }), {});

  slots.forEach((slot) => {
    slot.activeDays.forEach((dayKey) => {
      if (!openingHours[dayKey]) return;

      openingHours[dayKey] = {
        isOpen: true,
        start: slot.openTime,
        end: slot.closeTime
      };
    });
  });

  return openingHours;
};

function OpeningHoursScheduler({ value, onChange }) {
  const [slots, setSlots] = useState(() => openingHoursToSlots(value));
  const lastEmittedSignatureRef = useRef('');
  const valueSignature = useMemo(() => getOpeningHoursSignature(value), [value]);

  useEffect(() => {
    if (valueSignature === lastEmittedSignatureRef.current) return;
    setSlots(openingHoursToSlots(value));
  }, [valueSignature, value]);

  const emitSlots = (nextSlots) => {
    setSlots(nextSlots);

    const nextOpeningHours = slotsToOpeningHours(nextSlots);
    lastEmittedSignatureRef.current = getOpeningHoursSignature(nextOpeningHours);
    onChange(nextOpeningHours);
  };

  const handleDayToggle = (slotId, dayKey) => {
    const slotHasDay = slots.find((slot) => slot.id === slotId)?.activeDays.includes(dayKey);
    const nextSlots = slots.map((slot) => {
      if (slot.id === slotId) {
        return {
          ...slot,
          activeDays: slotHasDay
            ? slot.activeDays.filter((activeDay) => activeDay !== dayKey)
            : [...slot.activeDays.filter((activeDay) => activeDay !== dayKey), dayKey]
        };
      }

      return {
        ...slot,
        activeDays: slot.activeDays.filter((activeDay) => activeDay !== dayKey)
      };
    });

    emitSlots(nextSlots);
  };

  const handleTimeChange = (slotId, field, value) => {
    emitSlots(slots.map((slot) => (
      slot.id === slotId ? { ...slot, [field]: value } : slot
    )));
  };

  const handleAddSlot = () => {
    emitSlots([...slots, createOpeningSlot()]);
  };

  const handleRemoveSlot = (slotId) => {
    if (slots.length === 1) return;
    emitSlots(slots.filter((slot) => slot.id !== slotId));
  };

  const selectedDayCount = new Set(slots.flatMap((slot) => slot.activeDays)).size;

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3 sm:p-5">
      <div className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Opening Hours</p>
          <p className="mt-1 text-xs leading-5 text-gray-400">Create time slots, then assign each day once. Unselected days stay closed.</p>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4af37]/80">
          {selectedDayCount}/7 Open Days
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        {slots.map((slot, slotIndex) => {
          const hasInvalidTime = slot.openTime >= slot.closeTime;

          return (
            <div
              key={slot.id}
              className={`rounded-xl border bg-zinc-950/60 p-3 transition sm:p-4 ${
                hasInvalidTime ? 'border-red-400/40' : 'border-white/10 hover:border-[#d4af37]/35'
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end xl:flex-nowrap">
                <div className="w-full min-w-0 lg:min-w-[18rem] lg:flex-1">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Slot {slotIndex + 1}
                  </p>
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {WEEKLY_OPENING_HOURS.map((day) => {
                      const isActive = slot.activeDays.includes(day.key);

                      return (
                        <button
                          key={day.key}
                          type="button"
                          onClick={() => handleDayToggle(slot.id, day.key)}
                          className={`flex aspect-square min-h-8 items-center justify-center rounded-full border text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 sm:min-h-10 sm:text-sm ${
                            isActive
                              ? 'border-[#d4af37] bg-[#d4af37] text-black shadow-[0_0_22px_rgba(212,175,55,0.22)]'
                              : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-[#d4af37]/50 hover:text-[#d4af37]'
                          }`}
                          aria-pressed={isActive}
                          aria-label={`${isActive ? 'Remove' : 'Assign'} ${day.label} for slot ${slotIndex + 1}`}
                        >
                          {day.shortLabel.charAt(0)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid w-full gap-3 sm:grid-cols-[minmax(9rem,1fr)_auto_minmax(9rem,1fr)] sm:items-end lg:w-[23rem] lg:flex-none">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-gray-400">Start Time</span>
                    <input
                      type="time"
                      value={slot.openTime}
                      onChange={(event) => handleTimeChange(slot.id, 'openTime', event.target.value)}
                      className="salon-field h-11 w-full min-w-0 pr-3 [color-scheme:dark] sm:min-w-[9rem]"
                    />
                  </label>

                  <span className="hidden pb-3 text-sm font-semibold text-zinc-600 sm:block">to</span>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-gray-400">End Time</span>
                    <input
                      type="time"
                      value={slot.closeTime}
                      onChange={(event) => handleTimeChange(slot.id, 'closeTime', event.target.value)}
                      className="salon-field h-11 w-full min-w-0 pr-3 [color-scheme:dark] sm:min-w-[9rem]"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveSlot(slot.id)}
                  disabled={slotIndex === 0}
                  className="flex h-11 w-full flex-none items-center justify-center rounded-lg border border-white/10 text-zinc-500 transition hover:border-red-400/35 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/10 disabled:hover:bg-transparent disabled:hover:text-zinc-500 sm:w-11 lg:ml-auto"
                  aria-label={`Remove slot ${slotIndex + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {hasInvalidTime && (
                <p className="mt-3 text-xs font-medium text-red-300">End time must be after start time.</p>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleAddSlot}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#d4af37] transition hover:text-[#f3d978]"
      >
        <Plus className="h-4 w-4" />
        Add Specific Hours
      </button>
    </div>
  );
}

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey) => {
  if (!dateKey) return null;

  const [year, month, day] = dateKey.split('-').map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
};

const formatDisplayDate = (dateKey) => {
  const date = parseDateKey(dateKey);

  if (!date) return 'Select Date...';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

function DarkCalendarPicker({ value, onChange, holidays = [] }) {
  const pickerRef = useRef(null);
  const selectedDate = parseDateKey(value);
  const [isOpen, setIsOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState('down');
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());

  const holidayDateKeys = useMemo(
    () => new Set(
      holidays
        .map((holiday) => holiday.date)
        .filter(Boolean)
    ),
    [holidays]
  );

  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [value]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const updateOpenDirection = () => {
      if (!pickerRef.current) return;

      const triggerRect = pickerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;

      setOpenDirection(spaceBelow < 360 && spaceAbove > spaceBelow ? 'up' : 'down');
    };

    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    updateOpenDirection();
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', updateOpenDirection);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updateOpenDirection);
    };
  }, [isOpen]);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const gridStart = new Date(year, month, 1 - firstDay.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);

      return date;
    });
  }, [viewDate]);

  const moveMonth = (offset) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const handleSelectDate = (date) => {
    onChange(toDateKey(date));
    setIsOpen(false);
  };

  const handleToggleCalendar = () => {
    if (!pickerRef.current) {
      setIsOpen((current) => !current);
      return;
    }

    const triggerRect = pickerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    setOpenDirection(spaceBelow < 360 && spaceAbove > spaceBelow ? 'up' : 'down');
    setIsOpen((current) => !current);
  };

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        onClick={handleToggleCalendar}
        className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-left text-zinc-300 transition hover:border-[#c5a880]/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#c5a880]/30"
        aria-expanded={isOpen}
      >
        <span className={value ? 'text-sm font-medium text-zinc-200' : 'text-sm text-zinc-500'}>
          {formatDisplayDate(value)}
        </span>
        <CalendarDays className="h-4 w-4 text-[#c5a880]" />
      </button>

      {isOpen && (
        <div className={`absolute left-0 z-50 w-[min(20rem,calc(100vw-3rem))] rounded-xl border border-zinc-800/80 bg-[#0c0c0e] p-4 shadow-2xl ${
          openDirection === 'up' ? 'bottom-full mb-2' : 'mt-2'
        }`}>
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-900 hover:text-[#c5a880]"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold text-zinc-100">
              {MONTH_LABELS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </p>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-900 hover:text-[#c5a880]"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LABELS.map((weekday) => (
              <div key={weekday} className="py-2 text-xs font-semibold text-zinc-500">
                {weekday}
              </div>
            ))}

            {calendarDays.map((date) => {
              const dateKey = toDateKey(date);
              const isCurrentMonth = date.getMonth() === viewDate.getMonth();
              const isSelected = dateKey === value;
              const isClosed = holidayDateKeys.has(dateKey);

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => handleSelectDate(date)}
                  className={`relative flex h-9 items-center justify-center rounded-lg text-sm transition-all ${
                    isSelected
                      ? 'bg-[#c5a880] font-bold text-black'
                      : isCurrentMonth
                        ? 'text-zinc-200 hover:bg-[#c5a880]/20 hover:text-[#c5a880]'
                        : 'text-zinc-700 hover:bg-zinc-900/70 hover:text-zinc-500'
                  } ${isClosed && !isSelected ? 'bg-red-500/5 text-red-300/70 ring-1 ring-inset ring-red-500/15' : ''}`}
                  aria-label={`${formatDisplayDate(dateKey)}${isClosed ? ' closed' : ''}`}
                >
                  {date.getDate()}
                  {isClosed && (
                    <span
                      className={`absolute bottom-1 h-1 w-1 rounded-full ${
                        isSelected ? 'bg-black/70' : 'bg-red-400/80'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const HOLIDAY_WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function HolidayMultiDateCalendar({ selectedDates = [], onChange, holidays = [], disabled = false }) {
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const holidayDateKeys = useMemo(
    () => new Set(holidays.map((holiday) => holiday.date).filter(Boolean)),
    [holidays]
  );

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const leadingBlankCount = (getDay(monthStart) + 6) % 7;

    return [
      ...Array.from({ length: leadingBlankCount }, (_, index) => ({
        type: 'blank',
        id: `blank-${index}`
      })),
      ...eachDayOfInterval({ start: monthStart, end: monthEnd }).map((date) => ({
        type: 'date',
        id: toDateKey(date),
        date
      }))
    ];
  }, [calendarMonth]);

  const toggleSelectedDate = (date) => {
    if (disabled) return;

    const dateKey = toDateKey(date);
    onChange(
      selectedDates.includes(dateKey)
        ? selectedDates.filter((selectedDate) => selectedDate !== dateKey)
        : [...selectedDates, dateKey]
    );
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-[#07090d] p-2.5 sm:p-3">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCalendarMonth((prev) => addDays(startOfMonth(prev), -1))}
          className="rounded-lg border border-slate-800 p-1.5 text-slate-400 transition hover:border-[#d4af37]/60 hover:text-[#d4af37]"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-slate-100">{format(calendarMonth, 'MMMM yyyy')}</p>
        <button
          type="button"
          onClick={() => setCalendarMonth((prev) => addDays(endOfMonth(prev), 1))}
          className="rounded-lg border border-slate-800 p-1.5 text-slate-400 transition hover:border-[#d4af37]/60 hover:text-[#d4af37]"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {HOLIDAY_WEEKDAY_LABELS.map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {calendarDays.map((calendarDay) => {
          if (calendarDay.type === 'blank') {
            return <div key={calendarDay.id} className="aspect-square" />;
          }

          const dateKey = toDateKey(calendarDay.date);
          const isSelected = selectedDates.includes(dateKey);
          const isToday = isSameDay(calendarDay.date, new Date());
          const isExistingClosure = holidayDateKeys.has(dateKey);

          return (
            <button
              type="button"
              key={calendarDay.id}
              onClick={() => toggleSelectedDate(calendarDay.date)}
              disabled={disabled}
              className={`relative aspect-square min-h-9 rounded-lg text-xs font-semibold transition ${
                isSelected
                  ? 'bg-[#c5a880] text-black shadow-[0_0_16px_rgba(197,168,128,0.35)]'
                  : isToday
                    ? 'border border-[#d4af37]/70 bg-[#d4af37]/10 text-[#d4af37]'
                    : isSameMonth(calendarDay.date, calendarMonth)
                      ? 'text-slate-300 hover:bg-white/10 hover:text-white'
                      : 'text-slate-700'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${
                isExistingClosure && !isSelected ? 'ring-1 ring-inset ring-red-500/20' : ''
              }`}
            >
              {format(calendarDay.date, 'd')}
              {isExistingClosure && (
                <span
                  className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                    isSelected ? 'bg-black/70' : 'bg-red-400/80'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HolidaySelectedDateChips({ selectedDates = [], onRemove, disabled = false }) {
  const sortedSelectedDates = useMemo(
    () => [...selectedDates].sort((first, second) => first.localeCompare(second)),
    [selectedDates]
  );

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37]">Selected Dates</p>
        <span className="rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 px-2.5 py-1 text-xs font-semibold text-[#f1d9ad]">
          {selectedDates.length}
        </span>
      </div>

      <div className="flex max-h-32 min-h-11 flex-wrap items-start gap-2 overflow-y-auto pr-1">
        {sortedSelectedDates.length > 0 ? (
          sortedSelectedDates.map((dateKey) => (
            <span
              key={dateKey}
              className="inline-flex items-center gap-1 rounded-full border border-[#c5a880]/30 bg-[#c5a880]/10 px-2.5 py-1 text-xs font-semibold text-[#f1d9ad]"
            >
              {format(new Date(`${dateKey}T00:00:00`), 'MMM d')}
              <button
                type="button"
                onClick={() => onRemove(dateKey)}
                disabled={disabled}
                className="rounded-full p-0.5 text-[#f1d9ad] transition hover:bg-[#c5a880]/20 hover:text-white disabled:cursor-not-allowed"
                aria-label={`Remove ${format(new Date(`${dateKey}T00:00:00`), 'MMM d')}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        ) : (
          <span className="self-center text-xs text-slate-600">No closure dates selected.</span>
        )}
      </div>
    </div>
  );
}

function SettingsPage() {
  const { settings, setSettings, isLoading } = useSalonSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [savedSettingsSignature, setSavedSettingsSignature] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [holidayForm, setHolidayForm] = useState({
    dates: [],
    name: '',
    isFullDay: true,
    hours: {
      start: '14:00',
      end: '17:00'
    }
  });
  const [isHolidaySaving, setIsHolidaySaving] = useState(false);
  const [isHolidaySyncing, setIsHolidaySyncing] = useState(false);
  const [holidayConflict, setHolidayConflict] = useState(null);
  const [editingHolidayId, setEditingHolidayId] = useState(null);
  const [holidayDeleteTarget, setHolidayDeleteTarget] = useState(null);

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  const fetchHolidays = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/holidays');
      setHolidays(Array.isArray(response.data?.holidays) ? response.data.holidays : []);
    } catch (error) {
      console.error('Error loading holidays:', error);
      toast.error('Could not load salon holidays.');
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const currentSettingsSignature = useMemo(
    () => getSettingsSignature(settings),
    [settings]
  );
  const hasSettingsChanges = Boolean(
    savedSettingsSignature && currentSettingsSignature !== savedSettingsSignature
  );

  useEffect(() => {
    if (!isLoading && !savedSettingsSignature) {
      setSavedSettingsSignature(currentSettingsSignature);
    }
  }, [currentSettingsSignature, isLoading, savedSettingsSignature]);

  const toggleSetting = (key) => {
    setSettings((current) => ({
      ...current,
      [key]: !current[key]
    }));
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setSettings((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleNumberChange = (event) => {
    const { name, value } = event.target;
    setSettings((current) => ({
      ...current,
      [name]: value === '' ? '' : Number(value)
    }));
  };

  const handleOpeningHoursChange = (openingHours) => {
    setSettings((current) => ({
      ...current,
      openingHours
    }));
  };

  const handleSave = async () => {
    if (!hasSettingsChanges) return;

    try {
      const openingHours = normalizeOpeningHours(settings.openingHours);
      const invalidDay = WEEKLY_OPENING_HOURS.find((day) => {
        const dayHours = openingHours[day.key];
        return dayHours.isOpen && (!dayHours.start || !dayHours.end || dayHours.start >= dayHours.end);
      });

      if (invalidDay) {
        toast.error(`Please select valid opening hours for ${invalidDay.label}.`);
        return;
      }

      setIsSaving(true);
      const token = localStorage.getItem('token');
      const payload = {
        ...settings,
        openingHours,
        defaultBufferTime: normalizeMinutes(settings.defaultBufferTime),
        gracePeriod: normalizeMinutes(settings.gracePeriod)
      };

      const response = await axios.put('http://localhost:5000/api/settings', payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const nextSettings = {
        ...settings,
        ...response.data,
        openingHours: normalizeOpeningHours(response.data?.openingHours)
      };

      setSettings((current) => ({
        ...current,
        ...nextSettings
      }));
      setSavedSettingsSignature(getSettingsSignature(nextSettings));
      toast.success('Settings updated successfully.');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error.response?.data?.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleHolidayChange = (event) => {
    const { name, value } = event.target;
    setHolidayForm((current) => ({ ...current, [name]: value }));
  };

  const resetHolidayForm = () => {
    setHolidayForm({
      dates: [],
      name: '',
      isFullDay: true,
      hours: {
        start: '14:00',
        end: '17:00'
      }
    });
    setEditingHolidayId(null);
  };

  const handleHolidayTimeChange = (event) => {
    const { name, value } = event.target;
    setHolidayForm((current) => ({
      ...current,
      hours: {
        ...current.hours,
        [name]: value
      }
    }));
  };

  const handleHolidaySubmit = async (event) => {
    event.preventDefault();

    if (holidayForm.dates.length === 0 || !holidayForm.name.trim()) {
      toast.error('Please select closure dates and add a description.');
      return;
    }

    if (
      editingHolidayId
      &&
      !holidayForm.isFullDay
      && (
        holidayForm.dates.length === 0
        || !holidayForm.hours.start
        || !holidayForm.hours.end
        || holidayForm.hours.start >= holidayForm.hours.end
      )
    ) {
      toast.error('Please select a valid date and time range for partial closure.');
      return;
    }

    try {
      setIsHolidaySaving(true);
      const requestUrl = editingHolidayId
        ? `http://localhost:5000/api/holidays/${editingHolidayId}`
        : 'http://localhost:5000/api/holidays';
      const requestMethod = editingHolidayId ? axios.put : axios.post;
      const holidayPayload = editingHolidayId
        ? {
            date: holidayForm.dates[0],
            name: holidayForm.name.trim(),
            type: holidays.find((holiday) => holiday._id === editingHolidayId)?.type || 'custom',
            isFullDay: holidayForm.isFullDay,
            hours: holidayForm.isFullDay
              ? { start: '', end: '' }
              : {
                  start: holidayForm.hours.start,
                  end: holidayForm.hours.end
                }
          }
        : {
            dates: holidayForm.dates,
            description: holidayForm.name.trim()
          };
      const response = await requestMethod(
        requestUrl,
        holidayPayload,
        getAuthConfig()
      );

      if (response.data?.success) {
        const createdCount = response.data?.createdCount || response.data?.modifiedCount || holidayForm.dates.length;
        toast.success(editingHolidayId ? 'Salon closure updated.' : `${createdCount} closure date(s) saved.`);
        resetHolidayForm();
        fetchHolidays();
      }
    } catch (error) {
      const response = error.response?.data;

      if (response?.conflict) {
        setHolidayConflict({
          date: holidayForm.dates[0],
          name: holidayForm.name.trim(),
          appointmentCount: response.appointmentCount || 0
        });
        return;
      }

      console.error('Error saving holiday:', error);
      toast.error(response?.message || 'Could not save salon closure.');
    } finally {
      setIsHolidaySaving(false);
    }
  };

  const handleForceHoliday = async () => {
    if (!holidayConflict) return;

    try {
      setIsHolidaySaving(true);
      const response = await axios.post(
        'http://localhost:5000/api/holidays/force',
        {
          date: holidayConflict.date,
          name: holidayConflict.name,
          type: 'custom'
        },
        getAuthConfig()
      );

      toast.success(`Date closed. ${response.data?.cancelledAppointments || 0} appointment(s) cancelled.`);
      setHolidayConflict(null);
      resetHolidayForm();
      fetchHolidays();
    } catch (error) {
      console.error('Error force closing holiday:', error);
      toast.error(error.response?.data?.message || 'Could not force close this date.');
    } finally {
      setIsHolidaySaving(false);
    }
  };

  const handleEditHoliday = (holiday) => {
    setEditingHolidayId(holiday._id);
    setHolidayForm({
      dates: holiday.date ? [holiday.date] : [],
      name: holiday.name || '',
      isFullDay: holiday.isFullDay !== false,
      hours: {
        start: holiday.hours?.start || '14:00',
        end: holiday.hours?.end || '17:00'
      }
    });
  };

  const handleSyncPublicHolidays = async () => {
    try {
      setIsHolidaySyncing(true);
      const response = await axios.post(
        'http://localhost:5000/api/holidays/sync',
        { year: new Date().getFullYear() },
        getAuthConfig()
      );

      toast.success(`Synced ${response.data?.fetched || 0} Sri Lankan public holidays.`);
      fetchHolidays();
    } catch (error) {
      console.error('Error syncing holidays:', error);
      toast.error(error.response?.data?.message || 'Could not sync public holidays.');
    } finally {
      setIsHolidaySyncing(false);
    }
  };

  const handleDeleteHoliday = async () => {
    if (!holidayDeleteTarget?._id) return;
    
    try {
      await axios.delete(`http://localhost:5000/api/holidays/${holidayDeleteTarget._id}`, getAuthConfig());
      toast.success('Salon date reopened.');
      setHolidayDeleteTarget(null);
      fetchHolidays();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error(error.response?.data?.message || 'Could not reopen this date.');
    }
  };

  const editingHoliday = editingHolidayId
    ? holidays.find((holiday) => holiday._id === editingHolidayId)
    : null;
  const isHolidayFormDirty = !editingHoliday || (
    holidayForm.dates[0] !== (editingHoliday.date || '')
    || holidayForm.name.trim() !== (editingHoliday.name || '')
    || holidayForm.isFullDay !== (editingHoliday.isFullDay !== false)
    || (
      !holidayForm.isFullDay
      && (
        holidayForm.hours.start !== (editingHoliday.hours?.start || '14:00')
        || holidayForm.hours.end !== (editingHoliday.hours?.end || '17:00')
      )
    )
  );
  const isHolidayFormReady = Boolean(
    holidayForm.dates.length > 0
    && holidayForm.name.trim()
    && isHolidayFormDirty
    && (
      holidayForm.isFullDay
      || (
        holidayForm.hours.start
        && holidayForm.hours.end
        && holidayForm.hours.start < holidayForm.hours.end
      )
    )
  );
  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-hidden px-1 pb-28 sm:px-0 sm:pb-24">
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="mt-2 text-3xl font-serif font-bold tracking-tight text-white sm:mt-4 sm:text-4xl">
            System <span className="text-[#d4af37]">Settings</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400 sm:mt-3 sm:text-base sm:leading-7">
            Manage the salon identity, client communications, and appointment timing rules from one focused workspace.
          </p>
        </div>
      </header>

      {isLoading ? (
        <GlassCard className="p-5 sm:p-8">
          <p className="text-sm text-gray-400">Loading settings...</p>
        </GlassCard>
      ) : (
        <section className="grid gap-5 sm:gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionPanel className="p-4 sm:p-8">
            <div className="border-b border-white/10 pb-5">
              <h2 className="salon-heading">Brand Profile Info</h2>
              <p className="salon-subtext mt-2">Keep client-facing contact details accurate across bookings and notifications.</p>
            </div>

            <div className="mt-5 grid gap-4 sm:mt-7 sm:gap-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-300">Salon Name</span>
                <input
                  type="text"
                  name="salonName"
                  value={settings.salonName}
                  onChange={handleProfileChange}
                  className="salon-field"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-300">Support Email</span>
                <input
                  type="email"
                  name="supportEmail"
                  value={settings.supportEmail}
                  onChange={handleProfileChange}
                  className="salon-field"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2 md:gap-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-300">Contact Number</span>
                  <input
                    type="text"
                    name="contactNumber"
                    value={settings.contactNumber}
                    onChange={handleProfileChange}
                    className="salon-field"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-300">Address</span>
                  <input
                    type="text"
                    name="address"
                    value={settings.address}
                    onChange={handleProfileChange}
                    className="salon-field"
                  />
                </label>
              </div>

              <OpeningHoursScheduler
                value={settings.openingHours}
                onChange={handleOpeningHoursChange}
              />
            </div>
          </SectionPanel>

          <SectionPanel className="p-4 sm:p-8">
            <div className="border-b border-white/10 pb-5">
              <h2 className="salon-heading">Operations & Scheduling</h2>
              <p className="salon-subtext mt-2">Control communication rules and smart appointment timing without extra noise.</p>
            </div>

            <div className="mt-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37]">Core Toggles</p>
              <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-4 sm:px-5">
                <SettingsToggle
                  label="Booking Alerts"
                  description="Send admin email alerts when a new booking is created."
                  checked={settings.bookingAlerts}
                  onChange={() => toggleSetting('bookingAlerts')}
                />
                <SettingsToggle
                  label="Customer Email Confirmations"
                  description="Send customer-facing appointment status emails."
                  checked={settings.customerEmails}
                  onChange={() => toggleSetting('customerEmails')}
                />
                <SettingsToggle
                  label="Dark Receipt Styling"
                  description="Use the premium dark layout for customer appointment updates."
                  checked={settings.darkReceipts}
                  onChange={() => toggleSetting('darkReceipts')}
                />
                <SettingsToggle
                  label="Partial Day Closure"
                  description="Edit a single closure to block only a selected time range while keeping the rest of the day open."
                  checked={Boolean(editingHolidayId && !holidayForm.isFullDay)}
                  disabled={!editingHolidayId}
                  onChange={() => {
                    if (!editingHolidayId) return;
                    setHolidayForm((current) => ({ ...current, isFullDay: !current.isFullDay }));
                  }}
                />
              </div>
            </div>

            <div className="mt-8 border-t border-white/10 pt-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37]">Smart Scheduling Controls</p>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <SmartNumberField
                  label="Default Buffer Time (Minutes)"
                  description="Padded rest time between appointment blocks for cleanup, reset, and stylist breathing room."
                  name="defaultBufferTime"
                  value={settings.defaultBufferTime}
                  onChange={handleNumberChange}
                />
                <SmartNumberField
                  label="Customer Grace Period (Minutes)"
                  description="Delayed threshold before shifting flags, cancellation rules, or operational follow-ups activate."
                  name="gracePeriod"
                  value={settings.gracePeriod}
                  onChange={handleNumberChange}
                />
              </div>
            </div>
          </SectionPanel>

          <SectionPanel className="p-4 sm:p-8 xl:col-span-2">
            <div className="border-b border-white/10 pb-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="salon-heading">Salon Holidays & Closures</h2>
                  <p className="salon-subtext mt-2">Block Poya days, Christmas, and owner-directed closures from the booking calendar.</p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncPublicHolidays}
                  disabled={isHolidaySyncing}
                  className="inline-flex h-11 w-full items-center justify-center rounded-full border border-white/10 px-4 text-sm font-semibold text-zinc-300 transition hover:border-[#d4af37]/40 hover:text-[#d4af37] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isHolidaySyncing ? 'Syncing...' : 'Sync Public Holidays'}
                </button>
              </div>
            </div>

            <form onSubmit={handleHolidaySubmit} className="mt-5 flex flex-col gap-5 sm:mt-7 md:flex-row md:items-start lg:gap-7">
              <div className="w-full md:w-[42%] md:min-w-[20rem] xl:w-[38%]">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="block text-sm font-medium text-gray-300">
                    {editingHolidayId ? 'Closure Date' : 'Closure Dates'}
                  </span>
                  {!editingHolidayId && (
                    <span className="text-xs font-semibold text-[#d4af37]">
                      Total: {holidayForm.dates.length} Day{holidayForm.dates.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                <HolidayMultiDateCalendar
                  selectedDates={holidayForm.dates}
                  onChange={(dates) => setHolidayForm((current) => ({
                    ...current,
                    dates: editingHolidayId ? dates.slice(-1) : dates
                  }))}
                  holidays={holidays}
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-4 md:self-stretch">
                <HolidaySelectedDateChips
                  selectedDates={holidayForm.dates}
                  disabled={isHolidaySaving}
                  onRemove={(dateKey) => setHolidayForm((current) => ({
                    ...current,
                    dates: current.dates.filter((selectedDate) => selectedDate !== dateKey)
                  }))}
                />

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <label className="block min-w-0">
                    <span className="mb-2 block text-sm font-medium text-gray-300">Description</span>
                    <input
                      type="text"
                      name="name"
                      value={holidayForm.name}
                      onChange={handleHolidayChange}
                      placeholder="Poya Day, Christmas, emergency closure..."
                      className="salon-field"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={isHolidaySaving || !isHolidayFormReady}
                    className="inline-flex h-12 w-full items-center justify-center rounded-full border border-[#d4af37]/40 px-5 text-sm font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-zinc-600 sm:h-[52px] lg:w-auto lg:min-w-[9.5rem]"
                  >
                    {isHolidaySaving ? 'Saving...' : editingHolidayId ? 'Update Closure' : 'Add Closure'}
                  </button>
                </div>

                {editingHolidayId && !holidayForm.isFullDay && (
                  <div className="overflow-hidden rounded-xl border border-sky-400/15 bg-sky-400/[0.03] p-3 transition-all duration-300 sm:p-4">
                    <p className="text-sm font-semibold text-white">Partial Closure Hours</p>
                    <p className="mt-1 text-xs leading-5 text-gray-400">
                      These hours will be blocked while time slots outside this range stay available.
                    </p>
                    <div className="mt-4 grid gap-4 sm:mt-5 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-gray-300">Start Time</span>
                        <input
                          type="time"
                          name="start"
                          value={holidayForm.hours.start}
                          onChange={handleHolidayTimeChange}
                          className="salon-field [color-scheme:dark]"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-gray-300">End Time</span>
                        <input
                          type="time"
                          name="end"
                          value={holidayForm.hours.end}
                          onChange={handleHolidayTimeChange}
                          className="salon-field [color-scheme:dark]"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </form>

            {editingHolidayId && (
              <button
                type="button"
                onClick={resetHolidayForm}
                className="mt-3 text-sm font-semibold text-zinc-500 transition hover:text-zinc-300"
              >
                Cancel edit
              </button>
            )}

            <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-3 sm:mt-7 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37]">Active Closed Dates</p>
              <div className="mt-3">
                {holidays.length === 0 ? (
                  <p className="text-sm text-gray-500">No holidays or custom closures have been added yet.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {holidays.map((holiday) => (
                      <div key={holiday._id || holiday.date} className="rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-3 sm:px-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">{holiday.name}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {holiday.date}
                              {holiday.isFullDay === false
                                ? ` - Partial closure ${holiday.hours?.start || ''}-${holiday.hours?.end || ''}`
                                : ' - Full day'}
                            </p>
                            {holiday.isSystemGenerated && (
                              <p className="mt-1 text-[11px] uppercase tracking-wider text-[#d4af37]/70">Synced public holiday</p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditHoliday(holiday)}
                              className="rounded-md bg-sky-400/5 px-3 py-1.5 text-sm font-semibold text-sky-300/85 transition-colors duration-200 hover:border-sky-300/40 hover:bg-sky-400/10 hover:text-sky-200"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setHolidayDeleteTarget(holiday)}
                              className="rounded-md px-3 py-1.5 text-sm font-semibold text-red-400/75 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </SectionPanel>
        </section>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-end border-t border-zinc-800/80 bg-[#0a0a0c]/90 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4 md:left-80 md:z-40">
        <GoldButton type="button" onClick={handleSave} disabled={isSaving || isLoading || !hasSettingsChanges} className="w-full px-6 py-3 text-sm disabled:opacity-45 sm:w-fit sm:text-base">
          {isSaving ? 'Saving...' : 'Save Changes'}
        </GoldButton>
      </div>

      {holidayConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-[#0b0b0d] p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-400">Closure Conflict</p>
            <h3 className="mt-3 text-2xl font-bold text-white">Warning</h3>
            <p className="mt-4 text-sm leading-6 text-zinc-300">
              There are {holidayConflict.appointmentCount} active appointments scheduled on this date.
              Proceeding will automatically CANCEL them and notify clients.
            </p>
            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
              <p className="text-sm font-semibold text-white">{holidayConflict.name}</p>
              <p className="mt-1 text-xs text-zinc-500">{holidayConflict.date}</p>
            </div>
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setHolidayConflict(null)}
                className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleForceHoliday}
                disabled={isHolidaySaving}
                className="rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isHolidaySaving ? 'Closing...' : 'Confirm & Force Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {holidayDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-[#0c0c0e] p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Re-open Salon?</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Are you sure you want to re-open the salon on this date? Clients will be able to book slots.
            </p>
            <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-sm font-semibold text-white">{holidayDeleteTarget.name}</p>
              <p className="mt-1 text-xs text-zinc-500">{holidayDeleteTarget.date}</p>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setHolidayDeleteTarget(null)}
                className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteHoliday}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Re-open Date
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
