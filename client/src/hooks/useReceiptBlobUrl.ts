import { useEffect, useState } from 'react';
import { receiptsApi } from '@/services/api';

/**
 * Fetches a receipt file via the authenticated API and returns a blob URL
 * suitable for use in <img src> or <iframe src>. Revokes the URL on cleanup.
 */
export function useReceiptBlobUrl(apiPath: string | null) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!apiPath) return;
    let url: string | null = null;

    receiptsApi.fetchBlobUrl(apiPath)
      .then((u) => { url = u; setBlobUrl(u); })
      .catch(() => setBlobUrl(null));

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [apiPath]);

  return blobUrl;
}
