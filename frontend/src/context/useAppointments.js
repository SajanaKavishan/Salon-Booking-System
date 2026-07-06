import { useContext } from 'react';
import { AppointmentsContext } from './appointmentsStore';

export function useAppointments() {
  const context = useContext(AppointmentsContext);
  if (!context) {
    throw new Error('useAppointments must be used within AppointmentsProvider');
  }
  return context;
}
