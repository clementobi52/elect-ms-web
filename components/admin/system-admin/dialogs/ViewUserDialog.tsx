// components/admin/system-admin/dialogs/ViewUserDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User } from '../types';

interface ViewUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  getAssignmentDisplay: (user: User | null) => string;
  getLocationDisplay: (user: User | null) => string;
}

export const ViewUserDialog: React.FC<ViewUserDialogProps> = ({
  open,
  onOpenChange,
  user,
  getAssignmentDisplay,
  getLocationDisplay,
}) => {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="font-medium">ID:</div>
            <div className="col-span-2">{user.id}</div>

            <div className="font-medium">Name:</div>
            <div className="col-span-2">{user.name}</div>

            <div className="font-medium">Email:</div>
            <div className="col-span-2">{user.email}</div>

            <div className="font-medium">Role:</div>
            <div className="col-span-2">{user.role}</div>

            <div className="font-medium">Status:</div>
            <div className="col-span-2">{user.status || 'active'}</div>

            <div className="font-medium">Assignment:</div>
            <div className="col-span-2">{getAssignmentDisplay(user)}</div>

            <div className="font-medium">Location:</div>
            <div className="col-span-2">{getLocationDisplay(user)}</div>

            <div className="font-medium">Created:</div>
            <div className="col-span-2">
              {user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};