import React from 'react';
import ServiceManager from '../../components/ServiceManager';

function ServicesPage() {
  return (
    <div className="w-full max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-serif font-bold tracking-tight text-white">Manage Salon Services</h1>
        <p className="mt-3 text-base text-gray-400">
          Create, organize, and maintain the services available across your booking experience.
        </p>
      </header>

      <ServiceManager />
    </div>
  );
}

export default ServicesPage;
