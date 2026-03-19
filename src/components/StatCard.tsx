import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
}

export default function StatCard({ title, value, icon, trend, subtitle }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="text-sm font-medium text-gray-600">{title}</div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>

      <div className="mb-2">
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
      </div>

      {trend && (
        <div className={`flex items-center gap-1 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {trend.isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          <span>{Math.abs(trend.value)}%</span>
        </div>
      )}
    </div>
  );
}
