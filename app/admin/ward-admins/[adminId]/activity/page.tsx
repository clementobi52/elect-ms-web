"use client";

import { useParams } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminActivityPage() {
  const params = useParams();
  const adminId = params.adminId as string;

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Admin Activity" 
        subtitle={`Viewing activity for admin ${adminId}`}
      />
      <div className="flex-1 p-6">
        <div className="mb-4">
          <Link href="/admin/zone">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Activity page for Admin ID: {adminId}</p>
            <p className="text-muted-foreground mt-2">This page is under construction.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}