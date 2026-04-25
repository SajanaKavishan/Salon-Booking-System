import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { DarkSelect, StatusBadge } from '../../components/SystemUI';

const finalStatuses = ['Completed', 'Rejected', 'Cancelled', 'No-Show'];

function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Pending');
  const [dateFilter, setDateFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const timeTo24Hour = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return { hours: 0, minutes: 0 };

    const parts = timeStr.trim().split(' ');
    if (parts.length < 2) return { hours: 0, minutes: 0 };

    const [time, modifier] = parts;
    const [rawHours, rawMinutes] = time.split(':').map(Number);

    if (Number.isNaN(rawHours) || Number.isNaN(rawMinutes)) return { hours: 0, minutes: 0 };

    let hours = rawHours;
    if (hours === 12) hours = 0;
    if (modifier === 'PM') hours += 12;

    return { hours, minutes: rawMinutes };
  };

  const isPastStartTime = (appointmentDate, appointmentTime) => {
    if (!appointmentDate || !appointmentTime) return false;

    const [year, month, day] = String(appointmentDate).split('-').map(Number);
    if ([year, month, day].some(Number.isNaN)) return false;

    const { hours, minutes } = timeTo24Hour(appointmentTime);
    const scheduledStart = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return Date.now() >= scheduledStart.getTime();
  };

  const getAllowedStatuses = (appointment) => {
    const currentStatus = appointment.status;

    if (finalStatuses.includes(currentStatus)) return [currentStatus];
    if (currentStatus === 'Pending') return ['Pending', 'Approved', 'Rejected'];
    if (currentStatus === 'Approved') {
      const options = ['Approved', 'No-Show'];
      if (isPastStartTime(appointment.date, appointment.startTime)) {
        options.push('Completed');
      }
      return options;
    }

    return [currentStatus];
  };

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/appointments/all', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAppointments(response.data);
      } catch (error) {
        console.error('Error fetching all appointments:', error);
        toast.error('Could not load appointments right now.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const selectedAppointment = appointments.find((appt) => appt._id === id);
      if (!selectedAppointment) return;

      const allowedStatuses = getAllowedStatuses(selectedAppointment);
      if (!allowedStatuses.includes(newStatus)) {
        toast.error('This status transition is not allowed.');
        return;
      }

      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/appointments/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAppointments((current) =>
        current.map((appt) => (appt._id === id ? { ...appt, status: newStatus } : appt))
      );

      toast.success(`Status changed to "${newStatus}" successfully!`);
    } catch (error) {
      console.error('Status Update Error:', error);
      toast.error('Oops! Failed to update the appointment status.');
    }
  };

  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return appointments
      .filter((appt) => {
        const appointmentDate = new Date(appt.date);
        const now = new Date();
        const statusMatches = activeTab === 'All' ? true : appt.status === activeTab;
        let dateMatches = true;

        if (dateFilter === 'Today') {
          dateMatches =
            appointmentDate.getFullYear() === now.getFullYear() &&
            appointmentDate.getMonth() === now.getMonth() &&
            appointmentDate.getDate() === now.getDate();
        } else if (dateFilter === 'This Week') {
          const startOfWeek = new Date(now);
          const dayOfWeek = startOfWeek.getDay();
          startOfWeek.setHours(0, 0, 0, 0);
          startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(endOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          dateMatches = appointmentDate >= startOfWeek && appointmentDate <= endOfWeek;
        } else if (dateFilter === 'This Month') {
          dateMatches =
            appointmentDate.getFullYear() === now.getFullYear() &&
            appointmentDate.getMonth() === now.getMonth();
        }

        const customerName = appt.user?.name || '';
        const customerPhone = appt.user?.phone || appt.user?.phoneNumber || '';
        const services = appt.services?.map((service) => service.name || service).join(', ') || appt.service || '';
        const searchMatches = !query || [customerName, customerPhone, services, appt.status, appt.startTime, appt.endTime]
          .join(' ')
          .toLowerCase()
          .includes(query);

        return statusMatches && dateMatches && searchMatches;
      })
      .sort((a, b) => {
        const statusPriority = {
          Pending: 0,
          Approved: 1,
          Completed: 2,
          Rejected: 3,
          Cancelled: 4,
          'No-Show': 5
        };

        const statusDifference = (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99);
        if (statusDifference !== 0) return statusDifference;

        const dateDifference = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDifference !== 0) return dateDifference;

        return String(a.startTime || a.time || '').localeCompare(String(b.startTime || b.time || ''));
      });
  }, [appointments, activeTab, dateFilter, searchQuery]);

  const tabs = ['Pending', 'Approved', 'Completed', 'Rejected', 'All'];

  return (
    <div className="w-full max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-serif font-bold tracking-tight text-white">Appointments</h1>
        <p className="mt-3 text-base text-gray-400">
          Review bookings, refine the queue, and update customer appointment status.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-[#111111]/70 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-6 border-b border-white/10 pb-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-wrap gap-3">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab
                    ? 'bg-[#d4af37] text-black shadow-[0_0_10px_rgba(212,175,55,0.28)]'
                    : 'border border-gray-700 bg-transparent text-gray-300 hover:border-[#d4af37]/50 hover:text-[#d4af37]'
                }`}
              >
                <span>{tab}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                  activeTab === tab ? 'bg-black/10 text-black' : 'bg-white/10 text-gray-300'
                }`}>
                  {tab === 'All' ? appointments.length : appointments.filter((appt) => appt.status === tab).length}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m21 21-4.35-4.35M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search appointments"
                className="w-full rounded-full border border-white/10 bg-[#0a0a0a]/80 py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-[#d4af37] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/20 sm:w-[260px]"
              />
            </div>

            <DarkSelect
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-11 rounded-full px-4 text-sm font-medium focus:ring-2 focus:ring-[#d4af37]/20"
            >
              <option value="All">All Dates</option>
              <option value="Today">Today</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
            </DarkSelect>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 pt-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-white/10 bg-[#0a0a0a]/50 p-5">
                <div className="h-4 w-24 animate-pulse rounded bg-white/10"></div>
                <div className="mt-4 h-5 w-40 animate-pulse rounded bg-white/10"></div>
                <div className="mt-2 h-4 w-32 animate-pulse rounded bg-white/10"></div>
                <div className="mt-5 h-10 animate-pulse rounded-lg bg-white/10"></div>
              </div>
            ))}
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m21 21-4.35-4.35M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8.5 8.5h5M8.5 11.5h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <p className="mt-5 text-lg font-semibold text-white">No appointments match these filters.</p>
            <p className="mt-2 text-sm text-gray-400">Try a different status, date range, or search term to broaden the results.</p>
          </div>
        ) : (
          <div className="salon-scrollbar max-h-[520px] overflow-y-auto pt-6">
            <div className="overflow-x-auto">
              <table className="salon-table">
                <thead className="sticky top-0 bg-[#0a0a0a]/90">
                  <tr>
                    <th className="salon-table-th font-bold tracking-[0.16em] text-[#d4af37]">Customer</th>
                    <th className="salon-table-th font-bold tracking-[0.16em] text-[#d4af37]">Service</th>
                    <th className="salon-table-th font-bold tracking-[0.16em] text-[#d4af37]">Date & Time</th>
                    <th className="salon-table-th font-bold tracking-[0.16em] text-[#d4af37]">Status</th>
                    <th className="salon-table-th font-bold tracking-[0.16em] text-[#d4af37]">Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAppointments.map((appt) => {
                    const customerPhone = appt.user?.phone || appt.user?.phoneNumber;
                    const isStatusLocked = finalStatuses.includes(appt.status);
                    const allowedStatuses = getAllowedStatuses(appt);
                    const customerName = appt.user ? appt.user.name : 'Unknown User';

                    return (
                      <tr key={appt._id} className={`transition hover:bg-white/5 ${appt.status === 'Pending' ? 'bg-yellow-950/10' : ''}`}>
                        <td className="salon-table-td">
                          <div className="font-semibold text-gray-100">{customerName}</div>
                          {customerPhone ? (
                            <a href={`tel:${customerPhone}`} className="mt-1 block text-xs text-gray-400 hover:text-[#d4af37]">
                              Phone: {customerPhone}
                            </a>
                          ) : (
                            <span className="mt-1 block text-xs text-gray-500">No phone provided</span>
                          )}
                        </td>
                        <td className="salon-table-td text-sm text-gray-300">
                          {appt.services && appt.services.length > 0
                            ? appt.services.map((service) => service.name || service).join(', ')
                            : appt.service || 'N/A'}
                        </td>
                        <td className="salon-table-td">
                          <div className="text-sm font-semibold text-gray-200">{new Date(appt.date).toLocaleDateString()}</div>
                          <div className="mt-1 text-xs text-gray-400">
                            {appt.startTime ? `${appt.startTime}${appt.endTime ? ` - ${appt.endTime}` : ''}` : appt.time}
                          </div>
                        </td>
                        <td className="salon-table-td">
                          <StatusBadge status={appt.status} />
                        </td>
                        <td className="salon-table-td">
                          <DarkSelect
                            value={appt.status}
                            disabled={isStatusLocked}
                            onChange={(e) => handleStatusChange(appt._id, e.target.value)}
                            className={`w-full min-w-[170px] rounded-lg px-3 py-2 text-sm font-medium ${
                              isStatusLocked
                                ? 'cursor-not-allowed border-white/10 bg-gray-800 text-gray-500'
                                : 'border-white/20 bg-[#0a0a0a]/80 text-gray-200 hover:border-[#d4af37]/50 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20'
                            }`}
                          >
                            {allowedStatuses.map((statusOption) => (
                              <option key={statusOption} value={statusOption}>
                                {statusOption}
                              </option>
                            ))}
                          </DarkSelect>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default AppointmentsPage;
