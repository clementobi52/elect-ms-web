// app/platform/layout.tsx
"use client";

// A shell, not a guard. The real access decision lives on the server: every
// /api/platform route re-reads the user and checks the role, so a client-side
// redirect here is a UX convenience rather than the thing standing between a
// browser and another tenant's data. That is deliberate - the alternative, a
// layout that renders only after checking, would just delay the same 403.

import React from 'react';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}