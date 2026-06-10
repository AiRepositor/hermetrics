'use client';
import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  span?: number;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export function ChartCard({ title, icon, children, span, emptyMessage, isEmpty }: ChartCardProps) {
  return (
    <div className="card" style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        {title}
      </h3>
      {isEmpty && emptyMessage ? (
        <div style={{ textAlign: 'center', color: '#52525b', fontSize: 13, padding: 24 }}>{emptyMessage}</div>
      ) : (
        children
      )}
    </div>
  );
}
