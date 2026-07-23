import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAuthStorage, notifyAuthSessionChanged } from '../utils/auth';
import { AppointmentsProvider } from './AppointmentsContext';
import { useAppointments } from './useAppointments';

const storeSession = (userId) => {
  window.localStorage.setItem('token', `token-${userId}`);
  window.localStorage.setItem('userRole', 'customer');
  window.localStorage.setItem('user', JSON.stringify({ id: userId }));
};

function AppointmentStateProbe() {
  const {
    appointments,
    metadata,
    status,
    replaceAppointments,
  } = useAppointments();

  return (
    <>
      <output data-testid="appointment-state">
        {JSON.stringify({ appointments, metadata, status })}
      </output>
      <button
        type="button"
        onClick={() => replaceAppointments([{ _id: 'appointment-a' }], { ownerUserId: 'user-a' })}
      >
        Store user A appointments
      </button>
    </>
  );
}

const readAppointmentState = () => JSON.parse(screen.getByTestId('appointment-state').textContent);

describe('AppointmentsProvider session isolation', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('clears all appointment state when logout clears the authenticated session', () => {
    storeSession('user-a');
    render(<AppointmentsProvider><AppointmentStateProbe /></AppointmentsProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Store user A appointments' }));
    expect(readAppointmentState()).toEqual({
      appointments: [{ _id: 'appointment-a' }],
      metadata: { ownerUserId: 'user-a' },
      status: 'success',
    });

    act(() => clearAuthStorage());

    expect(readAppointmentState()).toEqual({
      appointments: [],
      metadata: null,
      status: 'idle',
    });
  });

  it('clears on an identity change and rejects a late response owned by the old user', () => {
    storeSession('user-a');
    render(<AppointmentsProvider><AppointmentStateProbe /></AppointmentsProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Store user A appointments' }));
    storeSession('user-b');
    act(() => notifyAuthSessionChanged());

    expect(readAppointmentState().appointments).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Store user A appointments' }));
    expect(readAppointmentState()).toEqual({
      appointments: [],
      metadata: null,
      status: 'idle',
    });
  });
});
