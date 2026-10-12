import React from 'react';
import { AttendanceStatus } from '../../types';

interface StatusBadgeProps {
  status: AttendanceStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'md' 
}) => {
  // STRICT RULE: Only 3 statuses (PRESENT = Green, RETARD = Orange, ABSENT = Red)
  if (status === 'PRESENT') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold rounded-md ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
      } bg-emerald-50 text-emerald-700 border border-emerald-200`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
        <span>Présent</span>
      </span>
    );
  }

  if (status === 'RETARD') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold rounded-md ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
      } bg-amber-50 text-amber-700 border border-amber-200`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
        <span>Retard</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-md ${
      size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
    } bg-rose-50 text-rose-700 border border-rose-200`}>
      <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
      <span>Absent</span>
    </span>
  );
};

export const CodeBadge: React.FC<{ status: AttendanceStatus }> = ({ status }) => {
  if (status === 'PRESENT') {
    return (
      <span className="inline-block w-6 h-6 leading-6 text-center rounded font-bold text-xs bg-emerald-600 text-white shadow-xs" title="Présent">
        P
      </span>
    );
  }
  if (status === 'RETARD') {
    return (
      <span className="inline-block w-6 h-6 leading-6 text-center rounded font-bold text-xs bg-amber-600 text-white shadow-xs" title="Retard">
        R
      </span>
    );
  }
  return (
    <span className="inline-block w-6 h-6 leading-6 text-center rounded font-bold text-xs bg-rose-600 text-white shadow-xs" title="Absent">
      A
    </span>
  );
};
