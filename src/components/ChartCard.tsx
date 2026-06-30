'use client';
import { useState, useEffect, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ChartCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  span?: number;
  emptyMessage?: string;
  isEmpty?: boolean;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function ChartCard({ title, icon, children, span, emptyMessage, isEmpty }: ChartCardProps) {
  const storageKey = `hermetrics-collapsed-${slugify(title)}`;
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        setCollapsed(stored === 'true');
      }
    } catch {
      // localStorage unavailable
    }
    setMounted(true);
  }, [storageKey]);

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  };

  // Don't render toggle until mounted to avoid hydration mismatch
  const chevron = mounted ? (
    <button
      onClick={(e) => { e.stopPropagation(); toggle(); }}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: 2,
        color: '#71717a',
        display: 'flex',
        alignItems: 'center',
      }}
      title={collapsed ? 'Expand section' : 'Collapse section'}
    >
      {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
    </button>
  ) : null;

  return (
    <div className="card" style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon}
          {title}
        </span>
        {chevron}
      </h3>
      {!collapsed && (
        isEmpty && emptyMessage ? (
          <div style={{ textAlign: 'center', color: '#52525b', fontSize: 13, padding: 24 }}>{emptyMessage}</div>
        ) : (
          children
        )
      )}
    </div>
  );
}
