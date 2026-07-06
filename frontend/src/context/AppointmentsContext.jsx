import React, { useCallback, useMemo, useState } from 'react';
import { AppointmentsContext } from './appointmentsStore';

const getAppointmentId = (appointment) => appointment?._id || appointment?.id;

export function AppointmentsProvider({ children }) {
  const [appointments, setAppointments] = useState([]);

  const replaceAppointments = useCallback((nextAppointments) => {
    setAppointments(Array.isArray(nextAppointments) ? nextAppointments : []);
  }, []);

  const upsertAppointment = useCallback((nextAppointment) => {
    const nextAppointmentId = getAppointmentId(nextAppointment);
    if (!nextAppointmentId) return;

    setAppointments((currentAppointments) => {
      const existingIndex = currentAppointments.findIndex(
        (appointment) => getAppointmentId(appointment) === nextAppointmentId
      );

      if (existingIndex === -1) {
        return [nextAppointment, ...currentAppointments];
      }

      return currentAppointments.map((appointment, index) => (
        index === existingIndex ? { ...appointment, ...nextAppointment } : appointment
      ));
    });
  }, []);

  const removeAppointment = useCallback((appointmentId) => {
    if (!appointmentId) return;

    setAppointments((currentAppointments) => (
      currentAppointments.filter((appointment) => getAppointmentId(appointment) !== appointmentId)
    ));
  }, []);

  const value = useMemo(() => ({
    appointments,
    replaceAppointments,
    upsertAppointment,
    removeAppointment
  }), [appointments, removeAppointment, replaceAppointments, upsertAppointment]);

  return (
    <AppointmentsContext.Provider value={value}>
      {children}
    </AppointmentsContext.Provider>
  );
}

