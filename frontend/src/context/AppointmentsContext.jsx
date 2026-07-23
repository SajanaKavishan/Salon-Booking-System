import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AUTH_SESSION_CHANGED_EVENT, getStoredAuthenticatedUserId } from '../utils/auth';
import { AppointmentsContext } from './appointmentsStore';

const getAppointmentId = (appointment) => appointment?._id || appointment?.id;
const createInitialAppointmentsState = () => ({
  appointments: [],
  metadata: null,
  status: 'idle',
});

export function AppointmentsProvider({ children }) {
  const [appointmentState, setAppointmentState] = useState(createInitialAppointmentsState);
  const authenticatedUserIdRef = useRef(getStoredAuthenticatedUserId());

  const clearAppointments = useCallback(() => {
    setAppointmentState(createInitialAppointmentsState());
  }, []);

  const synchronizeAuthenticatedUser = useCallback(() => {
    const nextUserId = getStoredAuthenticatedUserId();

    if (!nextUserId || nextUserId !== authenticatedUserIdRef.current) {
      authenticatedUserIdRef.current = nextUserId;
      clearAppointments();
    }

    return nextUserId;
  }, [clearAppointments]);

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (!event.key || ['token', 'user', 'userRole'].includes(event.key)) {
        synchronizeAuthenticatedUser();
      }
    };

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, synchronizeAuthenticatedUser);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, synchronizeAuthenticatedUser);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [synchronizeAuthenticatedUser]);

  const replaceAppointments = useCallback((nextAppointments, metadata = null) => {
    const currentUserId = synchronizeAuthenticatedUser();
    const ownerUserId = metadata?.ownerUserId ? String(metadata.ownerUserId) : null;

    if (!currentUserId || (ownerUserId && ownerUserId !== currentUserId)) return false;

    setAppointmentState({
      appointments: Array.isArray(nextAppointments) ? nextAppointments : [],
      metadata,
      status: 'success',
    });
    return true;
  }, [synchronizeAuthenticatedUser]);

  const upsertAppointment = useCallback((nextAppointment, metadata = null) => {
    const nextAppointmentId = getAppointmentId(nextAppointment);
    if (!nextAppointmentId) return;

    const currentUserId = synchronizeAuthenticatedUser();
    if (!currentUserId) return;

    setAppointmentState((currentState) => {
      const ownerUserId = metadata?.ownerUserId || currentState.metadata?.ownerUserId;
      if (!ownerUserId || String(ownerUserId) !== currentUserId) return currentState;

      const existingIndex = currentState.appointments.findIndex(
        (appointment) => getAppointmentId(appointment) === nextAppointmentId
      );

      if (existingIndex === -1) {
        return {
          ...currentState,
          appointments: [nextAppointment, ...currentState.appointments],
          metadata: currentState.metadata || { ownerUserId: currentUserId },
          status: 'success',
        };
      }

      return {
        ...currentState,
        appointments: currentState.appointments.map((appointment, index) => (
          index === existingIndex ? { ...appointment, ...nextAppointment } : appointment
        )),
        status: 'success',
      };
    });
  }, [synchronizeAuthenticatedUser]);

  const removeAppointment = useCallback((appointmentId) => {
    if (!appointmentId) return;

    const currentUserId = synchronizeAuthenticatedUser();
    if (!currentUserId) return;

    setAppointmentState((currentState) => {
      if (String(currentState.metadata?.ownerUserId || '') !== currentUserId) return currentState;

      return {
        ...currentState,
        appointments: currentState.appointments.filter(
          (appointment) => getAppointmentId(appointment) !== appointmentId
        ),
      };
    });
  }, [synchronizeAuthenticatedUser]);

  const value = useMemo(() => ({
    ...appointmentState,
    replaceAppointments,
    upsertAppointment,
    removeAppointment,
    clearAppointments,
  }), [appointmentState, clearAppointments, removeAppointment, replaceAppointments, upsertAppointment]);

  return (
    <AppointmentsContext.Provider value={value}>
      {children}
    </AppointmentsContext.Provider>
  );
}

