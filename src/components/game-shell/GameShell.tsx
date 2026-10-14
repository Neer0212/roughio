'use client';

import React from 'react';
import { cn } from '@/lib/utils/formatting';

interface GameShellProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'max-w-3xl' | 'max-w-4xl' | 'max-w-5xl' | 'max-w-6xl' | 'max-w-7xl';
}

export function GameShell({
  children,
  className,
  maxWidth = 'max-w-4xl',
}: GameShellProps) {
  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col selection:bg-accent selection:text-[#090A0F]">
      <main className={cn('flex-1 w-full mx-auto px-4 py-6 sm:py-10 flex flex-col', maxWidth, className)}>
        {children}
      </main>
    </div>
  );
}
