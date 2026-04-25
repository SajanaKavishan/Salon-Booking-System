import React from 'react';
import { GlassCard, SectionPanel } from '../../components/SystemUI';

function ClientsPage() {
  return (
    <SectionPanel className="p-8">
      <h3 className="salon-heading">Clients</h3>
      <GlassCard className="mt-6 p-6">
        <p className="text-lg font-semibold text-white">Client list page</p>
        <p className="mt-2 text-sm text-gray-400">This is ready for your next extraction step from the existing admin dashboard.</p>
      </GlassCard>
    </SectionPanel>
  );
}

export default ClientsPage;
