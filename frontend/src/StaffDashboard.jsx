import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { DashboardStatCard, GlassCard, GoldButton, SectionPanel, StatusBadge } from './components/SystemUI';

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

const formatDateLabel = (dateStr) => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
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
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionKey, setActionKey] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!storedUser || !token) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    if (parsedUser.role !== 'staff' && parsedUser.role !== 'admin') {
      setIsLoading(false);
      return;
    }

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
        toast.error('Failed to load staff schedule.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedule();
  }, [navigate]);

  const todayKey = useMemo(() => {
    const now = new Date();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }, []);

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((first, second) => {
      const firstDate = buildAppointmentDateTime(first)?.getTime() || 0;
      const secondDate = buildAppointmentDateTime(second)?.getTime() || 0;
      return firstDate - secondDate;
    });
  }, [appointments]);

  const todayAppointments = useMemo(() => {
    return sortedAppointments.filter((appointment) => appointment.date === todayKey);
  }, [sortedAppointments, todayKey]);

  const approvedToday = todayAppointments.filter((appointment) => appointment.status === 'Approved');
  const completedToday = todayAppointments.filter((appointment) => appointment.status === 'Completed');
  const noShowToday = todayAppointments.filter((appointment) => appointment.status === 'No-Show');

  const upcomingQueue = useMemo(() => {
    const now = Date.now();
    return sortedAppointments.filter((appointment) => {
      const appointmentTime = buildAppointmentDateTime(appointment)?.getTime();
      return appointment.status === 'Approved' && appointmentTime && appointmentTime >= now;
    });
  }, [sortedAppointments]);

  const recentWrapUps = useMemo(() => {
    return [...sortedAppointments]
      .filter((appointment) => appointment.status === 'Completed' || appointment.status === 'No-Show')
      .sort((first, second) => {
        const firstDate = buildAppointmentDateTime(first)?.getTime() || 0;
        const secondDate = buildAppointmentDateTime(second)?.getTime() || 0;
        return secondDate - firstDate;
      })
      .slice(0, 5);
  }, [sortedAppointments]);

  const handleStatusUpdate = async (appointmentId, status) => {
    try {
      const token = localStorage.getItem('token');
      setActionKey(`${appointmentId}-${status}`);

      const response = await axios.put(
        `http://localhost:5000/api/appointments/${appointmentId}/staff-status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setAppointments((current) =>
        current.map((appointment) =>
          appointment._id === appointmentId
            ? { ...appointment, status: response.data.appointment.status }
            : appointment
        )
      );

      toast.success(status === 'Completed' ? 'Appointment marked completed.' : 'Appointment marked as no-show.');
    } catch (error) {
      console.error('Error updating staff status:', error);
      toast.error(error.response?.data?.message || 'Could not update appointment status.');
    } finally {
      setActionKey('');
    }
  };

  const renderAppointmentCard = (appointment, allowActions = false) => {
    const serviceNames = appointment.services?.length
      ? appointment.services.map((service) => service.name || service).join(', ')
      : 'Service details unavailable';
    const customerName = appointment.user?.name || 'Walk-in customer';
    const customerInitials = customerName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    const appointmentDate = buildAppointmentDateTime(appointment);
    const appointmentStarted = appointmentDate ? Date.now() >= appointmentDate.getTime() : false;
    const showActions = allowActions && appointment.status === 'Approved';

    return (
      <GlassCard key={appointment._id} className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 font-semibold text-[#d4af37]">
              {customerInitials || 'NA'}
            </div>
            <div>
              <p className="text-base font-semibold text-white">{customerName}</p>
              <p className="mt-1 text-sm text-gray-400">{serviceNames}</p>
            </div>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-[#0a0a0a]/40 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Schedule</p>
            <p className="mt-2 text-sm font-medium text-white">{formatDateLabel(appointment.date)}</p>
            <p className="mt-1 text-sm text-gray-300">{appointment.startTime} - {appointment.endTime}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#0a0a0a]/40 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Contact</p>
            <p className="mt-2 text-sm font-medium text-white">{appointment.user?.phone || 'No phone number'}</p>
            <p className="mt-1 text-sm text-gray-300 break-all">{appointment.user?.email || 'No email address'}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#0a0a0a]/40 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Booking</p>
            <p className="mt-2 text-sm font-medium text-white">{appointment.totalDuration} min</p>
            <p className="mt-1 text-sm font-semibold text-[#d4af37]">Rs. {appointment.totalAmount}</p>
          </div>
        </div>

        {showActions && (
          <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row">
            <GoldButton
              type="button"
              disabled={!appointmentStarted || actionKey === `${appointment._id}-Completed`}
              onClick={() => handleStatusUpdate(appointment._id, 'Completed')}
              className="flex-1 py-3"
            >
              {actionKey === `${appointment._id}-Completed` ? 'Updating...' : 'Mark Completed'}
            </GoldButton>
            <GoldButton
              type="button"
              variant="ghost"
              disabled={!appointmentStarted || actionKey === `${appointment._id}-No-Show`}
              onClick={() => handleStatusUpdate(appointment._id, 'No-Show')}
              className="flex-1 border border-red-900/50 bg-[#1a1a1a] py-3 text-red-400 hover:border-transparent hover:bg-red-900/80 hover:text-white"
            >
              {actionKey === `${appointment._id}-No-Show` ? 'Updating...' : 'Mark No-Show'}
            </GoldButton>
          </div>
        )}

        {showActions && !appointmentStarted && (
          <p className="mt-4 text-xs text-amber-300/80">
            This booking can be updated after its scheduled start time.
          </p>
        )}
      </GlassCard>
    );
  };

  if (!isLoading && user && user.role !== 'staff' && user.role !== 'admin') {
    return (
      <div className="salon-page bg-[url('/loginBg.jpg')]">
        <div className="salon-page-overlay fixed inset-0"></div>

        <main className="relative z-10 min-h-screen py-12">
          <div className="salon-shell max-w-3xl">
            <SectionPanel accent className="p-8 text-center">
              <h2 className="text-3xl font-serif text-white">This area is for staff accounts.</h2>
              <p className="mt-3 text-sm text-gray-400">
                Your current account does not have access to the staff workspace.
              </p>
              <GoldButton type="button" onClick={() => navigate('/dashboard')} className="mt-6 px-5 py-3">
                Go to My Dashboard
              </GoldButton>
            </SectionPanel>
          </div>
        </main>
      </div>
    );
  }

  const statCards = [
    {
      label: "Today's Schedule",
      value: todayAppointments.length,
      trend: `${approvedToday.length} ready now`,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      label: 'Approved Queue',
      value: upcomingQueue.length,
      trend: 'Upcoming visits',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 8v5l3 2M22 12a10 10 0 1 1-3-7.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      label: 'Completed Today',
      value: completedToday.length,
      trend: 'Finished services',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m5 12 4.2 4.2L19 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      label: 'No-Shows Today',
      value: noShowToday.length,
      trend: 'Attendance check',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m15 9-6 6M9 9l6 6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    }
  ];

  return (
    <div className="salon-page bg-[url('/loginBg.jpg')]">
      <div className="salon-page-overlay fixed inset-0"></div>

      <main className="relative z-10 min-h-screen py-10">
        <div className="salon-shell max-w-7xl">
          <SectionPanel accent className="mb-8 p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#d4af37]/80">Staff Workspace</p>
                <h2 className="mt-3 text-3xl font-serif text-white">
                  Welcome, <span className="text-[#d4af37]">{user?.name || 'Team Member'}</span>
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-gray-400">
                  Keep an eye on today&apos;s appointments, stay ahead of your approved queue, and close out visits as clients finish.
                </p>
              </div>
              <GlassCard className="w-full max-w-sm p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Next Approved Appointment</p>
                {upcomingQueue[0] ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-lg font-semibold text-white">{upcomingQueue[0].user?.name || 'Client'}</p>
                    <p className="text-sm text-gray-300">{formatDateLabel(upcomingQueue[0].date)} at {upcomingQueue[0].startTime}</p>
                    <p className="text-sm text-[#d4af37]">
                      {upcomingQueue[0].services?.map((service) => service.name || service).join(', ') || 'Service details unavailable'}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-gray-400">No approved appointments are waiting in your queue.</p>
                )}
              </GlassCard>
            </div>
          </SectionPanel>

          <section className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <DashboardStatCard
                key={card.label}
                label={card.label}
                value={card.value}
                trend={card.trend}
                icon={card.icon}
              />
            ))}
          </section>

          <section className="grid gap-8 xl:grid-cols-[1.4fr_0.9fr]">
            <SectionPanel className="p-8">
              <div className="flex flex-col gap-2 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="salon-heading">Today&apos;s Schedule</h3>
                  <p className="salon-subtext mt-2">Customer details and quick status actions for your live bookings.</p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
                  {todayAppointments.length} appointment{todayAppointments.length === 1 ? '' : 's'}
                </div>
              </div>

              {isLoading ? (
                <div className="grid gap-5 pt-6">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="rounded-xl border border-white/10 bg-[#0a0a0a]/40 p-5">
                      <div className="h-5 w-36 animate-pulse rounded bg-white/10"></div>
                      <div className="mt-4 h-4 w-full animate-pulse rounded bg-white/10"></div>
                      <div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-white/10"></div>
                      <div className="mt-5 h-10 animate-pulse rounded bg-white/10"></div>
                    </div>
                  ))}
                </div>
              ) : todayAppointments.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="mt-5 text-lg font-semibold text-white">No appointments assigned for today.</p>
                  <p className="mt-2 text-sm text-gray-400">Your next approved bookings will appear here as soon as they are scheduled.</p>
                </div>
              ) : (
                <div className="grid gap-5 pt-6">
                  {todayAppointments.map((appointment) => renderAppointmentCard(appointment, true))}
                </div>
              )}
            </SectionPanel>

            <div className="space-y-8">
              <SectionPanel className="p-6">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-xl font-serif text-[#d4af37]">Upcoming Queue</h3>
                    <p className="mt-1 text-sm text-gray-400">Approved visits coming up next.</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-300">
                    {upcomingQueue.length}
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  {upcomingQueue.slice(0, 4).map((appointment) => (
                    <div key={appointment._id} className="rounded-xl border border-white/10 bg-[#0a0a0a]/40 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{appointment.user?.name || 'Client'}</p>
                          <p className="mt-1 text-sm text-gray-400">{formatDateLabel(appointment.date)} at {appointment.startTime}</p>
                        </div>
                        <StatusBadge status={appointment.status} />
                      </div>
                      <p className="mt-3 text-sm text-[#d4af37]">
                        {appointment.services?.map((service) => service.name || service).join(', ') || 'Service details unavailable'}
                      </p>
                    </div>
                  ))}

                  {!isLoading && upcomingQueue.length === 0 && (
                    <p className="rounded-xl border border-white/10 bg-[#0a0a0a]/40 px-4 py-4 text-sm text-gray-400">
                      Nothing approved is lined up right now.
                    </p>
                  )}
                </div>
              </SectionPanel>

              <SectionPanel className="p-6">
                <div className="border-b border-white/10 pb-4">
                  <h3 className="text-xl font-serif text-[#d4af37]">Recent Wrap-Ups</h3>
                  <p className="mt-1 text-sm text-gray-400">Recently completed services and attendance outcomes.</p>
                </div>

                <div className="mt-5 space-y-4">
                  {recentWrapUps.map((appointment) => (
                    <div key={appointment._id} className="rounded-xl border border-white/10 bg-[#0a0a0a]/40 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{appointment.user?.name || 'Client'}</p>
                          <p className="mt-1 text-sm text-gray-400">{formatDateLabel(appointment.date)} at {appointment.startTime}</p>
                        </div>
                        <StatusBadge status={appointment.status} />
                      </div>
                    </div>
                  ))}

                  {!isLoading && recentWrapUps.length === 0 && (
                    <p className="rounded-xl border border-white/10 bg-[#0a0a0a]/40 px-4 py-4 text-sm text-gray-400">
                      Completed and no-show records will collect here as your day progresses.
                    </p>
                  )}
                </div>
              </SectionPanel>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default StaffDashboard;
