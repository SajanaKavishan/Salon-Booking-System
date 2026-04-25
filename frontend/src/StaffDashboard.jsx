import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { GlassCard, GoldButton, StatusBadge } from './components/SystemUI';

const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;

  const parts = timeStr.trim().split(' ');
  if (parts.length < 2) return 0;

  const [time, modifier] = parts;
  const [rawHours, rawMinutes] = time.split(':').map(Number);

  if (Number.isNaN(rawHours) || Number.isNaN(rawMinutes)) return 0;

  let hours = rawHours;
  if (hours === 12) hours = 0;
  if (modifier === 'PM') hours += 12;

  return hours * 60 + rawMinutes;
};

const buildAppointmentDateTime = (appointment) => {
  if (!appointment?.date) return null;

  const [year, month, day] = appointment.date.split('-').map(Number);
  if ([year, month, day].some(Number.isNaN)) return null;

  const startMinutes = timeToMinutes(appointment.startTime);
  const hours = Math.floor(startMinutes / 60);
  const minutes = startMinutes % 60;

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

function StaffDashboard() {
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionKey, setActionKey] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      setIsLoading(false);
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    const fetchSchedule = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/appointments/staff-schedule', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setAppointments(response.data);
      } catch (error) {
        console.error('Error fetching staff appointments:', error);
        toast.error('Failed to load staff dashboard.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  const todayKey = useMemo(() => {
    const now = new Date();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }, []);

  const todayAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => appointment.date === todayKey)
      .sort((first, second) => {
        const firstDate = buildAppointmentDateTime(first)?.getTime() || 0;
        const secondDate = buildAppointmentDateTime(second)?.getTime() || 0;
        return firstDate - secondDate;
      });
  }, [appointments, todayKey]);

  const pendingApprovals = todayAppointments.filter((appointment) => appointment.status === 'Pending').length;
  const completedSessions = todayAppointments.filter((appointment) => appointment.status === 'Completed').length;
  const activeClients = new Set(
    todayAppointments
      .map((appointment) => appointment.user?._id || appointment.user?.email || appointment.user?.name)
      .filter(Boolean)
  ).size;

  const handleStatusUpdate = async (appointmentId, status) => {
    try {
      const token = localStorage.getItem('token');
      setActionKey(`${appointmentId}-${status}`);

      const endpoint = status === 'Approved' || status === 'Rejected'
        ? `http://localhost:5000/api/appointments/${appointmentId}/status`
        : `http://localhost:5000/api/appointments/${appointmentId}/staff-status`;

      const response = await axios.put(
        endpoint,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const updatedStatus = response.data.appointment?.status || status;

      setAppointments((current) =>
        current.map((appointment) =>
          appointment._id === appointmentId
            ? { ...appointment, status: updatedStatus }
            : appointment
        )
      );

      toast.success(`Appointment updated to ${updatedStatus}.`);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error(error.response?.data?.message || 'Could not update appointment status.');
    } finally {
      setActionKey('');
    }
  };

  const statCards = [
    {
      label: "Today's Appointments",
      value: todayAppointments.length,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      label: 'Pending Approvals',
      value: pendingApprovals,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 8v4l2.5 2.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      label: 'Completed Sessions',
      value: completedSessions,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m5 12 4.2 4.2L19 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto">
      <header className="mb-8 rounded-2xl border border-white/10 bg-[#111111]/70 p-6 shadow-xl backdrop-blur-md">
        <h1 className="text-4xl font-serif font-bold tracking-tight text-white">
          Welcome back, <span className="text-[#d4af37]">{user?.name || 'Staff Member'}</span>
        </h1>
        <p className="mt-3 text-base text-gray-400">Here is your schedule for today.</p>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="flex min-h-[150px] flex-col justify-between rounded-2xl border border-white/10 bg-[#111111]/70 p-6 shadow-xl backdrop-blur-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-gray-400">{card.label}</p>
                <p className="mt-2 font-serif text-4xl text-[#d4af37]">{card.value}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]">
                {card.icon}
              </div>
            </div>
            <p className="mt-5 text-xs uppercase tracking-[0.16em] text-gray-500">
              {card.label === 'Completed Sessions' ? `${activeClients} active clients today` : 'Live staff metrics'}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#111111]/70 p-6 shadow-xl backdrop-blur-md">
        <div className="mb-6 flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-serif text-[#d4af37]">Today&apos;s Roster</h2>
            <p className="mt-2 text-sm text-gray-400">Track upcoming clients and move appointments through the day.</p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
            {todayAppointments.length} scheduled
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-white/10 bg-black/20 p-5">
                <div className="h-4 w-24 animate-pulse rounded bg-white/10"></div>
                <div className="mt-3 h-4 w-40 animate-pulse rounded bg-white/10"></div>
              </div>
            ))}
          </div>
        ) : todayAppointments.length === 0 ? (
          <div className="py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="mt-5 text-lg font-semibold text-white">No appointments assigned for today.</p>
            <p className="mt-2 text-sm text-gray-400">Your client roster will appear here as soon as bookings are assigned.</p>
          </div>
        ) : (
          <div className="salon-scrollbar overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-[0.16em] text-[#d4af37]">
                  <th className="px-4 py-4 font-medium">Time</th>
                  <th className="px-4 py-4 font-medium">Client Name</th>
                  <th className="px-4 py-4 font-medium">Service</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {todayAppointments.map((appointment) => {
                  const services = appointment.services?.map((service) => service.name || service).join(', ') || 'Service details unavailable';
                  const isStarted = buildAppointmentDateTime(appointment)?.getTime() <= Date.now();

                  return (
                    <tr key={appointment._id} className="border-b border-white/10 last:border-b-0 hover:bg-white/5">
                      <td className="px-4 py-4 text-sm font-medium text-white">
                        {appointment.startTime} {appointment.endTime ? `- ${appointment.endTime}` : ''}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-white">{appointment.user?.name || 'Client'}</div>
                        <div className="mt-1 text-xs text-gray-400">{appointment.user?.phone || appointment.user?.email || 'No contact details'}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-300">{services}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={appointment.status} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          {appointment.status === 'Pending' && (
                            <>
                              <GoldButton
                                type="button"
                                onClick={() => handleStatusUpdate(appointment._id, 'Approved')}
                                disabled={actionKey === `${appointment._id}-Approved`}
                                className="rounded-lg px-4 py-2 text-sm"
                              >
                                {actionKey === `${appointment._id}-Approved` ? 'Working...' : 'Accept'}
                              </GoldButton>
                              <GoldButton
                                type="button"
                                variant="ghost"
                                onClick={() => handleStatusUpdate(appointment._id, 'Rejected')}
                                disabled={actionKey === `${appointment._id}-Rejected`}
                                className="rounded-lg border border-red-900/50 bg-[#1a1a1a] px-4 py-2 text-sm text-red-400 hover:border-transparent hover:bg-red-900/80 hover:text-white"
                              >
                                {actionKey === `${appointment._id}-Rejected` ? 'Working...' : 'Reject'}
                              </GoldButton>
                            </>
                          )}

                          {appointment.status === 'Approved' && (
                            <>
                              <GoldButton
                                type="button"
                                onClick={() => handleStatusUpdate(appointment._id, 'Completed')}
                                disabled={!isStarted || actionKey === `${appointment._id}-Completed`}
                                className="rounded-lg px-4 py-2 text-sm"
                              >
                                {actionKey === `${appointment._id}-Completed` ? 'Working...' : 'Complete'}
                              </GoldButton>
                              {!isStarted && (
                                <GoldButton
                                  type="button"
                                  variant="ghost"
                                  className="rounded-lg border border-white/10 bg-black/20 px-4 py-2 text-sm text-gray-400 hover:bg-black/20 hover:text-gray-400"
                                  disabled
                                >
                                  Start
                                </GoldButton>
                              )}
                            </>
                          )}

                          {appointment.status === 'Completed' && (
                            <span className="rounded-full border border-green-700/50 bg-green-900/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-green-400">
                              Done
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default StaffDashboard;
