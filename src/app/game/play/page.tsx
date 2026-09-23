// src/app/(game)/play/page.tsx
import { Metadata } from 'next';
import { GameClient } from './game-client';

export const metadata: Metadata = {
  title: 'Play | Roughio',
  description: 'How close can you get? Estimate anything, learn the reasoning, improve your skills.',
};

import { Suspense } from 'react';

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center">Loading...</div>}>
      <GameClient />
    </Suspense>
  );
}
