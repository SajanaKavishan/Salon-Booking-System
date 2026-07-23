import React from 'react';
import { ArrowRight, House, LayoutDashboard, Scissors, SearchX, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getStoredSession } from '../../utils/auth';

const dashboardByRole = {
  admin: '/admin',
  staff: '/staff/dashboard',
  customer: '/dashboard'
};

function NotFound() {
  const session = getStoredSession();
  const role = session?.userRole || session?.user?.role;
  const dashboardPath = dashboardByRole[role];

  return (
    <main
      className="relative isolate flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#05070b] px-4 pb-12 pt-28 text-white sm:px-6 sm:pt-32 lg:px-8"
      aria-labelledby="not-found-title"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-20 opacity-30"
        aria-hidden="true"
        style={{
          backgroundImage: 'linear-gradient(rgba(212,175,55,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.06) 1px, transparent 1px)',
          backgroundSize: '46px 46px'
        }}
      />
      <div className="pointer-events-none absolute left-[-8rem] top-20 -z-10 h-72 w-72 rounded-full bg-[#D4AF37]/10 blur-[110px]" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-[-7rem] right-[-5rem] -z-10 h-80 w-80 rounded-full bg-amber-500/10 blur-[130px]" aria-hidden="true" />

      <section className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[#D4AF37]/20 bg-[#090c12]/90 px-5 py-10 text-center shadow-[0_30px_100px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:px-10 sm:py-14 lg:px-16 lg:py-16">
        <div className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" aria-hidden="true" />
        <Sparkles className="pointer-events-none absolute right-7 top-7 h-5 w-5 text-[#D4AF37]/40 sm:right-10 sm:top-10" aria-hidden="true" />

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#D4AF37] shadow-[0_0_35px_rgba(212,175,55,0.12)] sm:h-20 sm:w-20">
          <SearchX className="h-8 w-8 sm:h-10 sm:w-10" aria-hidden="true" />
        </div>

        <p className="mt-7 text-xs font-semibold uppercase tracking-[0.34em] text-[#D4AF37] sm:text-sm">
          This page missed its appointment
        </p>
        <p className="mt-3 bg-gradient-to-b from-[#F8E7A1] via-[#D4AF37] to-[#9A7220] bg-clip-text font-serif text-[5.5rem] font-semibold leading-none text-transparent drop-shadow-[0_10px_35px_rgba(212,175,55,0.15)] sm:text-[8rem] lg:text-[10rem]">
          404
        </p>

        <h1 id="not-found-title" className="mt-1 font-serif text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Page Not Found
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-neutral-400 sm:text-base sm:leading-8">
          The page may have moved, or the address may be incomplete. Let&apos;s guide you back to the SalonDEES experience.
        </p>

        <div className="mx-auto mt-9 flex max-w-2xl flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {dashboardPath ? (
            <Link
              to={dashboardPath}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#C9A227] px-6 py-3 text-sm font-bold text-black shadow-[0_0_28px_rgba(212,175,55,0.22)] transition hover:scale-[1.02] hover:shadow-[0_0_36px_rgba(212,175,55,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090c12]"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Go to Dashboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <Link
              to="/"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#C9A227] px-6 py-3 text-sm font-bold text-black shadow-[0_0_28px_rgba(212,175,55,0.22)] transition hover:scale-[1.02] hover:shadow-[0_0_36px_rgba(212,175,55,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090c12]"
            >
              <House className="h-4 w-4" aria-hidden="true" />
              Return to Home
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}

          {dashboardPath ? (
            <Link
              to="/"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-neutral-200 transition hover:border-[#D4AF37]/45 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090c12]"
            >
              <House className="h-4 w-4" aria-hidden="true" />
              Return to Home
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-neutral-200 transition hover:border-[#D4AF37]/45 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090c12]"
            >
              Sign In
            </Link>
          )}

          <Link
            to={{ pathname: '/', hash: '#services' }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#D4AF37]/20 px-6 py-3 text-sm font-semibold text-[#D4AF37] transition hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090c12]"
          >
            <Scissors className="h-4 w-4" aria-hidden="true" />
            View Services
          </Link>
        </div>

        <div className="mx-auto mt-10 flex w-fit items-center gap-2 border-t border-white/10 px-5 pt-6 text-xs font-medium uppercase tracking-[0.25em] text-gray-300">
          <Scissors className="h-3.5 w-3.5 text-[#D4AF37]/60" aria-hidden="true" />
          SalonDEES Concierge
        </div>
      </section>
    </main>
  );
}

export default NotFound;
