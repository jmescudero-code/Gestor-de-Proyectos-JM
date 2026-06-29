import React from 'react';
import { HealthStatus, HealthResult } from '../utils/health';

interface HealthBadgeProps {
  result: HealthResult;
}

export const HealthBadge: React.FC<HealthBadgeProps> = ({ result }) => {
  const colors: Record<HealthStatus, string> = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };

  return (
    <div className="flex items-center justify-center" title={result.reason}>
       <div className={`w-3 h-3 rounded-full ${colors[result.status]} shadow-sm`} />
    </div>
  );
};
