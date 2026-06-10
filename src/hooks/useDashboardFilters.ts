'use client';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

export function useDashboardFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const timeRange = parseInt(searchParams.get('days') || '30', 10);
  const granularity = searchParams.get('granularity') || 'day';
  const modelFilter = searchParams.get('model') || 'all';

  const setFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === '30' && key === 'days') params.delete(key);
    else if (value === 'day' && key === 'granularity') params.delete(key);
    else if (value === 'all' && key === 'model') params.delete(key);
    else params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  return {
    timeRange,
    granularity,
    modelFilter,
    setTimeRange: (d: number) => setFilter('days', String(d)),
    setGranularity: (g: string) => setFilter('granularity', g),
    setModelFilter: (m: string) => setFilter('model', m),
  };
}
