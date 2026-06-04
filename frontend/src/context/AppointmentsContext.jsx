import React, { createContext, useContext, useState, useCallback } from 'react';

const AppointmentsContext = createContext();

export function AppointmentsProvider({ children }) {
  const [appointments, setAppointments] = useState([]);

  const addAppointment = useCallback((newAppointment) => {
    setAppointments((prev) => [newAppointment, ...prev]);
  }, []);

  const updateAppointments = useCallback((newAppointments) => {
    setAppointments(newAppointments);
  }, []);

  const value = {
    appointments,
    setAppointments,
    addAppointment,
    updateAppointments
  };

  return (
    <AppointmentsContext.Provider value={value}>
      {children}
    </AppointmentsContext.Provider>
  );
}

export function useAppointments() {
  const context = useContext(AppointmentsContext);
  if (!context) {
    throw new Error('useAppointments must be used within AppointmentsProvider');
  }
  return context;
}
