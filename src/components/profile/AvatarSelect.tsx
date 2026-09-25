'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/formatting';
import { Loader2 } from 'lucide-react';

const AVATARS = [
  { id: 'napkin', emoji: '📝', name: 'The Napkin', requiredLevel: 1 },
  { id: 'abacus', emoji: '🧮', name: 'The Abacus', requiredLevel: 5 },
  { id: 'calculator', emoji: '📟', name: 'Pocket Calc', requiredLevel: 10 },
  { id: 'owl', emoji: '🦉', name: 'Wise Owl', requiredLevel: 25 },
  { id: 'einstein', emoji: '👨‍🔬', name: 'The Scientist', requiredLevel: 50 },
  { id: 'brain', emoji: '🧠', name: 'Galaxy Brain', requiredLevel: 100 },
];

export function AvatarSelect({ currentAvatar, level }: { currentAvatar: string; level: number }) {
  const [selected, setSelected] = useState(currentAvatar || 'napkin');
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  const handleSelect = async (id: string, requiredLevel: number) => {
    if (level < requiredLevel) return;
    
    setIsSaving(true);
    setSelected(id);
    
    try {
      await supabase.auth.updateUser({
        data: { avatar: id }
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-surface p-6 rounded-3xl border border-border mb-8">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        Choose your Avatar 
        {isSaving && <Loader2 className="w-4 h-4 animate-spin text-accent" />}
      </h3>
      <div className="flex flex-wrap gap-4">
        {AVATARS.map((av) => {
          const isLocked = level < av.requiredLevel;
          const isSelected = selected === av.id;
          
          return (
            <button
              key={av.id}
              onClick={() => handleSelect(av.id, av.requiredLevel)}
              disabled={isLocked}
              className={cn(
                "relative flex flex-col items-center justify-center w-24 h-24 rounded-2xl border-2 transition-all",
                isSelected ? "border-accent bg-accent/10 shadow-[0_4px_0_var(--accent)]" : "border-border bg-elevated hover:border-text-secondary hover:bg-surface",
                isLocked && "opacity-50 grayscale cursor-not-allowed border-dashed hover:border-border"
              )}
            >
              <span className="text-3xl mb-1">{av.emoji}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                {isLocked ? `Lvl ${av.requiredLevel}` : av.name}
              </span>
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-2xl backdrop-blur-[1px]">
                  <span className="text-xl">🔒</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
