// src/app/games/pattern-recall/page.tsx
import { Metadata } from 'next';
import { Suspense } from 'react';
import { PatternRecallClient } from './pattern-recall-client';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Pattern Recall | Roughio Arcade',
  description: 'Memorize an illuminated tile sequence, then reproduce it in exact order.',
};

export default function PatternRecallPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
        </div>
      }
    >
      <PatternRecallClient />
    </Suspense>
  );
}
