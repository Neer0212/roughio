'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function BackButton({ fallback = '/', label = 'Back' }: { fallback?: string; label?: string }) {
  const router = useRouter();

  return (
    <button 
      className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-xl border border-border bg-surface/80 hover:bg-elevated hover:border-border-hover transition-colors shadow-sm"
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 2) {
          router.back();
        } else {
          router.push(fallback);
        }
      }}
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}
