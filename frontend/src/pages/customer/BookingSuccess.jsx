import React from 'react';
import { CalendarDays, CheckCircle2, Clock, Scissors, UserRound } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const formatServices = (services) => {
  if (!Array.isArray(services) || services.length === 0) return 'Selected salon service';
  return services.map((service) => service?.name || service).join(', ');
};

const formatDate = (date) => {
  if (!date) return 'Date pending';

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return 'Date pending';

  return parsedDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};

const getStylistName = (appointment) => {
  const stylist = appointment?.stylistName || appointment?.stylist || appointment?.staffId;

  if (typeof stylist === 'string') {
    return /^[0-9a-fA-F]{24}$/.test(stylist) ? 'Any Available Artist' : stylist;
  }

  return stylist?.name || 'Any Available Artist';
};

function BookingSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const appointment = location.state?.appointment || null;

  return (
    <div className="mx-auto min-h-screen w-full max-w-4xl bg-[#070707] px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-white/10 bg-[#0d1117] p-6 shadow-2xl shadow-black/40 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 shadow-[0_18px_38px_rgba(16,185,129,0.12)]">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.32em] text-amber-400">
              Booking Confirmed
            </p>
            <h1 className="mt-3 font-serif text-3xl text-white sm:text-4xl">
              Your appointment is on the calendar.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              We have reserved your salon session. You can review the details below or head back to your dashboard.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="rounded-lg border border-amber-500/30 px-4 py-2 text-sm font-semibold text-amber-400 transition hover:bg-amber-500/10"
          >
            View Dashboard
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-zinc-500">
              <Scissors className="h-4 w-4" />
              Services
            </div>
            <p className="mt-3 text-sm font-semibold text-white">{formatServices(appointment?.services)}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-zinc-500">
              <UserRound className="h-4 w-4" />
              Stylist
            </div>
            <p className="mt-3 text-sm font-semibold text-white">{getStylistName(appointment)}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-zinc-500">
              <CalendarDays className="h-4 w-4" />
              Date
            </div>
            <p className="mt-3 text-sm font-semibold text-white">
              {formatDate(appointment?.date || appointment?.bookingDate)}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-zinc-500">
              <Clock className="h-4 w-4" />
              Time
            </div>
            <p className="mt-3 text-sm font-semibold text-white">
              {appointment?.startTime || 'Time pending'}
              {appointment?.endTime ? ` - ${appointment.endTime}` : ''}
            </p>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-amber-500/20 rounded-xl p-4 mt-6 text-zinc-400 text-xs leading-relaxed">
          <p className="text-amber-400 font-semibold mb-1">✨ Salon DEES Grace Period Policy</p>
          <p>
            To respect the time of both our stylists and other clients, we offer a maximum 15-minute grace period. If you expect to arrive later than 15 minutes, please use the 'I'm Running Late' button inside your client dashboard to update your stylist immediately.
          </p>
        </div>
      </section>
    </div>
  );
}

export default BookingSuccess;
