import { Ship } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Ship className="h-12 w-12 text-primary animate-pulse mb-4" />
      <p className="text-muted-foreground">Laden...</p>
    </div>
  );
}

