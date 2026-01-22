'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@verifactu/ui/components/Card';
import { Badge } from '@verifactu/ui/components/badge';
import { Button } from '@verifactu/ui/components/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { useParams } from 'next/navigation';

const STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  RECEIVED: 'warning',
  PROCESSING: 'info',
  PROCESSED: 'success',
  FAILED: 'danger',
  IGNORED: 'default'
};

export default function WebhookDetailPage() {
  const params = useParams();
  const [webhook, setWebhook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    loadWebhook();
  }, []);

  async function loadWebhook() {
    setLoading(true);
    const res = await fetch(`/api/admin/webhooks/${params.id}`);
    const data = await res.json();
    setWebhook(data);
    setLoading(false);
  }

  async function handleRetry() {
    setRetrying(true);
    try {
      await fetch(`/api/admin/webhooks/${params.id}/retry`, { method: 'POST' });
      await loadWebhook();
    } catch (error) {
      console.error('Retry failed:', error);
    }
    setRetrying(false);
  }

  if (loading) return <p className="p-8">Loading...</p>;
  if (!webhook) return <p className="p-8">Webhook not found</p>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Webhook Details</h1>
          <p className="text-muted-foreground font-mono">{webhook.id}</p>
        </div>
        <div className="flex gap-2">
          {webhook.status === 'FAILED' && (
            <Button onClick={handleRetry} disabled={retrying || webhook.attempts.length >= 5}>
              {retrying ? 'Retrying...' : 'Retry'}
            </Button>
          )}
          <Link href="/operations/webhooks">
            <Button variant="secondary">Back</Button>
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
              <p className="text-sm text-muted-foreground">Provider</p>
              <Badge variant="default">{webhook.provider}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Event Type</p>
              <p className="font-mono">{webhook.eventType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={STATUS_COLORS[webhook.status]}>{webhook.status}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Signature Valid</p>
              <Badge variant={webhook.signatureOk ? 'success' : 'danger'}>
                {webhook.signatureOk ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Received At</p>
              <p>{format(new Date(webhook.receivedAt), 'MMM d, yyyy HH:mm:ss')}</p>
            </div>
            {webhook.processedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Processed At</p>
                <p>{format(new Date(webhook.processedAt), 'MMM d, yyyy HH:mm:ss')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attempts ({webhook.attempts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {webhook.attempts.map((attempt: any) => (
                <div key={attempt.id} className="border-l-2 pl-4 border-muted">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">Attempt #{attempt.attemptNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(attempt.startedAt), 'MMM d, HH:mm:ss')}
                      </p>
                    </div>
                    <Badge variant={attempt.ok ? 'success' : 'danger'}>
                      {attempt.ok ? 'Success' : 'Failed'}
                    </Badge>
                  </div>
                  {attempt.error && (
                    <p className="text-sm text-destructive mt-2">{attempt.error}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payload</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(webhook.payload, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
