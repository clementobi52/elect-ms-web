"use client";

import { useSearchParams } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const contactId = searchParams.get('contact');
  const contactName = searchParams.get('name');

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Messages" 
        subtitle={contactName ? `Chat with ${contactName}` : 'All conversations'}
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
            <CardTitle>Messaging Center</CardTitle>
          </CardHeader>
          <CardContent>
            {contactId ? (
              <p className="text-muted-foreground">Chat with {contactName || 'contact'} (ID: {contactId})</p>
            ) : (
              <p className="text-muted-foreground">Select a contact to start messaging</p>
            )}
            <p className="text-muted-foreground mt-2">This page is under construction.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}