import { useReceiptBlobUrl } from '@/hooks/useReceiptBlobUrl';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';

interface Props {
  receiptId: string | null;
  mimeType?: string;
  title?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptViewerSheet({ receiptId, mimeType, title = 'Receipt', open, onOpenChange }: Props) {
  const isPdf = mimeType === 'application/pdf';

  // Always fetch via authenticated API — no direct URL navigation, so auth always works
  const blobUrl = useReceiptBlobUrl(
    open && receiptId
      ? isPdf
        ? `/receipts/${receiptId}/file`
        : `/receipts/${receiptId}/preview`
      : null
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col p-0 w-full sm:max-w-xl">
        <SheetHeader className="px-4 py-3">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-hidden bg-gray-50">
          {!blobUrl ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isPdf ? (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              title="Receipt PDF"
            />
          ) : (
            <div className="flex items-center justify-center h-full p-4 overflow-auto">
              <img
                src={blobUrl}
                alt="Receipt"
                className="max-w-full object-contain rounded"
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
