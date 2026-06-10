'use client';
import { Calendar } from 'lucide-react';
import { ChartCard } from './ChartCard';
import { DAY_NAMES } from '@/lib/constants';
import { fmtTokens as fmt } from '@/lib/formatters';

interface ActivityHeatmapProps {
  heatmap: Record<string, { total_tokens: number; sessions: number }>;
}

export function ActivityHeatmap({ heatmap }: ActivityHeatmapProps) {
  // Find max token count for color scaling
  let maxTokens = 1;
  for (const key of Object.keys(heatmap)) {
    const val = heatmap[key];
    if (val && val.total_tokens > maxTokens) {
      maxTokens = val.total_tokens;
    }
  }

  // Interpolate from dark empty to bright purple
  const getColor = (tokens: number): string => {
    const ratio = maxTokens > 0 ? tokens / maxTokens : 0;
    // Dark: #2a2a35 at 40% opacity, Bright: rgb(168, 130, 255)
    const r = Math.round(42 * (1 - ratio) + 168 * ratio);
    const g = Math.round(42 * (1 - ratio) + 130 * ratio);
    const b = Math.round(53 * (1 - ratio) + 255 * ratio);
    const alpha = 0.4 + ratio * 0.6;
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <ChartCard
      title="Activity Heatmap"
      icon={<Calendar size={16} style={{ color: '#e5c07b' }} />}
      span={2}
    >
      <div>
        {/* Hour column headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `40px repeat(24, 1fr)`,
            gap: 2,
            marginBottom: 4,
          }}
        >
          <div /> {/* spacer */}
          {hours.map((h) => (
            <div
              key={h}
              style={{
                fontSize: 10,
                color: '#52525b',
                textAlign: 'center',
              }}
            >
              {h === 0 ? '0h' : h % 6 === 0 ? `${h}` : ''}
            </div>
          ))}
        </div>

        {/* Day rows */}
        {DAY_NAMES.map((dayName, dow) => (
          <div
            key={dow}
            style={{
              display: 'grid',
              gridTemplateColumns: `40px repeat(24, 1fr)`,
              gap: 2,
              marginBottom: 2,
            }}
          >
            {/* Day label */}
            <div
              style={{
                fontSize: 11,
                color: '#71717a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: 6,
              }}
            >
              {dayName}
            </div>

            {/* Hour cells */}
            {hours.map((hour) => {
              const key = `${dow}_${hour}`;
              const cell = heatmap[key];
              const tokens = cell?.total_tokens ?? 0;
              const sessions = cell?.sessions ?? 0;

              const tooltip =
                tokens > 0
                  ? `${dayName} ${hour.toString().padStart(2, '0')}:00 \u2014 ${fmt(tokens)} tokens \u00b7 ${sessions} session${sessions !== 1 ? 's' : ''}`
                  : `${dayName} ${hour.toString().padStart(2, '0')}:00 \u2014 No activity`;

              return (
                <div
                  key={hour}
                  title={tooltip}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 3,
                    backgroundColor: getColor(tokens),
                    cursor: 'default',
                  }}
                />
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 12,
            justifyContent: 'flex-end',
          }}
        >
          <span style={{ fontSize: 10, color: '#52525b' }}>Less</span>
          <div
            style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'rgba(42, 42, 53, 0.4)' }}
          />
          <div
            style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'rgba(84, 64, 127, 0.55)' }}
          />
          <div
            style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'rgba(126, 97, 191, 0.7)' }}
          />
          <div
            style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'rgba(168, 130, 255, 0.85)' }}
          />
          <div
            style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'rgb(168, 130, 255)' }}
          />
          <span style={{ fontSize: 10, color: '#52525b' }}>More</span>
        </div>
      </div>
    </ChartCard>
  );
}
