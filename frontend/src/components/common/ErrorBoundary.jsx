import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled application error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] px-4 py-12 text-white">
        <section
          role="alert"
          aria-labelledby="application-error-title"
          className="w-full max-w-xl rounded-3xl border border-[#D4AF37]/30 bg-[#0b0b0b] p-7 text-center shadow-[0_30px_90px_rgba(0,0,0,0.7),0_0_42px_rgba(212,175,55,0.08)] sm:p-10"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 text-[#D4AF37]">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.8 2.7 17a2 2 0 0 0 1.73 3h15.14a2 2 0 0 0 1.73-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.34em] text-[#D4AF37]">SalonDEES</p>
          <h1 id="application-error-title" className="mt-3 font-serif text-3xl font-semibold text-white sm:text-4xl">
            Something went wrong
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-neutral-400 sm:text-base">
            We could not display this page safely. Reload to restore your salon experience.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#D4AF37] px-7 py-3 text-sm font-bold uppercase tracking-[0.14em] text-black shadow-[0_18px_38px_rgba(212,175,55,0.24)] transition hover:bg-[#f3d77a] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#0b0b0b]"
          >
            Reload Page
          </button>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
