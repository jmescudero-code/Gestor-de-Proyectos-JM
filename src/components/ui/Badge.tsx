import React from 'react';
import { EntityStatus } from '../../types';

export const StatusBadge: React.FC<{ status: EntityStatus }> = ({ status }) => {
  const colors: Record<EntityStatus, string> = {
    'No iniciada': 'bg-gray-200 text-gray-700',
    'En curso': 'bg-brand-light text-white',
    'Listo': 'bg-[#2D5A27] text-white',
    'Aplazado': 'bg-yellow-200 text-yellow-800',
    'Cancelado': 'bg-red-100 text-red-800',
    'Sati': 'bg-purple-100 text-purple-800',
    'Pausado': 'bg-brand-orange text-white',
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-bold rounded-[8px] ${colors[status]}`}>
      {status}
    </span>
  );
}
