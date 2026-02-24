import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TAX_DISCLAIMER } from '@/lib/constants';

export function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
      <Card>
        <CardContent className="pt-6 space-y-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Last updated: February 2026</p>
          <p>
            Deducto (“we”) collects and uses your data to provide expense tracking, receipt storage,
            and report generation. We do not sell your personal information.
          </p>
          <p>
            <strong>Data we collect:</strong> Account information (via Clerk: email, name, profile image),
            expense and receipt data you enter or upload, and usage data necessary to run the service.
          </p>
          <p>
            <strong>How we use it:</strong> To operate the app, store your receipts and expenses,
            generate reports, and improve the service. Receipt files and metadata are stored securely
            and are only accessible to you.
          </p>
          <p>
            <strong>Third parties:</strong> We use Clerk for authentication, Vercel and Railway for hosting,
            and Anthropic for AI receipt processing. Each has its own privacy policy governing their use of data.
          </p>
          <p className="border-t pt-4 text-foreground">{TAX_DISCLAIMER}</p>
          <p>
            For questions or to request deletion of your data, contact us through your account or
            the support channel provided in the app.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
