// src/app/games/color-recall/page.tsx
import { Metadata } from 'next';
import { Suspense } from 'react';
import { ColorRecallClient } from './color-recall-client';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Color Recall | Roughio Arcade',
  description: 'Memorize a target shade, then recreate it from memory using Hue, Saturation, and Lightness.',
};

export default function ColorRecallPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
        </div>
      }
    >
      <ColorRecallClient />
    </Suspense>
  );
}
