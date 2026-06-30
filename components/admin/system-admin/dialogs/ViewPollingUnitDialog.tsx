// components/admin/system-admin/dialogs/ViewPollingUnitDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PollingUnit } from '../types';

interface ViewPollingUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pollingUnit: PollingUnit | null;
}

export const ViewPollingUnitDialog: React.FC<ViewPollingUnitDialogProps> = ({
  open,
  onOpenChange,
  pollingUnit,
}) => {
  if (!pollingUnit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Polling Unit Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="font-medium">ID:</div>
            <div className="col-span-2">{pollingUnit.id}</div>

            <div className="font-medium">Name:</div>
            <div className="col-span-2">{pollingUnit.name}</div>

            <div className="font-medium">Ward:</div>
            <div className="col-span-2">{pollingUnit.ward?.name || '-'}</div>

            <div className="font-medium">Zone:</div>
            <div className="col-span-2">{pollingUnit.ward?.zone?.name || '-'}</div>

            <div className="font-medium">Coordinates:</div>
            <div className="col-span-2">
              {pollingUnit.latitude?.toFixed(6)}, {pollingUnit.longitude?.toFixed(6)}
            </div>

            <div className="font-medium">Agent:</div>
            <div className="col-span-2">{pollingUnit.agent?.name || 'Unassigned'}</div>

            <div className="font-medium">Created:</div>
            <div className="col-span-2">
              {pollingUnit.createdAt ? new Date(pollingUnit.createdAt).toLocaleString() : '-'}
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