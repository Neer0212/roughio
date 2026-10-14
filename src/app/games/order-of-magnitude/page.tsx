// src/app/games/order-of-magnitude/page.tsx
import { Metadata } from 'next';
import { Suspense } from 'react';
import { OrderOfMagnitudeClient } from './order-of-magnitude-client';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Order of Magnitude | Roughio Arcade',
  description: 'Rapid comparisons of numbers across cosmic, atomic, and global scales.',
};

export default function OrderOfMagnitudePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
        </div>
      }
    >
      <OrderOfMagnitudeClient />
    </Suspense>
  );
}
