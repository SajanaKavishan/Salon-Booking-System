const mergeClasses = (...classes) => classes.filter(Boolean).join(' ');

const statusConfigMap = {
  scheduled: {
    label: 'Scheduled',
    className: 'salon-status-scheduled'
  },
  pending: {
    label: 'Pending',
    className: 'salon-status-pending'
  },
  confirmed: {
    label: 'Approved',
    className: 'salon-status-approved'
  },
  approved: {
    label: 'Approved',
    className: 'salon-status-approved'
  },
  'in progress': {
    label: 'In Progress',
    className: 'salon-status-progress'
  },
  completed: {
    label: 'Completed',
    className: 'salon-status-completed'
  },
  rejected: {
    label: 'Rejected',
    className: 'salon-status-danger'
  },
  cancelled: {
    label: 'Cancelled',
    className: 'salon-status-danger'
  },
  canceled: {
    label: 'Cancelled',
    className: 'salon-status-danger'
  },
  'no-show': {
    label: 'No-Show',
    className: 'salon-status-danger'
  },
  noshow: {
    label: 'No-Show',
    className: 'salon-status-danger'
  }
};

export function GlassCard({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component className={mergeClasses('salon-glass salon-glass-hover', className)} {...props}>
      {children}
    </Component>
  );
}

export function SectionPanel({ as: Component = 'section', className = '', accent = false, children, ...props }) {
  return (
    <Component className={mergeClasses(accent ? 'salon-section-accent' : 'salon-section', className)} {...props}>
      {children}
    </Component>
  );
}

export function GoldButton({ className = '', variant = 'solid', type = 'button', children, ...props }) {
  const variantClass = {
    solid: 'salon-button',
    outline: 'salon-button-outline',
    ghost: 'salon-button-ghost'
  }[variant] || 'salon-button';

  return (
    <button
      type={type}
      className={mergeClasses(
        variantClass,
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b36a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080a]',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function BrandMark({ className = '', onClick, subtitle }) {
  return (
    <div className={mergeClasses('text-center', className)}>
      <button
        type="button"
        onClick={onClick}
        className="text-4xl font-bold tracking-widest text-white transition hover:text-[#d6b36a]"
      >
        Salon<span className="text-[#d6b36a]">DEES</span>
      </button>
      {subtitle && <p className="mt-3 text-sm tracking-[0.18em] text-gray-400 uppercase">{subtitle}</p>}
    </div>
  );
}

export function AuthShell({ backgroundImage = '', backgroundStyle, children }) {
  const resolvedStyle = {
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    ...backgroundStyle
  };

  return (
    <div
      className={`salon-page relative flex min-h-[calc(100vh-4rem)] w-full flex-col items-center justify-center bg-cover bg-center bg-no-repeat bg-scroll p-4 md:bg-fixed lg:flex-row lg:p-8 ${backgroundImage}`}
      style={resolvedStyle}
    >
      <div className="salon-page-overlay fixed inset-0"></div>
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}

export function DarkInput({ className = '', ...props }) {
  return <input className={mergeClasses('salon-field', className)} {...props} />;
}

export function DarkSelect({ className = '', children, ...props }) {
  return (
    <select className={mergeClasses('salon-select', className)} {...props}>
      {children}
    </select>
  );
}

export function StatusBadge({ status, className = '' }) {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const statusConfig = statusConfigMap[normalizedStatus] || {
    label: status || 'Unknown',
    className: 'salon-status-danger'
  };

  return (
    <span className={mergeClasses('salon-status', statusConfig.className, className)}>
      {statusConfig.label}
    </span>
  );
}

export function DashboardStatCard({ label, value, icon, iconClassName = '', trend, className = '' }) {
  return (
    <GlassCard className={mergeClasses('flex min-h-[150px] flex-col justify-between p-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="salon-subtext">{label}</p>
          <p className="mt-2 text-3xl text-[#d6b36a] font-heading">{value}</p>
        </div>
        {icon && (
          <div className={mergeClasses('flex h-11 w-11 items-center justify-center rounded-full border border-[#d6b36a]/20 bg-[#d6b36a]/10 text-[#d6b36a]', iconClassName)}>
            {icon}
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-5 inline-flex w-fit items-center rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
          {trend}
        </div>
      )}
    </GlassCard>
  );
}
