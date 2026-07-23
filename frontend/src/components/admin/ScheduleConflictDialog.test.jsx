import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ScheduleConflictDialog from './ScheduleConflictDialog';

const conflictDetails = {
  message: 'Two schedule rules affect the same appointment.',
  conflicts: [
    {
      appointmentId: 'appointment-1',
      customerName: 'Alex Customer',
      date: '2026-07-22',
      startTime: '09:00 AM',
      endTime: '10:00 AM',
      reason: 'Working hours changed.',
    },
    {
      appointmentId: 'appointment-1',
      customerName: 'Alex Customer',
      date: '2026-07-22',
      reason: 'Weekly off day changed.',
    },
  ],
};

const renderDialog = (onClose = vi.fn()) => render(
  <MemoryRouter>
    <ScheduleConflictDialog details={conflictDetails} onClose={onClose} />
  </MemoryRouter>
);

describe('ScheduleConflictDialog', () => {
  it('groups duplicate conflict records by appointment without losing reasons', () => {
    renderDialog();

    expect(screen.getByRole('dialog', { name: 'Appointments must be rescheduled' })).toBeInTheDocument();
    expect(screen.getByText('1 conflicting appointment')).toBeInTheDocument();
    expect(screen.getByText('Alex Customer')).toBeInTheDocument();
    expect(screen.getByText(/Working hours changed/)).toBeInTheDocument();
    expect(screen.getByText(/Weekly off day changed/)).toBeInTheDocument();
  });

  it('closes from both its close button and Escape key', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog(onClose);

    await user.click(screen.getByRole('button', { name: 'Close schedule conflict dialog' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
