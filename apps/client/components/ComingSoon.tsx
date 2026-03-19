import { Clock } from 'lucide-react';
import { Card, CardContent } from '../src/ui';

type Props = {
  title: string;
  description?: string;
};

export function ComingSoon({ title, description }: Props) {
  return (
    <Card className="shadow-soft">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="rounded-full bg-primary/10 p-4">
          <Clock className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {description ?? 'Esta sección estará disponible próximamente.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
