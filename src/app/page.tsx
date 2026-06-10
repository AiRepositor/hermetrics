import { Suspense } from 'react';
import { DashboardShell } from '@/components/DashboardShell';

export default function Page() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0f' }}><p style={{ color: '#71717a' }}>Loading...</p></div>}>
      <DashboardShell />
    </Suspense>
  );
}
