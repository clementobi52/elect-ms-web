// components/admin/system-admin/dialogs/BulkImportDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: string;
  onDataChange: (data: string) => void;
  onImport: () => void;
}

export const BulkImportDialog: React.FC<BulkImportDialogProps> = ({
  open,
  onOpenChange,
  data,
  onDataChange,
  onImport,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Polling Units</DialogTitle>
          <DialogDescription>
            Paste JSON array of polling units. Format:{' '}
            {`[{"name":"string","wardId":"uuid","latitude":number,"longitude":number}]`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>JSON Data</Label>
            <textarea
              className="w-full h-64 p-2 border rounded-md font-mono text-sm"
              value={data}
              onChange={(e) => onDataChange(e.target.value)}
              placeholder='[{"name":"PU 1","wardId":"uuid","latitude":6.5244,"longitude":3.3792}]'
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onImport}>Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};