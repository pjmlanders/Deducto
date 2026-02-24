import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TAX_DISCLAIMER } from '@/lib/constants';

export function SecurityPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
      <p className="text-sm text-muted-foreground">
        Deducto implements technical and operational controls to protect your data. This page
        summarizes our practices. We do not claim SOC 2 or other formal compliance certifications
        unless explicitly stated in a separate report.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Technical controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-foreground">Authentication:</strong> Clerk handles sign-up and sign-in; we never store passwords. All API requests require a verified JWT.</li>
            <li><strong className="text-foreground">Authorization:</strong> Every request is scoped to the logged-in user; you cannot access another user’s data or files.</li>
            <li><strong className="text-foreground">Encryption in transit:</strong> All traffic is over HTTPS (Vercel and Railway).</li>
            <li><strong className="text-foreground">Encryption at rest:</strong> We recommend and support database encryption at rest (via your provider) and receipt storage in S3 with server-side encryption. Confirm these are enabled in your deployment.</li>
            <li><strong className="text-foreground">Headers:</strong> We set security headers (e.g. X-Content-Type-Options, X-Frame-Options, Referrer-Policy) to reduce XSS and clickjacking risk.</li>
            <li><strong className="text-foreground">Rate limiting:</strong> API requests are rate-limited per IP to reduce abuse.</li>
            <li><strong className="text-foreground">Sensitive data:</strong> No JWTs or sensitive data are stored in localStorage; session handling is delegated to Clerk.</li>
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-foreground">{TAX_DISCLAIMER}</p>
        </CardContent>
      </Card>
    </div>
  );
}
