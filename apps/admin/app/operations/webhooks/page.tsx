'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@verifactu/ui/components/Table';
import { Badge } from '@verifactu/ui/components/badge';
import { Button } from '@verifactu/ui/components/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@verifactu/ui/components/select';
import Link from 'next/link';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  RECEIVED: 'secondary',
  PROCESSING: 'default',
  PROCESSED: 'outline',
  FAILED: 'destructive',
  IGNORED: 'secondary'
};

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [provider, setProvider] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWebhooks();
  }, [provider, status]);

  async function loadWebhooks() {
    setLoading(true);
    const params = new URLSearchParams();
    if (provider) params.set('provider', provider);
    if (status) params.set('status', status);

    const res = await fetch(`/api/admin/webhooks?${params}`);
    const data = await res.json();
    setWebhooks(data.webhooks);
    setLoading(false);
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground">Monitor webhook events from external services</p>
        </div>
        <Link href="/operations">
          <Button variant="outline">Back to Operations</Button>
        </Link>
      </div>

      <div className="flex gap-4">
        <Select value={provider} onValueChange={setProvider}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Providers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Providers</SelectItem>
            <SelectItem value="STRIPE">Stripe</SelectItem>
            <SelectItem value="RESEND">Resend</SelectItem>
            <SelectItem value="AEAT">AEAT</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="RECEIVED">Received</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="PROCESSED">Processed</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="IGNORED">Ignored</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {webhooks.map((webhook) => (
              <TableRow key={webhook.id}>
                <TableCell>
                  <Badge variant="outline">{webhook.provider}</Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{webhook.eventType}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_COLORS[webhook.status]}>{webhook.status}</Badge>
                </TableCell>
                <TableCell>{format(new Date(webhook.receivedAt), 'MMM d, yyyy HH:mm')}</TableCell>
                <TableCell>{webhook.attempts.length}</TableCell>
                <TableCell>
                  <Link href={`/operations/webhooks/${webhook.id}`}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

