"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { ROLES, Role, getRoleDisplayName, getRoleBadgeColor } from '@/lib/types';
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
  Bell,
  ClipboardList,
  Eye,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  roles: Role[];
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: [ROLES.WARD_ADMIN, ROLES.ZONE_ADMIN, ROLES.SITUATION_ROOM, ROLES.SYSTEM_ADMIN],
  },
  {
    title: 'Polling Units',
    href: '/admin/polling-units',
    icon: <MapPin className="h-5 w-5" />,
    roles: [ROLES.WARD_ADMIN, ROLES.ZONE_ADMIN, ROLES.SITUATION_ROOM, ROLES.SYSTEM_ADMIN],
  },
  {
    title: 'Wards',
    href: '/admin/wards',
    icon: <Building2 className="h-5 w-5" />,
    roles: [ROLES.ZONE_ADMIN, ROLES.SITUATION_ROOM, ROLES.SYSTEM_ADMIN],
  },
  {
    title: 'Zones',
    href: '/admin/zones',
    icon: <Map className="h-5 w-5" />,
    roles: [ROLES.SITUATION_ROOM, ROLES.SYSTEM_ADMIN],
  },
  {
    title: 'Agents',
    href: '/admin/agents',
    icon: <Users className="h-5 w-5" />,
    roles: [ROLES.WARD_ADMIN, ROLES.ZONE_ADMIN, ROLES.SITUATION_ROOM, ROLES.SYSTEM_ADMIN],
  },
  {
    title: 'Election Results',
    href: '/admin/results',
    icon: <FileText className="h-5 w-5" />,
    roles: [ROLES.WARD_ADMIN, ROLES.ZONE_ADMIN, ROLES.SITUATION_ROOM, ROLES.SYSTEM_ADMIN],
  },
  {
    title: 'Incidents',
    href: '/admin/incidents',
    icon: <AlertTriangle className="h-5 w-5" />,
    roles: [ROLES.WARD_ADMIN, ROLES.ZONE_ADMIN, ROLES.SITUATION_ROOM, ROLES.SYSTEM_ADMIN],
  },
  {
    title: 'Live Monitoring',
    href: '/admin/live',
    icon: <Eye className="h-5 w-5" />,
    roles: [ROLES.SITUATION_ROOM, ROLES.SYSTEM_ADMIN],
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    icon: <BarChart3 className="h-5 w-5" />,
    roles: [ROLES.ZONE_ADMIN, ROLES.SITUATION_ROOM, ROLES.SYSTEM_ADMIN],
  },
  {
    title: 'Reports',
    href: '/admin/reports',
    icon: <ClipboardList className="h-5 w-5" />,
    roles: [ROLES.ZONE_ADMIN, ROLES.SITUATION_ROOM, ROLES.SYSTEM_ADMIN],
  },
  {
    title: 'User Management',
    href: '/admin/users',
    icon: <Shield className="h-5 w-5" />,
    roles: [ROLES.SYSTEM_ADMIN],
  },
  {
    title: 'System Settings',
    href: '/admin/settings',
    icon: <Settings className="h-5 w-5" />,
    roles: [ROLES.SYSTEM_ADMIN],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [openSections, setOpenSections] = React.useState<string[]>([]);

  if (!user) return null;

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

  const toggleSection = (title: string) => {
    setOpenSections(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

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
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const hasChildren = item.children && item.children.length > 0;

            if (hasChildren) {
              return (
                <Collapsible
                  key={item.title}
                  open={openSections.includes(item.title)}
                  onOpenChange={() => toggleSection(item.title)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-between",
                        isActive && "bg-accent"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span>{item.title}</span>
                      </div>
                      {openSections.includes(item.title) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-8">
                    {item.children?.map((child) => (
                      <Link key={child.href} href={child.href}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start gap-3",
                            pathname === child.href && "bg-accent"
                          )}
                        >
                          {child.icon}
                          <span>{child.title}</span>
                        </Button>
                      </Link>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            }

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
          })}
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
