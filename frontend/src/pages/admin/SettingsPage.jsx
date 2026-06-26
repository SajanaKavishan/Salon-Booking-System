import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { GlassCard, GoldButton, SectionPanel } from '../../components/admin/SystemUI';
import { useSalonSettings } from '../../hooks/useSalonSettings';

function SettingsToggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 py-4 last:border-b-0 sm:items-center">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="mt-1 text-xs leading-5 text-gray-400">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition ${
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

function SettingsPage() {
  const { settings, setSettings, isLoading } = useSalonSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [holidayForm, setHolidayForm] = useState({
    date: '',
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

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('token');
      const payload = {
        ...settings,
        defaultBufferTime: normalizeMinutes(settings.defaultBufferTime),
        gracePeriod: normalizeMinutes(settings.gracePeriod)
      };

      const response = await axios.put('http://localhost:5000/api/settings', payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setSettings((current) => ({ ...current, ...response.data }));
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
      date: '',
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

    if (!holidayForm.date || !holidayForm.name.trim()) {
      toast.error('Please add a closure date and description.');
      return;
    }

    if (
      !holidayForm.isFullDay
      && (
        !holidayForm.date
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
      const response = await requestMethod(
        requestUrl,
        {
          date: holidayForm.date,
          name: holidayForm.name.trim(),
          type: editingHolidayId
            ? holidays.find((holiday) => holiday._id === editingHolidayId)?.type || 'custom'
            : 'custom',
          isFullDay: holidayForm.isFullDay,
          hours: holidayForm.isFullDay
            ? { start: '', end: '' }
            : {
                start: holidayForm.hours.start,
                end: holidayForm.hours.end
              }
        },
        getAuthConfig()
      );

      if (response.data?.success) {
        toast.success(editingHolidayId ? 'Salon closure updated.' : 'Salon closure saved.');
        resetHolidayForm();
        fetchHolidays();
      }
    } catch (error) {
      const response = error.response?.data;

      if (response?.conflict) {
        setHolidayConflict({
          date: holidayForm.date,
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
      date: holiday.date || '',
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
    holidayForm.date !== (editingHoliday.date || '')
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
    holidayForm.date
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
    <div className="mx-auto w-full max-w-7xl pb-24">
      <header className="mb-8 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="mt-4 text-4xl font-serif font-bold tracking-tight text-white">
            System <span className="text-[#d4af37]">Settings</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-gray-400">
            Manage the salon identity, client communications, and appointment timing rules from one focused workspace.
          </p>
        </div>
      </header>

      {isLoading ? (
        <GlassCard className="p-8">
          <p className="text-sm text-gray-400">Loading settings...</p>
        </GlassCard>
      ) : (
        <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionPanel className="p-5 sm:p-8">
            <div className="border-b border-white/10 pb-5">
              <h2 className="salon-heading">Brand Profile Info</h2>
              <p className="salon-subtext mt-2">Keep client-facing contact details accurate across bookings and notifications.</p>
            </div>

            <div className="mt-7 grid gap-5">
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

              <div className="grid gap-5 md:grid-cols-2">
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
            </div>
          </SectionPanel>

          <SectionPanel className="p-5 sm:p-8">
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
                  description="Turn on to close only a selected time range for the holiday currently being created or edited."
                  checked={!holidayForm.isFullDay}
                  onChange={() => setHolidayForm((current) => ({ ...current, isFullDay: !current.isFullDay }))}
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

          <SectionPanel className="p-5 sm:p-8 xl:col-span-2">
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
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-semibold text-zinc-300 transition hover:border-[#d4af37]/40 hover:text-[#d4af37] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isHolidaySyncing ? 'Syncing...' : 'Sync Public Holidays'}
                </button>
              </div>
            </div>

            <form onSubmit={handleHolidaySubmit} className="mt-7 grid items-end gap-5 lg:grid-cols-[minmax(180px,0.6fr)_minmax(220px,1fr)_auto]">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-300">Closure Date</span>
                <input
                  type="date"
                  name="date"
                  value={holidayForm.date}
                  onChange={handleHolidayChange}
                  className="salon-field [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:invert"
                />
              </label>

              <label className="block">
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
                className="inline-flex h-[52px] w-full items-center justify-center rounded-full border border-[#d4af37]/40 px-5 text-sm font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-zinc-600 sm:w-auto lg:self-end"
              >
                {isHolidaySaving ? 'Saving...' : editingHolidayId ? 'Update Closure' : 'Add Closure'}
              </button>

              {!holidayForm.isFullDay && (
                <div className="overflow-hidden rounded-xl border border-sky-400/15 bg-sky-400/[0.03] p-4 transition-all duration-300 lg:col-span-2">
                  <p className="text-sm font-semibold text-white">Partial Closure Hours</p>
                  <p className="mt-1 text-xs leading-5 text-gray-400">
                    These hours will be blocked while time slots outside this range stay available.
                  </p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
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

            <div className="mt-7 rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37]">Active Closed Dates</p>
              <div className="mt-3">
                {holidays.length === 0 ? (
                  <p className="text-sm text-gray-500">No holidays or custom closures have been added yet.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {holidays.map((holiday) => (
                      <div key={holiday._id || holiday.date} className="rounded-lg border border-white/10 bg-zinc-950/70 px-4 py-3">
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

      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-end border-t border-zinc-800/80 bg-[#0a0a0c]/90 px-6 py-4 backdrop-blur-md md:left-80">
        <GoldButton type="button" onClick={handleSave} disabled={isSaving || isLoading} className="w-full px-6 py-3 text-base sm:w-fit">
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
