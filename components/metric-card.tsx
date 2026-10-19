import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  icon,
  trend = 'neutral',
  className = '',
}: MetricCardProps) {
  const trendColor =
    trend === 'up'
      ? 'text-green-600'
      : trend === 'down'
        ? 'text-red-600'
        : 'text-gray-600';

  return (
    <div className={`rounded-lg bg-card p-6 shadow-sm border border-border ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {change && <p className={`mt-1 text-xs font-medium ${trendColor}`}>{change}</p>}
        </div>
        {icon && <div className="ml-4 flex-shrink-0 text-primary">{icon}</div>}
      </div>
    </div>
  );
}
