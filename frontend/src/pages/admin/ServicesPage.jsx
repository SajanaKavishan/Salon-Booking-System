import React from 'react';
import ServiceManager from '../../components/admin/ServiceManager';

function ServicesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-6 sm:mb-8">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">Manage Salon Services</h1>
        <p className="mt-3 text-sm leading-6 text-gray-400 sm:text-base">
          Create, organize, and maintain the services available across your booking experience.
        </p>
      </header>

      <ServiceManager />
    </div>
  );
}

export default ServicesPage;
