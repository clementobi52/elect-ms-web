"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { WardStats } from '@/lib/types/ward-admin';

interface ResultStatusCardsProps {
  stats: WardStats;
}

export function ResultStatusCards({ stats }: ResultStatusCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="p-3 bg-yellow-100 rounded-full">
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-yellow-800">Pending Review</p>
            <p className="text-2xl font-bold text-yellow-900">{stats.pendingResults}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-green-50 border-green-200">
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="p-3 bg-green-100 rounded-full">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-green-800">Approved</p>
            <p className="text-2xl font-bold text-green-900">{stats.approvedResults}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-red-50 border-red-200">
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="p-3 bg-red-100 rounded-full">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-800">Rejected</p>
            <p className="text-2xl font-bold text-red-900">{stats.rejectedResults}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}