"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { ROLES, getRoleDisplayName, getRoleBadgeColor } from '@/lib/types';
import {
  LayoutDashboard,
  Users,
  MapPin,
  FileText,
  AlertTriangle,
  Settings,
  LogOut,
  Building2,
  Map,
  BarChart3,
  Shield,
  Eye,
  ClipboardList,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  roles: string[]; // Use string[] instead of Role[] to avoid type issues
  children?: NavItem[];
}

// Define nav items with exact role strings
const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin/ward',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ['Ward Admin', 'Zone Admin', 'Situation Room Admin', 'System Admin'],
  },
  {
    title: 'Polling Units',
    href: '/admin/ward/polling-units',
    icon: <MapPin className="h-5 w-5" />,
    roles: ['Ward Admin', 'Zone Admin', 'Situation Room Admin', 'System Admin'],
  },
  {
    title: 'Agents',
    href: '/admin/ward/agents',
    icon: <Users className="h-5 w-5" />,
    roles: ['Ward Admin', 'Zone Admin', 'Situation Room Admin', 'System Admin'],
  },
  {
    title: 'Election Results',
    href: '/admin/ward/results',
    icon: <FileText className="h-5 w-5" />,
    roles: ['Ward Admin', 'Zone Admin', 'Situation Room Admin', 'System Admin'],
  },
  {
    title: 'Incidents',
    href: '/admin/ward/incidents',
    icon: <AlertTriangle className="h-5 w-5" />,
    roles: ['Ward Admin', 'Zone Admin', 'Situation Room Admin', 'System Admin'],
  },
  {
    title: 'Wards',
    href: '/admin/wards',
    icon: <Building2 className="h-5 w-5" />,
    roles: ['Zone Admin', 'Situation Room Admin', 'System Admin'],
  },
  {
    title: 'Zones',
    href: '/admin/zones',
    icon: <Map className="h-5 w-5" />,
    roles: ['Situation Room Admin', 'System Admin'],
  },
  {
    title: 'Live Monitoring',
    href: '/admin/live',
    icon: <Eye className="h-5 w-5" />,
    roles: ['Situation Room Admin', 'System Admin'],
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ['Zone Admin', 'Situation Room Admin', 'System Admin'],
  },
  {
    title: 'Reports',
    href: '/admin/reports',
    icon: <ClipboardList className="h-5 w-5" />,
    roles: ['Zone Admin', 'Situation Room Admin', 'System Admin'],
  },
  {
    title: 'User Management',
    href: '/admin/users',
    icon: <Shield className="h-5 w-5" />,
    roles: ['System Admin'],
  },
  {
    title: 'System Settings',
    href: '/admin/settings',
    icon: <Settings className="h-5 w-5" />,
    roles: ['System Admin'],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  if (!user) return null;

  // Filter items based on user role
  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user.role)
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      {/* Logo and Brand */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Shield className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Election Monitor</span>
          <span className="text-xs text-muted-foreground">Admin Panel</span>
        </div>
      </div>

      {/* User Info */}
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.name}</span>
            <Badge className={cn("text-xs w-fit", getRoleBadgeColor(user.role))}>
              {getRoleDisplayName(user.role)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {filteredNavItems.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              No navigation items available for your role: {user.role}
            </div>
          ) : (
            filteredNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3",
                      isActive && "bg-accent text-accent-foreground"
                    )}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </Button>
                </Link>
              );
            })
          )}
        </nav>
      </ScrollArea>

      {/* Bottom Section */}
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );
}