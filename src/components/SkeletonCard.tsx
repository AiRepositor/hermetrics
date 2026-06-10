'use client';
export function SkeletonCard({ height = 120 }: { height?: number }) {
  return (
    <div className="card" style={{ height, animation: 'pulse 1.5s ease-in-out infinite' }}>
      <div style={{ width: '40%', height: 14, borderRadius: 4, background: '#2a2a35', marginBottom: 12 }} />
      <div style={{ width: '60%', height: 28, borderRadius: 6, background: '#1e1e28' }} />
    </div>
  );
}
