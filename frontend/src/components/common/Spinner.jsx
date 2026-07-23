import React from 'react';

function Spinner({ label = 'Loading...' }) {
  return (
    <span className="flex items-center justify-center" role="status" aria-live="polite">
      <span className="h-6 w-6 animate-spin rounded-full border-b-2 border-white" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export default Spinner;

