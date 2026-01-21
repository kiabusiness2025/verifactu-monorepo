import { Card, CardContent, CardHeader, CardTitle } from '@verifactu/ui/components/card';
import { Badge } from '@verifactu/ui/components/badge';
import Link from 'next/link';

async function getOperationsSummary() {
  const res = await fetch('http://localhost:3003/api/admin/operations/summary', {
    cache: 'no-store'
  });
  return res.json();
}

export default async function OperationsPage() {
  const data = await getOperationsSummary();

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Operations Center</h1>
        <p className="text-muted-foreground">Monitor webhooks, emails, and support actions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/operations/webhooks">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-2xl font-bold">{data.webhooks.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Failed</span>
                  <Badge variant={data.webhooks.failed > 0 ? 'destructive' : 'secondary'}>
                    {data.webhooks.failed}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/operations/emails">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>Emails</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-2xl font-bold">{data.emails.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Failed</span>
                  <Badge variant={data.emails.failed > 0 ? 'destructive' : 'secondary'}>
                    {data.emails.failed}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Blocked Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Currently Blocked</span>
                <span className="text-2xl font-bold">{data.blockedUsers}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
