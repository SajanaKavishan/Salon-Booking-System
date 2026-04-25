import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { DashboardStatCard, GlassCard, GoldButton, SectionPanel, StatusBadge } from './components/SystemUI';

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [isLoading, setIsLoading] = useState(true);

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
        } finally {
          setIsLoading(false);
        }
      };
      fetchAppointments();
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/appointments/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAppointments(appointments.filter((appt) => appt._id !== id));
        toast.success('Appointment cancelled successfully!');
      } catch (error) {
        console.error('Delete Error:', error);
        toast.error('Oops! Failed to cancel the appointment.');
      }
    }
  };

  const handleHideFromHistory = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/appointments/${id}/hide`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setAppointments((prev) => prev.filter((appt) => appt._id !== id));
      toast.success('Booking removed from history.');
    } catch (error) {
      console.error('Hide History Error:', error);
      toast.error('Failed to remove booking from history.');
    }
  };

  const timeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(' ');
    if (parts.length < 2) return 0;
    const [time, modifier] = parts;
    const timeParts = time.split(':');
    if (timeParts.length < 2) return 0;
    let [hours, minutes] = timeParts.map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
    if (hours === 12) hours = 0;
    if (modifier === 'PM') hours += 12;
    return hours * 60 + minutes;
  };

  const isCancellable = (apptDate, apptStartTime, appointment) => {
    try {
      const timeStr = apptStartTime || (appointment && appointment.time);

      if (!apptDate || !timeStr) return false;

      const dateParts = apptDate.split('-');
      if (dateParts.length < 3) return false;

      const [year, month, day] = dateParts.map(Number);
      if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return false;

      const timeMins = timeToMinutes(timeStr);
      const hours = Math.floor(timeMins / 60);
      const minutes = timeMins % 60;

      const appointmentDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
      const currentDateTime = new Date();
      const differenceInMs = appointmentDateTime.getTime() - currentDateTime.getTime();
      const differenceInHours = differenceInMs / (1000 * 60 * 60);

      return differenceInHours >= 2;
    } catch (error) {
      console.error('Error checking if appointment is cancellable:', error);
      return false;
    }
  };

  const filteredAppointments = useMemo(() => appointments.filter((appt) => {
    if (activeTab === 'Upcoming') {
      return appt.status === 'Pending' || appt.status === 'Approved';
    }
    return (appt.status === 'Completed' || appt.status === 'Rejected' || appt.status === 'Cancelled' || appt.status === 'No-Show') && !appt.isHiddenByCustomer;
  }), [appointments, activeTab]);

  const upcomingAppointments = appointments.filter((appt) => appt.status === 'Pending' || appt.status === 'Approved');
  const historyAppointments = appointments.filter((appt) => (appt.status === 'Completed' || appt.status === 'Rejected' || appt.status === 'Cancelled' || appt.status === 'No-Show') && !appt.isHiddenByCustomer);
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

          <SectionPanel className="p-8">
            <div className="flex flex-col gap-5 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="salon-heading">My Appointments</h3>
                <p className="salon-subtext mt-2">Switch between what’s coming up and what’s already completed.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Upcoming', 'History'].map((tab) => (
                  <GoldButton
                    key={tab}
                    type="button"
                    variant={activeTab === tab ? 'solid' : 'ghost'}
                    onClick={() => setActiveTab(tab)}
                    className={activeTab === tab
                      ? 'rounded-lg px-4 py-2 text-sm'
                      : 'rounded-lg border border-white/10 px-4 py-2 text-sm hover:border-[#d4af37]/50'}
                  >
                    <span>{tab}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                      activeTab === tab ? 'bg-black/10 text-black' : 'bg-white/10 text-gray-300'
                    }`}>
                      {tab === 'Upcoming' ? upcomingAppointments.length : historyAppointments.length}
                    </span>
                  </GoldButton>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="grid gap-6 pt-6 md:grid-cols-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="rounded-xl border border-white/10 bg-[#0a0a0a]/50 p-6">
                    <div className="h-5 w-40 animate-pulse rounded bg-white/10"></div>
                    <div className="mt-4 h-4 w-28 animate-pulse rounded bg-white/10"></div>
                    <div className="mt-3 h-4 w-32 animate-pulse rounded bg-white/10"></div>
                    <div className="mt-6 h-10 animate-pulse rounded-lg bg-white/10"></div>
                  </div>
                ))}
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="mt-5 text-lg font-semibold text-white">
                  {activeTab === 'Upcoming' ? 'You have no upcoming appointments.' : 'Your appointment history is empty.'}
                </p>
                <p className="mt-2 text-sm text-gray-400">
                  {activeTab === 'Upcoming'
                    ? 'Book your next salon visit whenever you are ready.'
                    : 'Finished bookings will appear here after your visit.'}
                </p>
                <GoldButton type="button" onClick={() => navigate('/book')} className="mt-5 px-5 py-2.5">
                  Book Appointment
                </GoldButton>
              </div>
            ) : (
              <div className="grid gap-6 pt-6 md:grid-cols-2">
                {filteredAppointments.map((appt) => {
                  const canCancel = isCancellable(appt.date, appt.startTime, appt);
                  const serviceNames = appt.services && appt.services.length > 0
                    ? appt.services.map((service) => service.name || service).join(', ')
                    : 'N/A';

                  return (
                    <GlassCard key={appt._id} className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Booking</p>
                          <h4 className="mt-2 text-lg font-semibold text-white">{serviceNames}</h4>
                        </div>
                        <StatusBadge status={appt.status} />
                      </div>

                      <div className="mt-5 space-y-3 text-sm">
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0a0a0a]/40 px-4 py-3">
                          <span className="text-gray-400">Date</span>
                          <span className="font-medium text-white">{new Date(appt.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0a0a0a]/40 px-4 py-3">
                          <span className="text-gray-400">Time</span>
                          <span className="font-medium text-white">{appt.startTime} {appt.endTime ? `- ${appt.endTime}` : ''}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0a0a0a]/40 px-4 py-3">
                          <span className="text-gray-400">Amount</span>
                          <span className="font-semibold text-[#d4af37]">Rs. {appt.totalAmount}</span>
                        </div>
                      </div>

                      <div className="mt-6 border-t border-white/10 pt-5">
                        {activeTab === 'Upcoming' ? (
                          canCancel ? (
                            <GoldButton
                              type="button"
                              variant="ghost"
                              onClick={() => handleCancel(appt._id)}
                              className="w-full border border-red-900/50 bg-[#1a1a1a] py-3 text-red-400 hover:border-transparent hover:bg-red-900/80 hover:text-white"
                            >
                              Cancel Booking
                            </GoldButton>
                          ) : (
                            <div className="rounded-lg border border-white/10 bg-[#0a0a0a]/40 px-4 py-3 text-center">
                              <p className="text-sm font-semibold text-gray-500">Cannot cancel this appointment</p>
                              <p className="mt-1 text-xs text-red-400/80">Cancellations are only allowed at least 2 hours before the booking.</p>
                            </div>
                          )
                        ) : (
                          <GoldButton
                            type="button"
                            variant="ghost"
                            onClick={() => handleHideFromHistory(appt._id)}
                            className="w-full border border-red-900/50 bg-[#1a1a1a] py-3 text-red-400 hover:border-transparent hover:bg-red-900/80 hover:text-white"
                          >
                            Remove from History
                          </GoldButton>
                        )}
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </SectionPanel>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
