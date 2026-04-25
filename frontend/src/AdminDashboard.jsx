import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  DashboardStatCard,
  GlassCard,
  SectionPanel,
  StatusBadge
} from './components/SystemUI';

function AdminDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllAppointments = async () => {
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

    fetchAllAppointments();
  }, []);

  const today = new Date();
  const todayCount = appointments.filter((appt) => {
    const appointmentDate = new Date(appt.date);
    return (
      appointmentDate.getFullYear() === today.getFullYear() &&
      appointmentDate.getMonth() === today.getMonth() &&
      appointmentDate.getDate() === today.getDate()
    );
  }).length;

  const pendingCount = appointments.filter((appt) => appt.status === 'Pending').length;
  const activeClients = new Set(
    appointments
      .map((appt) => appt.user?._id || appt.user?.email || appt.user?.phone || appt.user?.phoneNumber || appt.user?.name)
      .filter(Boolean)
  ).size;

  const recentAppointments = useMemo(() => {
    return [...appointments]
      .sort((a, b) => {
        const dateDifference = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDifference !== 0) return dateDifference;
        return String(b.startTime || '').localeCompare(String(a.startTime || ''));
      })
      .slice(0, 6);
  }, [appointments]);

  const statCards = [
    {
      label: "Today's Revenue",
      value: 'Rs. 15,400',
      trend: '+12.5%',
      color: 'bg-[#d4af37]/15 border-[#d4af37]/30',
      icon: (
        <svg className="h-7 w-7 text-[#d4af37]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3v18M17 7.5c-.8-1.2-2.4-2-4.3-2-2.4 0-4.2 1.2-4.2 3s1.5 2.5 4.1 3.1c2.8.6 4.4 1.4 4.4 3.4s-1.9 3.5-4.7 3.5c-2.1 0-4-.8-5.3-2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      label: "Today's Appointments",
      value: todayCount,
      trend: `${pendingCount} pending`,
      color: 'bg-[#d4af37]/15 border-[#d4af37]/30',
      icon: (
        <svg className="h-7 w-7 text-[#d4af37]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      label: 'Active Clients',
      value: activeClients || appointments.length,
      trend: 'Returning traffic',
      color: 'bg-[#d4af37]/15 border-[#d4af37]/30',
      icon: (
        <svg className="h-7 w-7 text-[#d4af37]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM21 19c0-1.8-1.2-3.3-2.8-3.8M18 6a3 3 0 0 1 0 5.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      label: 'Active Staff',
      value: '4',
      trend: 'On shift',
      color: 'bg-[#d4af37]/15 border-[#d4af37]/30',
      icon: (
        <svg className="h-7 w-7 text-[#d4af37]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v4M21 10h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    }
  ];

  const revenuePoints = '0,154 60,130 120,138 180,94 240,58 300,22 360,118';
  const serviceBars = [
    { label: 'Haircut', height: 82 },
    { label: 'Color', height: 52 },
    { label: 'Styling', height: 34 },
    { label: 'Spa', height: 26 },
    { label: 'Manicure', height: 42 }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto">
      <header className="mb-10">
        <h1 className="text-4xl font-serif font-bold tracking-tight text-white">
          Admin <span className="text-[#d4af37]">Dashboard</span>
        </h1>
        <p className="mt-3 text-lg tracking-wide text-gray-400">
          Welcome back! Here&apos;s what&apos;s happening today.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <DashboardStatCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            iconClassName={`h-[58px] w-[58px] rounded-lg ${card.color}`}
            trend={
              <span className="inline-flex items-center gap-1">
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 10l4-4 3 3 3-5M10 4h3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {card.trend}
              </span>
            }
            className="p-8"
          />
        ))}
      </section>

      <section className="mt-10 grid grid-cols-1 gap-8 xl:grid-cols-2">
        <SectionPanel className="p-8">
          <h2 className="salon-heading">Weekly Revenue</h2>
          <div className="mt-8 h-[270px]">
            <svg className="h-full w-full overflow-visible" viewBox="0 0 420 230" fill="none" role="img" aria-label="Weekly revenue chart">
              {[0, 1, 2, 3, 4].map((line) => (
                <line key={line} x1="48" x2="400" y1={22 + line * 45} y2={22 + line * 45} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
              ))}
              {[0, 1, 2, 3, 4, 5, 6].map((line) => (
                <line key={line} x1={48 + line * 58} x2={48 + line * 58} y1="20" y2="202" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              ))}
              <line x1="48" y1="20" x2="48" y2="202" stroke="rgba(255,255,255,0.35)" />
              <line x1="48" y1="202" x2="400" y2="202" stroke="rgba(255,255,255,0.35)" />
              <path d={`M ${revenuePoints} L 360,202 L 0,202 Z`} fill="url(#revenueFill)" transform="translate(48 0)" opacity="0.85" />
              <path d={`M ${revenuePoints}`} stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="translate(48 0)" />
              <defs>
                <linearGradient id="revenueFill" x1="180" y1="20" x2="180" y2="202" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#d4af37" stopOpacity="0.28" />
                  <stop offset="1" stopColor="#d4af37" stopOpacity="0.04" />
                </linearGradient>
              </defs>
              {['10000', '7500', '5000', '2500', '0'].map((label, index) => (
                <text key={label} x="38" y={28 + index * 45} textAnchor="end" className="fill-gray-400 text-[14px]">{label}</text>
              ))}
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, index) => (
                <text key={label} x={48 + index * 58} y="225" textAnchor="middle" className="fill-gray-400 text-[14px]">{label}</text>
              ))}
            </svg>
          </div>
        </SectionPanel>

        <SectionPanel className="p-8">
          <h2 className="salon-heading">Popular Services</h2>
          <div className="mt-8 h-[270px]">
            <svg className="h-full w-full overflow-visible" viewBox="0 0 420 230" fill="none" role="img" aria-label="Popular services chart">
              {[0, 1, 2, 3, 4].map((line) => (
                <line key={line} x1="48" x2="400" y1={22 + line * 45} y2={22 + line * 45} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
              ))}
              {[0, 1, 2, 3, 4, 5].map((line) => (
                <line key={line} x1={48 + line * 68} x2={48 + line * 68} y1="20" y2="202" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              ))}
              <line x1="48" y1="20" x2="48" y2="202" stroke="rgba(255,255,255,0.35)" />
              <line x1="48" y1="202" x2="400" y2="202" stroke="rgba(255,255,255,0.35)" />
              {serviceBars.map((bar, index) => {
                const x = 56 + index * 70;
                const height = bar.height * 1.9;
                const y = 202 - height;

                return (
                  <g key={bar.label}>
                    <rect x={x} y={y} width="56" height={height} rx="7" fill="#d4af37" opacity="0.88" />
                    <text x={x + 28} y="225" textAnchor="middle" className="fill-gray-400 text-[14px]">{bar.label}</text>
                  </g>
                );
              })}
              {['60', '45', '30', '15', '0'].map((label, index) => (
                <text key={label} x="38" y={28 + index * 45} textAnchor="end" className="fill-gray-400 text-[14px]">{label}</text>
              ))}
            </svg>
          </div>
        </SectionPanel>
      </section>

      <section className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionPanel className="p-8">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="salon-heading">Latest Appointments</h2>
              <p className="salon-subtext mt-2">A quick pulse check on recent bookings.</p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
              {appointments.length} total
            </div>
          </div>

          {isLoading ? (
            <div className="mt-6 grid gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-white/10 bg-[#0a0a0a]/40 p-4">
                  <div className="h-4 w-32 animate-pulse rounded bg-white/10"></div>
                  <div className="mt-3 h-4 w-48 animate-pulse rounded bg-white/10"></div>
                </div>
              ))}
            </div>
          ) : recentAppointments.length === 0 ? (
            <div className="mt-6 rounded-xl border border-white/10 bg-[#0a0a0a]/40 p-6 text-center text-sm text-gray-400">
              No appointment activity available yet.
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {recentAppointments.map((appointment) => (
                <GlassCard key={appointment._id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-white">{appointment.user?.name || 'Unknown User'}</p>
                      <p className="mt-1 text-sm text-gray-400">
                        {appointment.services?.map((service) => service.name || service).join(', ') || appointment.service || 'N/A'}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-gray-500">
                        {new Date(appointment.date).toLocaleDateString()} {appointment.startTime ? `• ${appointment.startTime}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={appointment.status} />
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </SectionPanel>

        <SectionPanel className="p-8">
          <h2 className="salon-heading">Operational Snapshot</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <GlassCard className="p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-400">Pending Approvals</p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <p className="text-4xl font-serif font-semibold text-[#d4af37]">{pendingCount}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pendingCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {pendingCount > 0 ? 'Needs review' : 'All clear'}
                </span>
              </div>
            </GlassCard>
            <GlassCard className="p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-400">Total Appointments</p>
              <p className="mt-4 text-4xl font-serif font-semibold text-[#d4af37]">{appointments.length}</p>
              <p className="mt-3 text-sm text-gray-400">Across all recent booking activity.</p>
            </GlassCard>
          </div>
        </SectionPanel>
      </section>
    </div>
  );
}

export default AdminDashboard;
