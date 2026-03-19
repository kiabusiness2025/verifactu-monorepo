'use client';

import { useParams } from 'next/navigation';
import * as React from 'react';
import { useClientWorkspace } from '../../../../../src/account/useClientWorkspace';
import { useCurrentTenant } from '../../../../../src/tenant/useCurrentTenant';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../../../../../src/ui';

export default function MembersSettingsPage() {
  const params = useParams();
  const routeTenantSlug = params.tenantSlug as string | undefined;
  const { currentTenant, userProfile } = useCurrentTenant(routeTenantSlug);
  const { members, inviteMember, removeInvitation } = useClientWorkspace(
    userProfile,
    currentTenant.id
  );
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<'ADMIN' | 'MANAGER' | 'VIEWER'>('ADMIN');
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const handleInvite = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invitation = inviteMember(email, role);
    if (!invitation) {
      setFeedback('Indica un correo válido para invitar al usuario.');
      return;
    }

    setEmail('');
    setFeedback(`Invitación preparada para ${invitation.email}.`);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Invitar usuarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Invita a tu equipo o asesoría para trabajar dentro de esta empresa.
          </p>
          <form className="grid gap-3 md:grid-cols-[1fr_180px_auto]" onSubmit={handleInvite}>
            <input
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="correo@empresa.com"
            />
            <select
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              value={role}
              onChange={(event) => setRole(event.target.value as 'ADMIN' | 'MANAGER' | 'VIEWER')}
            >
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Gestor</option>
              <option value="VIEWER">Solo lectura</option>
            </select>
            <Button type="submit">Invitar</Button>
          </form>
          {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Invitaciones activas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay usuarios invitados.</p>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="rounded-2xl border border-border p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-semibold">{member.email}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {member.role} · {member.status === 'pending' ? 'Pendiente' : 'Aceptado'}
                  </div>
                </div>
                <Button variant="ghost" onClick={() => removeInvitation(member.id)}>
                  Quitar
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
