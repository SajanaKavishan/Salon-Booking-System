function MoneyBundleIcon({ className = 'h-6 w-6', strokeWidth = 1.8 }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m4 11 8 4.5 8-4.5M4 13.5 12 18l8-4.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.4 8.5h5.2M12 6.9v3.2"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M7 8.5c.7-.4 1-.9 1.1-1.6M15.9 6.9c.1.7.5 1.2 1.1 1.6M7 8.5c.7.4 1 1 1.1 1.6M15.9 10.1c.1-.7.5-1.2 1.1-1.6"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default MoneyBundleIcon;
