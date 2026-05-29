import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { DashboardStatCard, GlassCard, GoldButton, SectionPanel, StatusBadge } from './components/SystemUI';

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (storedUser && token) {
      const fetchAppointments = async () => {
        try {
          setUser(JSON.parse(storedUser));
          const response = await axios.get('http://localhost:5000/api/appointments', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          setAppointments(response.data);
        } catch (error) {
          console.error('Error fetching appointments:', error);
          toast.error('Failed to load your appointments.');
        }
      };

      fetchAppointments();
    }
  }, []);

  const upcomingAppointments = appointments.filter((appt) => appt.status === 'Pending' || appt.status === 'Approved');
  const historyAppointments = appointments.filter((appt) => (
    appt.status === 'Completed' ||
    appt.status === 'Rejected' ||
    appt.status === 'Cancelled' ||
    appt.status === 'No-Show'
  ) && !appt.isHiddenByCustomer);
  const approvedCount = appointments.filter((appt) => appt.status === 'Approved').length;
  const totalSpend = appointments.reduce((sum, appt) => sum + Number(appt.totalAmount || 0), 0);
  const nextAppointment = upcomingAppointments
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const statCards = [
    {
      label: 'Upcoming Appointments',
      value: upcomingAppointments.length,
      trend: `${approvedCount} approved`,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      label: 'Booking History',
      value: historyAppointments.length,
      trend: 'Recent visits',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 8v5l3 2M22 12a10 10 0 1 1-3-7.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      label: 'Total Spend',
      value: `Rs. ${totalSpend}`,
      trend: 'All bookings',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3v18M17 7.5c-.8-1.2-2.4-2-4.3-2-2.4 0-4.2 1.2-4.2 3s1.5 2.5 4.1 3.1c2.8.6 4.4 1.4 4.4 3.4s-1.9 3.5-4.7 3.5c-2.1 0-4-.8-5.3-2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    }
  ];

  return (
    <div className="salon-page bg-[url('/loginBg.jpg')]">
      <div className="salon-page-overlay fixed inset-0"></div>

      <main className="relative z-10 min-h-screen py-10">
        <div className="salon-shell max-w-6xl">
          <SectionPanel accent className="mb-8 p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-3xl font-serif text-white">
                  Welcome back, <span className="text-[#d4af37]">{user ? user.name || user.email : 'Guest'}</span>
                </h2>
                <p className="mt-3 text-sm font-light text-gray-400">Manage upcoming visits, review your past bookings, and schedule your next appointment.</p>
              </div>
              <GoldButton type="button" onClick={() => navigate('/book')} className="w-fit px-6 py-3">
                + Book New
              </GoldButton>
            </div>
          </SectionPanel>

          <section className="mb-8 grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {statCards.map((card) => (
                <DashboardStatCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  trend={card.trend}
                  icon={card.icon}
                  className="p-6"
                />
              ))}
            </div>

            <GlassCard className="p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Next Appointment</p>
              {nextAppointment ? (
                <div className="mt-4 space-y-3">
                  <p className="text-xl font-serif text-[#d4af37]">
                    {new Date(nextAppointment.date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-300">
                    {nextAppointment.startTime} {nextAppointment.endTime ? `- ${nextAppointment.endTime}` : ''}
                  </p>
                  <p className="text-sm font-medium text-white">
                    {nextAppointment.services?.map((service) => service.name || service).join(', ') || 'Service not available'}
                  </p>
                  <StatusBadge status={nextAppointment.status} />
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-sm text-gray-400">No upcoming booking yet.</p>
                  <GoldButton type="button" onClick={() => navigate('/book')} className="mt-4 px-4 py-2">
                    Book Your Next Visit
                  </GoldButton>
                </div>
              )}
            </GlassCard>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
