"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  email: string;
  pollingUnit: string;
  status: string;
  lastActive: string;
}

interface AgentsTabProps {
  agents: Agent[];
  getInitials: (name: string) => string;
}

export function AgentsTab({ agents, getInitials }: AgentsTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Polling Agents</CardTitle>
            <CardDescription>Agents assigned to polling units in your ward</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Polling Unit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{getInitials(agent.name)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{agent.name}</span>
                  </div>
                </TableCell>
                <TableCell>{agent.email}</TableCell>
                <TableCell>{agent.pollingUnit}</TableCell>
                <TableCell>
                  <Badge 
                    variant={agent.status === 'Online' ? 'default' : 'secondary'} 
                    className={agent.status === 'Online' ? 'bg-green-100 text-green-800' : ''}
                  >
                    {agent.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{agent.lastActive}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Profile</DropdownMenuItem>
                      <DropdownMenuItem>View Reports</DropdownMenuItem>
                      <DropdownMenuItem>Send Message</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}