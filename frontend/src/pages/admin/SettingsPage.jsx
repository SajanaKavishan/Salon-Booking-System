import React, { useState } from 'react';
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
        </section>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-end border-t border-zinc-800/80 bg-[#0a0a0c]/90 px-6 py-4 backdrop-blur-md md:left-80">
        <GoldButton type="button" onClick={handleSave} disabled={isSaving || isLoading} className="w-full px-6 py-3 text-base sm:w-fit">
          {isSaving ? 'Saving...' : 'Save Changes'}
        </GoldButton>
      </div>
    </div>
  );
}

export default SettingsPage;
