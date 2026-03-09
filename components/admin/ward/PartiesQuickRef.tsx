"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Party } from '@/lib/types/ward-admin';

interface PartiesQuickRefProps {
  parties: Party[];
}

export function PartiesQuickRef({ parties }: PartiesQuickRefProps) {
  if (parties.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Registered Parties</CardTitle>
        <CardDescription>Political parties in the system</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {parties.map((party) => (
            <Badge key={party.id} variant="outline" className="px-3 py-1 flex items-center gap-1">
              {party.logoUrl && (
                <img src={party.logoUrl} alt="" className="w-4 h-4 rounded-full" />
              )}
              {party.name}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}