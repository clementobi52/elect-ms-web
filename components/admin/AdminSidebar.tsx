"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { getRoleDisplayName, getRoleBadgeColor } from '@/lib/types';
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
  Activity,
  HelpCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface NavItem {
  title: string;
  getHref: (role: string) => string;
  icon: React.ReactNode;
  roles: string[];
  children?: NavItem[];
}

// Helper to get role-specific base path
const getRoleBasePath = (role: string): string => {
  switch (role) {
    case 'System Admin':
      return '/admin/system';
    case 'Situation Room Admin':
      return '/admin/situation';
    case 'Zone Admin':
      return '/admin/zone';
    case 'Ward Admin':
      return '/admin/ward';
    default:
      return '/admin';
  }
};

// Define nav items with role-based hrefs
const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    getHref: (role) => `${getRoleBasePath(role)}`,
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ['Ward Admin', 'Zone Admin', 'Situation Room Admin', 'System Admin'],
  },
  {
    title: 'Election Management',
    icon: <FileText className="h-5 w-5" />,
    roles: ['Ward Admin', 'Zone Admin', 'Situation Room Admin', 'System Admin'],
    children: [
      {
        title: 'Polling Units',
        getHref: (role) => `${getRoleBasePath(role)}/polling-units`,
        icon: <MapPin className="h-5 w-5" />,
        roles: ['Ward Admin', 'Zone Admin', 'Situation Room Admin', 'System Admin'],
      },
      {
        title: 'Agents',
        getHref: (role) => `${getRoleBasePath(role)}/agents`,
        icon: <Users className="h-5 w-5" />,
        roles: ['Ward Admin', 'Zone Admin', 'Situation Room Admin', 'System Admin'],
      },
      {
        title: 'Election Results',
        getHref: (role) => `${getRoleBasePath(role)}/results`,
        icon: <FileText className="h-5 w-5" />,
        roles: ['Ward Admin', 'Zone Admin', 'Situation Room Admin', 'System Admin'],
      },
      {
        title: 'Incidents',
        getHref: (role) => `${getRoleBasePath(role)}/incidents`,
        icon: <AlertTriangle className="h-5 w-5" />,
        roles: ['Ward Admin', 'Zone Admin', 'Situation Room Admin', 'System Admin'],
      },
    ],
  },
  {
    title: 'Geographic Management',
    icon: <Map className="h-5 w-5" />,
    roles: ['Zone Admin', 'Situation Room Admin', 'System Admin'],
    children: [
      {
        title: 'Wards',
        getHref: (role) => role === 'System Admin' ? '/admin/wards' : `${getRoleBasePath(role)}/wards`,
        icon: <Building2 className="h-5 w-5" />,
        roles: ['Zone Admin', 'Situation Room Admin', 'System Admin'],
      },
      {
        title: 'Zones',
        getHref: (role) => role === 'System Admin' ? '/admin/zones' : `${getRoleBasePath(role)}/zones`,
        icon: <Map className="h-5 w-5" />,
        roles: ['Situation Room Admin', 'System Admin'],
      },
    ],
  },
  {
    title: 'Monitoring & Analytics',
    icon: <Activity className="h-5 w-5" />,
    roles: ['Zone Admin', 'Situation Room Admin', 'System Admin'],
    children: [
      {
        title: 'Live Monitoring',
        getHref: (role) => role === 'System Admin' ? '/admin/live' : `${getRoleBasePath(role)}/live`,
        icon: <Eye className="h-5 w-5" />,
        roles: ['Situation Room Admin', 'System Admin'],
      },
      {
        title: 'Analytics',
        getHref: (role) => role === 'System Admin' ? '/admin/analytics' : `${getRoleBasePath(role)}/analytics`,
        icon: <BarChart3 className="h-5 w-5" />,
        roles: ['Zone Admin', 'Situation Room Admin', 'System Admin'],
      },
      {
        title: 'Reports',
        getHref: (role) => role === 'System Admin' ? '/admin/reports' : `${getRoleBasePath(role)}/reports`,
        icon: <ClipboardList className="h-5 w-5" />,
        roles: ['Zone Admin', 'Situation Room Admin', 'System Admin'],
      },
    ],
  },
  {
    title: 'System Administration',
    icon: <Shield className="h-5 w-5" />,
    roles: ['System Admin'],
    children: [
      {
        title: 'System Dashboard',
        getHref: () => '/admin/system',
        icon: <LayoutDashboard className="h-5 w-5" />,
        roles: ['System Admin'],
      },
      {
        title: 'User Management',
        getHref: () => '/admin/users',
        icon: <Users className="h-5 w-5" />,
        roles: ['System Admin'],
      },
      {
        title: 'System Settings',
        getHref: () => '/admin/settings',
        icon: <Settings className="h-5 w-5" />,
        roles: ['System Admin'],
      },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  if (!user) return null;

  // Filter nav items based on user role
  const filteredNavItems = useMemo(() => {
    return navItems
      .map(item => ({
        ...item,
        children: item.children?.filter(child => 
          user.role === 'System Admin' ? true : child.roles.includes(user.role)
        ),
      }))
      .filter(item => {
        // Filter out empty sections
        if (item.children && item.children.length === 0) return false;
        // Check if the item itself is allowed
        return user.role === 'System Admin' ? true : item.roles.includes(user.role);
      });
  }, [user.role]);

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
      {/* Logo and Brand - Fixed at top */}
      <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Shield className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Election Monitor</span>
          <span className="text-xs text-muted-foreground">Admin Panel</span>
        </div>
      </div>

      {/* User Info - Fixed */}
      <div className="shrink-0 border-b p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{user.name}</span>
            <Badge className={cn("text-xs w-fit", getRoleBadgeColor(user.role))}>
              {getRoleDisplayName(user.role)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation - Always expanded, scrollable without visible scrollbar */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-3 py-4">
        <nav className="flex flex-col gap-2">
          {filteredNavItems.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              No navigation items available for your role: {user.role}
            </div>
          ) : (
            filteredNavItems.map((item) => {
              // If item has children, render all children directly (no collapsible)
              if (item.children && item.children.length > 0) {
                return (
                  <div key={item.title} className="space-y-1">
                    {/* Section Header */}
                    <div className="flex items-center gap-3 px-2 py-2 text-sm font-semibold text-muted-foreground">
                      {item.icon}
                      <span>{item.title}</span>
                    </div>
                    {/* Child Items */}
                    <div className="ml-4 space-y-1">
                      {item.children.map((child) => {
                        const href = child.getHref(user.role);
                        const isChildActive = pathname === href || 
                          (href && pathname.startsWith(href + '/'));
                        
                        return (
                          <Link key={href} href={href}>
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full justify-start gap-3",
                                isChildActive && "bg-accent text-accent-foreground"
                              )}
                            >
                              {child.icon}
                              <span>{child.title}</span>
                            </Button>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Render regular link item
              const href = item.getHref(user.role);
              const isActive = pathname === href || 
                (href && pathname.startsWith(href + '/'));
              
              return (
                <Link key={href} href={href}>
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
      </div>

      {/* Bottom Section - Fixed at bottom */}
      <div className="shrink-0 border-t p-4 space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={() => window.open('/help', '_blank')}
        >
          <HelpCircle className="h-5 w-5" />
          <span>Help & Support</span>
        </Button>
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