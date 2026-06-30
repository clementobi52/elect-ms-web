// components/admin/system-admin/dialogs/ViewZoneDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Zone } from '../types';

interface ViewZoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone: Zone | null;
}

export const ViewZoneDialog: React.FC<ViewZoneDialogProps> = ({
  open,
  onOpenChange,
  zone,
}) => {
  if (!zone) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Zone Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="font-medium">ID:</div>
            <div className="col-span-2">{zone.id}</div>

            <div className="font-medium">Name:</div>
            <div className="col-span-2">{zone.name}</div>

            <div className="font-medium">Wards:</div>
            <div className="col-span-2">{zone.wards?.length || 0}</div>

            <div className="font-medium">Created:</div>
            <div className="col-span-2">
              {zone.createdAt ? new Date(zone.createdAt).toLocaleString() : '-'}
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