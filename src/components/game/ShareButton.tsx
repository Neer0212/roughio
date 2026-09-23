'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { cn } from '@/lib/utils/formatting';
import type { AttemptResult } from '@/lib/types/game';

interface ShareButtonProps {
  questionId: string;
  result: AttemptResult;
}

export function ShareButton({ questionId, result }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const getEmojiForClassification = (classification: string) => {
    switch (classification) {
      case 'perfect': return '🟩🟩🟩';
      case 'excellent': return '🟩🟩🟨';
      case 'good': return '🟩🟨🟨';
      case 'fair': return '🟨🟨🟥';
      case 'poor': return '🟨🟥🟥';
      case 'chaos': return '🟥🟥🟥';
      default: return '⬜⬜⬜';
    }
  };

  const handleShare = async () => {
    const emojis = getEmojiForClassification(result.classification);
    const url = `${window.location.origin}/game/play?challenge=${questionId}`;
    
    const text = `Roughio Challenge ${emojis}\n\nI was ${result.factor.toFixed(1)}x off!\nCan you get closer?\n\n${url}`;

    try {
      if (navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
        await navigator.share({
          title: 'Roughio Challenge',
          text: text,
        });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to share:', err);
    }
  };

  return (
    <button
      onClick={handleShare}
      className={cn(
        "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all w-full sm:w-auto justify-center",
        copied 
          ? "bg-success/20 text-success" 
          : "bg-accent hover:bg-accent/90 text-background"
      )}
    >
      {copied ? (
        <>
          <Check className="w-5 h-5" />
          <span>Copied to Clipboard!</span>
        </>
      ) : (
        <>
          <Share2 className="w-5 h-5" />
          <span>Share Challenge</span>
        </>
      )}
    </button>
  );
}
