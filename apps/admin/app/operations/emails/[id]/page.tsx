'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@verifactu/ui/components/card';
import { Badge } from '@verifactu/ui/components/badge';
import { Button } from '@verifactu/ui/components/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { useParams } from 'next/navigation';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  QUEUED: 'secondary',
  SENT: 'default',
  DELIVERED: 'outline',
  BOUNCED: 'destructive',
  COMPLAINED: 'destructive',
  FAILED: 'destructive'
};

const PROVIDER_COLORS: Record<string, 'default' | 'secondary' | 'outline'> = {
  RESEND: 'default',
  GMAIL: 'secondary'
};

export default function EmailDetailPage() {
  const params = useParams();
  const [email, setEmail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    loadEmail();
  }, []);

  async function loadEmail() {
    setLoading(true);
    const res = await fetch(`/api/admin/emails/${params.id}`);
    const data = await res.json();
    setEmail(data);
    setLoading(false);
  }

  async function handleRetry() {
    setRetrying(true);
    try {
      const res = await fetch(`/api/admin/emails/${params.id}/retry`, { method: 'POST' });
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || 'Retry failed');
      }
      
      await loadEmail();
    } catch (error) {
      console.error('Retry failed:', error);
      alert('Retry failed');
    }
    setRetrying(false);
  }

  if (loading) return <p className="p-8">Loading...</p>;
  if (!email) return <p className="p-8">Email not found</p>;

  // Only allow retry for Resend emails with FAILED or BOUNCED status
  const cancanRetry && (
            <Button onClick={handleRetry} disabled={retrying}>
              {retrying ? 'Retrying...' : 'Retry (Resend)'}
            </Button>
          )}
          {email.provider === 'GMAIL' && (email.status === 'FAILED' || email.status === 'BOUNCED') && (
            <div className="text-sm text-muted-foreground">
              Gmail emails cannot be retried automatically
            </divp-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Email Details</h1>
          <p className="text-muted-foreground font-mono">{email.id}</p>
        </div>
        <div className="flex gap-2">
          {(email.status === 'FAILED' || email.status === 'BOUNCED') && (
            <Button onClick={handleRetry} disabled={retrying}>
              {retrying ? 'Retrying...' : 'Retry'}
            </Button>
          )}
          <Link href="/operations/emails">
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">To</p>
              <p className="font-medium">{email.to}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Subject</p>
              <p>{email.subject || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Template</p>
              <p className="font-mono text-sm">{email.template || '-'}</p>
            </div>
            <div>
              <p className="t{PROVIDER_COLORS[email.provider]}>{email.provider}</Badge>
            </div>
            {email.fromEmail && (
              <div>
                <p className="text-sm text-muted-foreground">From</p>
                <p className="font-medium">{email.fromEmail}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Message ID</p>
              <p className="font-mono text-sm break-all">{email.messageId || '-'}</p>
            </div>
            {email.threadId && (
              <div>
                <p className="text-sm text-muted-foreground">Thread ID (Gmail)</p>
                <p className="font-mono text-sm break-all">{email.threadId}</p>
              </div>
            )}ge variant="outline">{email.provider}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Message ID</p>
              <p className="font-mono text-sm">{email.messageId || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created At</p>
              <p>{format(new Date(email.createdAt), 'MMM d, yyyy HH:mm:ss')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Updated At</p>
              <p>{format(new Date(email.updatedAt), 'MMM d, yyyy HH:mm:ss')}</p>
            </div>
          </CardContent>
        </Card>

        {email.user && (
          <Card>
            <CardHeader>
              <CardTitle>User</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p>{email.user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ID</p>
                <p className="font-mono text-sm">{email.user.id}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {email.lastError && (
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{email.lastError}</p>
          </CardContent>
        </Card>
      )}

      {email.payload && (
        <Card>
          <CardHeader>
            <CardTitle>Payload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(email.payload, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
