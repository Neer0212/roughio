// src/app/games/sound-match/page.tsx
import { Metadata } from 'next';
import { Suspense } from 'react';
import { SoundMatchClient } from './sound-match-client';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sound Match | Roughio Arcade',
  description: 'Train your ear: listen to a target tone and dial in the exact frequency from memory.',
};

export default function SoundMatchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
        </div>
      }
    >
      <SoundMatchClient />
    </Suspense>
  );
}
