'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@verifactu/ui/components/table';
import { Badge } from '@verifactu/ui/components/badge';
import { Button } from '@verifactu/ui/components/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@verifactu/ui/components/select';
import Link from 'next/link';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  QUEUED: 'secondary',
  SENT: 'default',
  DELIVERED: 'outline',
  BOUNCED: 'destructive',
  COMPLAINED: 'destructive',
  FAILED: 'destructive'
};

export default function EmailsPage() {
  const [emails, setEmails] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmails();
  }, [status]);

  async function loadEmails() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);

    const res = await fetch(`/api/admin/emails?${params}`);
    const data = await res.json();
    setEmails(data.emails);
    setLoading(false);
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Emails</h1>
          <p className="text-muted-foreground">Monitor email delivery status</p>
        </div>
        <Link href="/operations">
          <Button variant="outline">Back to Operations</Button>
        </Link>
      </div>

      <div className="flex gap-4">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="QUEUED">Queued</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="BOUNCED">Bounced</SelectItem>
            <SelectItem value="COMPLAINED">Complained</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>To</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {emails.map((email) => (
              <TableRow key={email.id}>
                <TableCell>{email.to}</TableCell>
                <TableCell>{email.subject || '-'}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_COLORS[email.status]}>{email.status}</Badge>
                </TableCell>
                <TableCell>{format(new Date(email.createdAt), 'MMM d, yyyy HH:mm')}</TableCell>
                <TableCell>
                  <Link href={`/operations/emails/${email.id}`}>
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
