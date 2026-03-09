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
import { Download, MoreVertical } from 'lucide-react';
import { PollingUnit } from '@/lib/types/ward-admin';

interface PollingUnitsTabProps {
  units: PollingUnit[];
  getInitials: (name: string) => string;
}

export function PollingUnitsTab({ units, getInitials }: PollingUnitsTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Polling Units</CardTitle>
            <CardDescription>All polling units in your ward</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Polling Unit</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Registered Voters</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Results</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((pu) => (
              <TableRow key={pu.id}>
                <TableCell className="font-medium">{pu.name}</TableCell>
                <TableCell>{pu.code}</TableCell>
                <TableCell>{pu.registeredVoters.toLocaleString()}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(pu.agent)}
                      </AvatarFallback>
                    </Avatar>
                    {pu.agent}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={pu.status === 'active' ? 'default' : 'secondary'}>
                    {pu.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {pu.resultsSubmitted ? (
                    <Badge className="bg-green-100 text-green-800">Submitted</Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>View Results</DropdownMenuItem>
                      <DropdownMenuItem>Contact Agent</DropdownMenuItem>
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