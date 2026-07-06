import { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../utils/apiConfig';

export const WEEKLY_OPENING_HOURS = [
  { key: 'monday', shortLabel: 'Mon', label: 'Monday' },
  { key: 'tuesday', shortLabel: 'Tue', label: 'Tuesday' },
  { key: 'wednesday', shortLabel: 'Wed', label: 'Wednesday' },
  { key: 'thursday', shortLabel: 'Thu', label: 'Thursday' },
  { key: 'friday', shortLabel: 'Fri', label: 'Friday' },
  { key: 'saturday', shortLabel: 'Sat', label: 'Saturday' },
  { key: 'sunday', shortLabel: 'Sun', label: 'Sunday' }
];

export const defaultOpeningHours = WEEKLY_OPENING_HOURS.reduce((hours, day) => ({
  ...hours,
  [day.key]: {
    isOpen: true,
    start: '09:00',
    end: '22:00'
  }
}), {});

const defaultSettings = {
  salonName: 'Salon DEES',
  supportEmail: 'support@salondees.com',
  contactNumber: '+94 77 123 4567',
  address: 'Colombo, Sri Lanka',
  salonInteriorImage: '/salonInterior.jpg',
  ownerImage: '/Owner.jpg',
  openingHours: defaultOpeningHours,
  bookingAlerts: true,
  customerEmails: true,
  weekendBookings: true,
  darkReceipts: true,
  defaultBufferTime: 15,
  gracePeriod: 15
};

export function useSalonSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchSettings = async () => {
      try {
        setSettingsError(null);
        const response = await axios.get(`${API_BASE_URL}/api/settings`, {
          signal: controller.signal
        });

        setSettings((current) => ({
          ...current,
          ...response.data,
          openingHours: {
            ...defaultOpeningHours,
            ...(response.data?.openingHours || {})
          }
        }));
      } catch (error) {
        if (axios.isCancel(error) || error.name === 'CanceledError' || controller.signal.aborted) {
          return;
        }

        console.error('Error fetching salon settings:', error);
        setSettingsError(error.response?.data?.message || 'Could not load salon settings.');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchSettings();

    return () => {
      controller.abort();
    };
  }, []);

  return { settings, setSettings, isLoading, settingsError };
}
