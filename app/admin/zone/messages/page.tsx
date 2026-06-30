// app/admin/messages/page.tsx
"use client";

import React from 'react';
import { MessagingWidget } from '@/components/admin/MessagingWidget';
import AdminHeader from '@/components/admin/AdminHeader';

export default function MessagingCenterPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Messaging Center" 
        subtitle="Chat with ward admins and agents"
      />
      
      <div className="flex-1 p-4 md:p-6">
        <MessagingWidget 
          className="h-[calc(100vh-180px)] w-full"
          maxHeight="calc(100vh - 180px)"
          showHeader={false}
        />
      </div>
    </div>
  );
}