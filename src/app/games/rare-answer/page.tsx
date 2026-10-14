// src/app/games/rare-answer/page.tsx
import { Metadata } from 'next';
import { Suspense } from 'react';
import { RareAnswerClient } from './rare-answer-client';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Rare Answer | Roughio Arcade',
  description: 'Open-ended trivia where less obvious valid answers score higher. Test the depth of your recall!',
};

export default function RareAnswerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
        </div>
      }
    >
      <RareAnswerClient />
    </Suspense>
  );
}
