"use client";

import { useParams } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="User Profile" 
        subtitle={`Viewing user ${userId}`}
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
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">User profile page for ID: {userId}</p>
            <p className="text-muted-foreground mt-2">This page is under construction.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}