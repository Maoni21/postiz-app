'use client';

interface SetterStatsCardProps {
  title: string;
  value: number | string;
  icon?: string;
  color?: string;
}

export const SetterStatsCard = ({
                                  title,
                                  value,
                                  icon = '📊',
                                  color = 'text-textColor'
                                }: SetterStatsCardProps) => {
  return (
    <div className="bg-bgColorInner border border-tableBorder rounded-xl p-6 hover:border-customColor6/50 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="text-textColor/60 text-sm">{title}</div>
        <div className="text-2xl">{icon}</div>
      </div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
    </div>
  );
};