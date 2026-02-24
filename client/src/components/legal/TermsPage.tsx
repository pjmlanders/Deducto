import { Card, CardContent } from '@/components/ui/card';
import { TAX_DISCLAIMER } from '@/lib/constants';

export function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Terms of Service</h1>
      <Card>
        <CardContent className="pt-6 space-y-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Last updated: February 2026</p>
          <p>
            By using Deducto you agree to use the service only for lawful purposes and to keep your
            account credentials secure. You are responsible for the accuracy of data you enter and
            for maintaining backups of important records.
          </p>
          <p>
            We reserve the right to suspend or terminate access for abuse, violation of these terms,
            or to protect the service and other users. We will use reasonable efforts to notify you
            where appropriate.
          </p>
          <p>
            The service is provided “as is.” We do not guarantee uninterrupted availability or that
            reports or exports are suitable for any particular tax or legal purpose.
          </p>
          <p className="border-t pt-4 text-foreground">{TAX_DISCLAIMER}</p>
          <p>
            For questions about these terms, contact us through the app or the support channel
            provided.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
