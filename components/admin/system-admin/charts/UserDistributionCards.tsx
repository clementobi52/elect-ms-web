// components/admin/system-admin/charts/UserDistributionCards.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Building2, Map, Eye, Shield } from 'lucide-react';

interface UserDistributionCardsProps {
  stats: {
    totalAgents: number;
    totalWardAdmins: number;
    totalZoneAdmins: number;
    situationRoomUsers: number;
    systemAdmins: number;
  };
}

export const UserDistributionCards: React.FC<UserDistributionCardsProps> = ({ stats }) => {
  const cards = [
    {
      bgColor: 'bg-blue-50 border-blue-200',
      iconBg: 'bg-blue-100',
      icon: Users,
      iconColor: 'text-blue-600',
      label: 'Polling Agents',
      value: stats.totalAgents,
      textColor: 'text-blue-700',
      valueColor: 'text-blue-900',
    },
    {
      bgColor: 'bg-green-50 border-green-200',
      iconBg: 'bg-green-100',
      icon: Building2,
      iconColor: 'text-green-600',
      label: 'Ward Admins',
      value: stats.totalWardAdmins,
      textColor: 'text-green-700',
      valueColor: 'text-green-900',
    },
    {
      bgColor: 'bg-purple-50 border-purple-200',
      iconBg: 'bg-purple-100',
      icon: Map,
      iconColor: 'text-purple-600',
      label: 'Zone Admins',
      value: stats.totalZoneAdmins,
      textColor: 'text-purple-700',
      valueColor: 'text-purple-900',
    },
    {
      bgColor: 'bg-orange-50 border-orange-200',
      iconBg: 'bg-orange-100',
      icon: Eye,
      iconColor: 'text-orange-600',
      label: 'Situation Room',
      value: stats.situationRoomUsers,
      textColor: 'text-orange-700',
      valueColor: 'text-orange-900',
    },
    {
      bgColor: 'bg-red-50 border-red-200',
      iconBg: 'bg-red-100',
      icon: Shield,
      iconColor: 'text-red-600',
      label: 'System Admins',
      value: stats.systemAdmins,
      textColor: 'text-red-700',
      valueColor: 'text-red-900',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {cards.map((card, index) => (
        <Card key={index} className={card.bgColor}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${card.iconBg} rounded-lg`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <div>
                <p className={`text-sm ${card.textColor}`}>{card.label}</p>
                <p className={`text-xl font-bold ${card.valueColor}`}>{card.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};