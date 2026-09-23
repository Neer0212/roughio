'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function BackButton({ fallback = '/' }: { fallback?: string }) {
  const router = useRouter();

  return (
    <button 
      className="mb-6 -ml-2 text-text-secondary hover:text-text-primary hover:bg-elevated/50 flex items-center gap-2 rounded-full py-2 px-4 transition-colors font-medium text-sm"
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 2) {
          router.back();
        } else {
          router.push(fallback);
        }
      }}
    >
      <ArrowLeft className="w-4 h-4" />
      <span>Back</span>
    </button>
  );
}
