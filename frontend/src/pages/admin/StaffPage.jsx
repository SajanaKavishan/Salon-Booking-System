import React from 'react';
import StaffManager from '../../components/StaffManager';

function StaffPage() {
  return (
    <div className="w-full max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-serif font-bold tracking-tight text-white">Manage Salon Staff</h1>
        <p className="mt-3 text-base text-gray-400">
          Keep staff profiles, specialties, schedules, and roster details clean and up to date.
        </p>
      </header>

      <StaffManager />
    </div>
  );
}

export default StaffPage;
