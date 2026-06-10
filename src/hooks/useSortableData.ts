'use client';
import { useState, useMemo } from 'react';

export function useSortableData<T extends Record<string, any>>(
  data: T[],
  defaultKey: string,
  defaultDir: 'asc' | 'desc' = 'desc'
) {
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: defaultKey,
    direction: defaultDir,
  });

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sort.key] ?? 0;
      const bVal = b[sort.key] ?? 0;
      if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sort]);

  const toggleSort = (key: string) =>
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));

  return { sorted, sort, toggleSort };
}
