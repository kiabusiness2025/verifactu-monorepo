'use client';

import { Badge } from '@verifactu/ui/components/badge';
import { Button } from '@verifactu/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@verifactu/ui/components/Card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@verifactu/ui/components/dialog';
import { Input } from '@verifactu/ui/components/input';
import { Label } from '@verifactu/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@verifactu/ui/components/select';
import { Textarea } from '@verifactu/ui/components/textarea';
import { format } from 'date-fns';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function UserDetailPage() {
  const params = useParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Block dialog state
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  // Email dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailProvider, setEmailProvider] = useState<'RESEND' | 'GMAIL'>('RESEND');

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    setLoading(true);
    const res = await fetch(`/api/admin/users/${params.id}`);
    const data = await res.json();
    setUser(data);
    setLoading(false);
  }

  async function handleBlock() {
    if (!blockReason.trim()) {
      alert('Please provide a reason');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${params.id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: blockReason }),
      });

      if (res.ok) {
        setBlockDialogOpen(false);
        setBlockReason('');
        await loadUser();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to block user');
      }
    } catch (error) {
      console.error('Block failed:', error);
      alert('Failed to block user');
    }
    setActionLoading(false);
  }

  async function handleUnblock() {
    if (!confirm('Are you sure you want to unblock this user?')) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${params.id}/unblock`, {
        method: 'POST',
      });

      if (res.ok) {
        await loadUser();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to unblock user');
      }
    } catch (error) {
      console.error('Unblock failed:', error);
      alert('Failed to unblock user');
    }
    setActionLoading(false);
  }

  async function handleSendEmail() {
    if (!emailSubject.trim() || !emailMessage.trim()) {
      alert('Subject and message are required');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${params.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: emailSubject,
          message: emailMessage,
          provider: emailProvider,
        }),
      });

      if (res.ok) {
        setEmailDialogOpen(false);
        setEmailSubject('');
        setEmailMessage('');
        setEmailProvider('RESEND');
        alert(`Email sent successfully via ${emailProvider}`);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Send email failed:', error);
      alert('Failed to send email');
    }
    setActionLoading(false);
  }

  if (loading) return <p className="p-8">Loading...</p>;
  if (!user) return <p className="p-8">User not found</p>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Details</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <Link href="/users">
          <Button variant="secondary">Back to Users</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{user.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p>{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <Badge variant="default">{user.role}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email Verified</p>
              <Badge variant={user.emailVerified ? 'success' : 'warning'}>
                {user.emailVerified ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={user.isBlocked ? 'danger' : 'success'}>
                {user.isBlocked ? 'Blocked' : 'Active'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created At</p>
              <p>{format(new Date(user.createdAt), 'MMM d, yyyy HH:mm')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Support Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user.isBlocked ? (
              <>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-sm font-semibold text-destructive">User is blocked</p>
                  {user.blockedReason && (
                    <p className="text-sm text-muted-foreground mt-2">{user.blockedReason}</p>
                  )}
                  {user.blockedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Blocked at {format(new Date(user.blockedAt), 'MMM d, yyyy HH:mm')}
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleUnblock}
                  disabled={actionLoading}
                  variant="secondary"
                  className="w-full"
                >
                  Unblock User
                </Button>
              </>
            ) : (
              <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="danger" className="w-full">
                    Block User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Block User</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Reason (required)</Label>
                      <Textarea
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        placeholder="Why are you blocking this user?"
                        rows={4}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="secondary" onClick={() => setBlockDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="danger"
                        onClick={handleBlock}
                        disabled={actionLoading || !blockReason.trim()}
                      >
                        Block User
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="w-full">
                  Send Email
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Email to User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Email Provider</Label>
                    <Select
                      value={emailProvider}
                      onValueChange={(value: 'RESEND' | 'GMAIL') => setEmailProvider(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RESEND">Resend (no-reply@verifactu.business)</SelectItem>
                        <SelectItem value="GMAIL">Gmail (support@verifactu.business)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {emailProvider === 'GMAIL'
                        ? 'Sent from support@ using Gmail API. User can reply.'
                        : 'Transactional email from no-reply@. No replies tracked.'}
                    </p>
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Email subject"
                    />
                  </div>
                  <div>
                    <Label>Message</Label>
                    <Textarea
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      placeholder="Email message"
                      rows={6}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="secondary" onClick={() => setEmailDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSendEmail}
                      disabled={actionLoading || !emailSubject.trim() || !emailMessage.trim()}
                    >
                      Send via {emailProvider}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
