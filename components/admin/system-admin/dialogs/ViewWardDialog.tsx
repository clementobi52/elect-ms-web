// components/admin/system-admin/dialogs/ViewWardDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Ward } from '../types';

interface ViewWardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ward: Ward | null;
}

export const ViewWardDialog: React.FC<ViewWardDialogProps> = ({
  open,
  onOpenChange,
  ward,
}) => {
  if (!ward) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ward Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="font-medium">ID:</div>
            <div className="col-span-2">{ward.id}</div>

            <div className="font-medium">Name:</div>
            <div className="col-span-2">{ward.name}</div>

            <div className="font-medium">Zone:</div>
            <div className="col-span-2">{ward.zone?.name || '-'}</div>

            <div className="font-medium">Polling Units:</div>
            <div className="col-span-2">{ward.pollingUnits?.length || 0}</div>

            <div className="font-medium">Created:</div>
            <div className="col-span-2">
              {ward.createdAt ? new Date(ward.createdAt).toLocaleString() : '-'}
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