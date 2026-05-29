import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { GlassCard, GoldButton, SectionPanel } from '../../components/admin/SystemUI';
import { useSalonSettings } from '../../hooks/useSalonSettings';

function SettingsToggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-[#0a0a0a]/35 p-5">
      <div>
        <p className="text-base font-semibold text-white">{label}</p>
        <p className="mt-2 text-sm leading-6 text-gray-400">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative mt-1 inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition ${
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

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('token');
      const response = await axios.put('http://localhost:5000/api/settings', settings, {
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

  const profile = useMemo(() => ({
    salonName: settings.salonName,
    supportEmail: settings.supportEmail,
    contactNumber: settings.contactNumber,
    address: settings.address
  }), [settings]);

  const quickStats = [
    { label: 'Admin Access', value: 'Protected', hint: 'Role-based security active' },
    { label: 'Notifications', value: settings.bookingAlerts ? 'Live' : 'Muted', hint: 'Booking alert status' },
    { label: 'Booking Mode', value: settings.weekendBookings ? '7 Days' : 'Weekdays', hint: 'Salon availability rule' }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto">
      <header className="mb-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#d4af37]/80">Admin Controls</p>
          <h1 className="mt-4 text-4xl font-serif font-bold tracking-tight text-white">
            System <span className="text-[#d4af37]">Settings</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-gray-400">
            Shape the salon experience behind the scenes with polished controls for profile details, booking behavior, and operational alerts.
          </p>
        </div>

        <GoldButton type="button" onClick={handleSave} disabled={isSaving || isLoading} className="w-fit px-6 py-3 text-base">
          {isSaving ? 'Saving...' : 'Save Changes'}
        </GoldButton>
      </header>

      {isLoading ? (
        <GlassCard className="p-8">
          <p className="text-sm text-gray-400">Loading settings...</p>
        </GlassCard>
      ) : (
        <>
          <section className="grid gap-6 md:grid-cols-3">
            {quickStats.map((item) => (
              <GlassCard key={item.label} className="p-6">
                <p className="text-sm uppercase tracking-[0.16em] text-gray-500">{item.label}</p>
                <p className="mt-3 font-serif text-3xl text-[#d4af37]">{item.value}</p>
                <p className="mt-3 text-sm text-gray-400">{item.hint}</p>
              </GlassCard>
            ))}
          </section>

          <section className="mt-10 grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
            <SectionPanel className="p-8">
              <div className="flex flex-col gap-3 border-b border-white/10 pb-5">
                <h2 className="salon-heading">Brand Profile</h2>
                <p className="salon-subtext">Keep your business identity sharp across your dashboard and booking experience.</p>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-300">Salon Name</span>
                  <input
                    type="text"
                    name="salonName"
                    value={profile.salonName}
                    onChange={handleProfileChange}
                    className="salon-field"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-300">Support Email</span>
                  <input
                    type="email"
                    name="supportEmail"
                    value={profile.supportEmail}
                    onChange={handleProfileChange}
                    className="salon-field"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-300">Contact Number</span>
                  <input
                    type="text"
                    name="contactNumber"
                    value={profile.contactNumber}
                    onChange={handleProfileChange}
                    className="salon-field"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-300">Address</span>
                  <input
                    type="text"
                    name="address"
                    value={profile.address}
                    onChange={handleProfileChange}
                    className="salon-field"
                  />
                </label>
              </div>

              <GlassCard className="mt-8 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">Client-facing preview</p>
                    <p className="mt-2 text-sm leading-6 text-gray-400">A quick summary of the current salon identity used across the booking system.</p>
                  </div>
                  <div className="rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
                    Brand Active
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Name</p>
                    <p className="mt-2 text-base font-semibold text-white">{profile.salonName}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Email</p>
                    <p className="mt-2 text-base font-semibold text-white">{profile.supportEmail}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Phone</p>
                    <p className="mt-2 text-base font-semibold text-white">{profile.contactNumber}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Location</p>
                    <p className="mt-2 text-base font-semibold text-white">{profile.address}</p>
                  </div>
                </div>
              </GlassCard>
            </SectionPanel>

            <div className="grid gap-8">
              <SectionPanel className="p-8">
                <div className="border-b border-white/10 pb-5">
                  <h2 className="salon-heading">Operational Preferences</h2>
                  <p className="salon-subtext mt-2">Tune how bookings, alerts, and admin automation behave.</p>
                </div>

                <div className="mt-6 grid gap-4">
                  <SettingsToggle
                    label="Booking Alerts"
                    description="Send an admin email alert to the configured support address whenever a new booking is created."
                    checked={settings.bookingAlerts}
                    onChange={() => toggleSetting('bookingAlerts')}
                  />
                  <SettingsToggle
                    label="Customer Email Confirmations"
                    description="Enable customer-facing appointment status emails when bookings are approved or updated."
                    checked={settings.customerEmails}
                    onChange={() => toggleSetting('customerEmails')}
                  />
                  <SettingsToggle
                    label="Weekend Bookings"
                    description="Allow clients to request appointments on Saturdays and Sundays."
                    checked={settings.weekendBookings}
                    onChange={() => toggleSetting('weekendBookings')}
                  />
                  <SettingsToggle
                    label="Auto-confirm VIP Clients"
                    description="Automatically approve appointments for clients with a strong completed-visit history."
                    checked={settings.autoConfirmVip}
                    onChange={() => toggleSetting('autoConfirmVip')}
                  />
                </div>
              </SectionPanel>

              <SectionPanel className="p-8">
                <div className="border-b border-white/10 pb-5">
                  <h2 className="salon-heading">Studio Utilities</h2>
                  <p className="salon-subtext mt-2">Small controls for day-to-day admin rhythm.</p>
                </div>

                <div className="mt-6 grid gap-4">
                  <SettingsToggle
                    label="Low Stock Reports"
                    description="Persist the salon's inventory-report preference now, ready for a future inventory module."
                    checked={settings.lowStockReports}
                    onChange={() => toggleSetting('lowStockReports')}
                  />
                  <SettingsToggle
                    label="Dark Receipt Styling"
                    description="Use the premium dark email layout for customer appointment updates."
                    checked={settings.darkReceipts}
                    onChange={() => toggleSetting('darkReceipts')}
                  />
                </div>

                <div className="mt-6 rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/10 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d4af37]">Live Wiring</p>
                  <p className="mt-3 text-sm leading-6 text-gray-200">
                    Booking, contact identity, status emails, and VIP auto-approval now read from this settings record. `Low Stock Reports` is stored and ready for an inventory feature.
                  </p>
                </div>
              </SectionPanel>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default SettingsPage;
