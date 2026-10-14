'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Swords, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { AuthModal } from '@/components/auth/AuthModal';
import { createClient } from '@/lib/supabase/client';
import { BackButton } from '@/components/layout/BackButton';
import { Navbar } from '@/components/layout/Navbar';

export default function BattleLobby() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [joinCode, setJoinCode] = useState('');
  const [rounds, setRounds] = useState(5);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const supabase = createClient();

  const handleCreate = async () => {
    setIsCreating(true);
    setError('');
    
    // Automatically sign in as a guest if not logged in
    if (!user) {
      const { error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError) {
        setIsCreating(false);
        return setShowAuthModal(true); // Fallback if anon sign-in is disabled in Supabase
      }
    }

    try {
      const res = await fetch('/api/battles/create', { method: 'POST', body: JSON.stringify({ maxRounds: rounds }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/battle/${data.battleId}`);
    } catch (err: any) {
      setError(err.message);
      setIsCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode || joinCode.length !== 4) return setError('Code must be 4 characters');
    
    setIsJoining(true);
    setError('');

    // Automatically sign in as a guest if not logged in
    if (!user) {
      const { error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError) {
        setIsJoining(false);
        return setShowAuthModal(true); // Fallback
      }
    }
    try {
      const res = await fetch('/api/battles/join', { method: 'POST', body: JSON.stringify({ shortCode: joinCode }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/battle/${data.battleId}`);
    } catch (err: any) {
      setError(err.message);
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col selection:bg-accent selection:text-[#090A0F]">
      <Navbar />

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-center">
        <div className="w-full flex items-center justify-start mb-6">
          <BackButton fallback="/games" label="Arcade" />
        </div>

        <div className="w-full text-center mb-8">
          <div className="w-16 h-16 bg-accent/15 text-accent border border-accent/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(204,255,0,0.2)]">
            <Swords className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-2 tracking-tight">Multiplayer Battles</h1>
          <p className="text-text-secondary text-sm font-medium">Challenge your friends in real-time estimation showdowns.</p>
        </div>

        <div className="w-full bg-surface p-6 sm:p-8 rounded-3xl border border-border shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-accent" />

          {error && (
            <div className="mb-6 p-3.5 bg-error/15 text-error rounded-xl text-xs font-mono font-bold border border-error/30 text-center">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-mono font-bold text-text-secondary uppercase tracking-widest mb-2">
              Number of Questions
            </label>
            <select 
              value={rounds} 
              onChange={(e) => setRounds(Number(e.target.value))}
              className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-sm font-mono font-bold text-text-primary focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
            >
              <option value={3}>3 Questions (Quick Match)</option>
              <option value={5}>5 Questions (Standard)</option>
              <option value={10}>10 Questions (Long Match)</option>
              <option value={20}>20 Questions (Marathon)</option>
            </select>
          </div>

          <button
            onClick={handleCreate}
            disabled={isCreating || isJoining}
            className="w-full py-4 rounded-xl font-mono font-black text-sm uppercase tracking-wider bg-accent text-[#090A0F] hover:bg-accent-hover shadow-[0_0_20px_rgba(204,255,0,0.25)] transition-all flex items-center justify-center gap-2 mb-6 disabled:opacity-50"
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5 stroke-[2.5]" />}
            Create Battle Room
          </button>

          <div className="relative flex items-center py-3 mb-3">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink-0 mx-4 text-text-muted text-[11px] font-mono font-bold uppercase tracking-wider">
              OR JOIN ROOM
            </span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              placeholder="Enter 4-letter code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={4}
              className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-center text-xl font-mono font-black uppercase text-white placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="submit"
              disabled={isJoining || isCreating || joinCode.length !== 4}
              className="w-full py-3.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider bg-surface text-text-primary border border-border hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Join Battle
            </button>
          </form>
        </div>
        
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </main>
    </div>
  );
}

