import { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

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

  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/settings`);
        if (isMounted) {
          setSettings((current) => ({
            ...current,
            ...response.data,
            openingHours: {
              ...defaultOpeningHours,
              ...(response.data?.openingHours || {})
            }
          }));
        }
      } catch (error) {
        console.error('Error fetching salon settings:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  return { settings, setSettings, isLoading };
}
