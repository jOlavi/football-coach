import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  sub?: string;
}

export function StatCard({ label, value, icon, color = 'bg-brand-500', sub }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className={`${color} text-white rounded-lg p-2.5`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-slate-500">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}
