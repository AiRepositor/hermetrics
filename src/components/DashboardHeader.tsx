'use client';
import { RefreshCw, Download } from 'lucide-react';

interface DashboardHeaderProps {
  firstSession: number;
  lastSession: number;
  onRefresh: () => void;
  onExportCSV?: () => void;
}

export function DashboardHeader({ firstSession, lastSession, onRefresh, onExportCSV }: DashboardHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Hermes Token Analytics</h1>
        <p style={{ color: '#71717a', fontSize: 14, margin: '4px 0 0' }}>
          {new Date(firstSession * 1000).toLocaleDateString()} — {new Date(lastSession * 1000).toLocaleDateString()}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {onExportCSV && (
          <button onClick={onExportCSV} style={{
            background: 'transparent', border: '1px solid #2a2a35', borderRadius: 8,
            padding: '8px 14px', color: '#71717a', cursor: 'pointer', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Download size={14} /> Export CSV
          </button>
        )}
        <button onClick={onRefresh} style={{
          background: 'transparent', border: '1px solid #2a2a35', borderRadius: 8,
          padding: '8px 14px', color: '#71717a', cursor: 'pointer', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
    </div>
  );
}
