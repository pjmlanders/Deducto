import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePendingReceipts, useDeleteReceipt } from '@/hooks/useReceipts';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Trash2, ArrowRight, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const statusConfig = {
  completed: { label: 'Ready for review', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  processing: { label: 'Processing...', icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  pending: { label: 'Queued', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  failed: { label: 'Failed', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
};

export function ReceiptList() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const pq = projectId ? `?projectId=${projectId}` : '';
  const { data: projects } = useProjects();
  const projectName = projectId ? projects?.data?.find((p) => p.id === projectId)?.name : null;
  const { data: receipts, isLoading } = usePendingReceipts();
  const deleteReceipt = useDeleteReceipt();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Receipts</h1>
          <p className="text-sm text-muted-foreground">
            {receipts?.length || 0} receipt{receipts?.length !== 1 ? 's' : ''} awaiting review
            {projectName && <> for <span className="font-medium text-foreground">{projectName}</span></>}
          </p>
        </div>
        <Button asChild>
          <Link to={`/scan${pq}`}>Upload New</Link>
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && (!receipts || receipts.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No pending receipts</h3>
            <p className="text-sm text-muted-foreground mb-4">
              All receipts have been reviewed. Upload new ones to get started.
            </p>
            <Button asChild>
              <Link to={`/scan${pq}`}>Scan or Upload</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {receipts?.map((receipt) => {
          const status = statusConfig[receipt.processingStatus as keyof typeof statusConfig] || statusConfig.pending;
          const StatusIcon = status.icon;
          const displayName = receipt.extractedVendor || receipt.originalName || receipt.fileName;

          return (
            <Card key={receipt.id} className={`${status.bg} transition-shadow hover:shadow-md`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusIcon className={`h-4 w-4 ${status.color} ${receipt.processingStatus === 'processing' ? 'animate-spin' : ''}`} />
                      <span className="text-sm font-medium truncate">{displayName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{status.label}</span>
                      {receipt.extractedAmount && (
                        <Badge variant="secondary" className="text-xs">
                          {formatCurrency(Number(receipt.extractedAmount))}
                        </Badge>
                      )}
                      {receipt.extractedDate && (
                        <span>{new Date(receipt.extractedDate).toLocaleDateString()}</span>
                      )}
                      {receipt.isDuplicate && (
                        <Badge variant="destructive" className="text-xs">Duplicate</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {receipt.processingStatus === 'completed' && (
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/receipts/${receipt.id}/review${pq}`}>
                          Review <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(receipt.id)}
                      disabled={deleteReceipt.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete receipt?"
        description="This will permanently delete this receipt. This action cannot be undone."
        onConfirm={() => { deleteReceipt.mutate(deleteId!); setDeleteId(null); }}
        isPending={deleteReceipt.isPending}
      />
    </div>
  );
}
