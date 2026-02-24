import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePendingReceipts, useDeleteReceipt } from '@/hooks/useReceipts';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Trash2, Plus, CheckCircle2, XCircle, Clock, Loader2, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ReceiptAcceptModal } from './ReceiptAcceptModal';
import type { Receipt } from '@/types';

function needsAttention(receipt: Receipt) {
  return (
    receipt.processingStatus === 'failed' ||
    receipt.isDuplicate ||
    (receipt.processingStatus === 'completed' && (!receipt.extractedVendor || !receipt.extractedAmount))
  );
}

export function ReceiptList() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const pq = projectId ? `?projectId=${projectId}` : '';
  const { data: projects } = useProjects();
  const projectName = projectId ? projects?.data?.find((p) => p.id === projectId)?.name : null;
  const { data: receipts, isLoading } = usePendingReceipts();
  const deleteReceipt = useDeleteReceipt();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [acceptReceipt, setAcceptReceipt] = useState<Receipt | null>(null);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Receipts</h1>
          <p className="text-sm text-muted-foreground">
            {receipts?.length || 0} receipt{receipts?.length !== 1 ? 's' : ''} pending
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
              All receipts have been processed. Upload new ones to get started.
            </p>
            <Button asChild>
              <Link to={`/scan${pq}`}>Scan or Upload</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {receipts?.map((receipt) => {
          const attention = needsAttention(receipt);
          const isProcessing = receipt.processingStatus === 'processing';
          const isPending = receipt.processingStatus === 'pending';
          const isFailed = receipt.processingStatus === 'failed';
          const isReady = receipt.processingStatus === 'completed';
          const displayName = receipt.extractedVendor || receipt.originalName || receipt.fileName;

          return (
            <Card
              key={receipt.id}
              className={`transition-shadow hover:shadow-md border-l-4 ${
                isFailed ? 'border-l-red-400' :
                attention ? 'border-l-amber-400' :
                isReady ? 'border-l-green-400' :
                'border-l-transparent'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {/* Status icon */}
                      {(isPending || isProcessing) && (
                        <Loader2 className={`h-4 w-4 text-blue-500 shrink-0 ${isProcessing ? 'animate-spin' : ''}`} />
                      )}
                      {isReady && !attention && (
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      )}
                      {attention && (
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                      {isFailed && (
                        <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                      )}

                      <span className="text-sm font-medium truncate">{displayName}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      {/* Status label */}
                      {isPending && <span className="text-amber-600">Queued</span>}
                      {isProcessing && <span className="text-blue-600">Processing…</span>}
                      {isFailed && <span className="text-red-600">Failed</span>}
                      {isReady && !attention && <span className="text-green-600">Ready</span>}
                      {isReady && attention && <span className="text-amber-600">Needs attention</span>}

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
                      {isReady && !receipt.extractedVendor && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">No vendor</Badge>
                      )}
                      {isReady && !receipt.extractedAmount && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">No amount</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {(isReady || isFailed) && (
                      <Button
                        variant={attention ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAcceptReceipt(receipt)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Expense
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

      {acceptReceipt && (
        <ReceiptAcceptModal
          receipt={acceptReceipt}
          projectId={projectId}
          open={!!acceptReceipt}
          onOpenChange={(open) => { if (!open) setAcceptReceipt(null); }}
        />
      )}

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
