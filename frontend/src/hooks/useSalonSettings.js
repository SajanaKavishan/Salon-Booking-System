import { useEffect, useState } from 'react';
import axios from 'axios';

const defaultSettings = {
  salonName: 'Salon DEES',
  supportEmail: 'support@salondees.com',
  contactNumber: '+94 77 123 4567',
  address: 'Colombo, Sri Lanka',
  bookingAlerts: true,
  customerEmails: true,
  lowStockReports: false,
  weekendBookings: true,
  autoConfirmVip: false,
  darkReceipts: true
};

export function useSalonSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/settings');
        if (isMounted) {
          setSettings((current) => ({ ...current, ...response.data }));
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
