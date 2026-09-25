'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Swords, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { AuthModal } from '@/components/auth/AuthModal';
import { createClient } from '@/lib/supabase/client';

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
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center mb-8">
        <div className="w-20 h-20 bg-accent/20 text-accent rounded-full flex items-center justify-center mx-auto mb-6">
          <Swords className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-extrabold mb-4">Fermi Battles</h1>
        <p className="text-text-secondary text-lg">Challenge your friends in real-time estimation showdowns.</p>
      </div>

      <div className="w-full max-w-md bg-surface p-8 rounded-3xl border border-border shadow-2xl">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-xl text-sm font-medium border border-destructive/20 text-center">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-bold text-text-secondary uppercase tracking-widest mb-2">Number of Questions</label>
          <select 
            value={rounds} 
            onChange={(e) => setRounds(Number(e.target.value))}
            className="w-full px-6 py-4 rounded-xl bg-elevated border-2 border-border text-lg font-bold focus:outline-none focus:border-accent transition-colors appearance-none"
            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
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
          className="w-full py-4 rounded-xl font-bold text-lg bg-accent text-background shadow-[0_4px_0_rgb(10,135,95)] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 mb-8 disabled:opacity-50"
        >
          {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-6 h-6" />}
          Create New Battle
        </button>

        <div className="relative flex items-center py-4 mb-4">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink-0 mx-4 text-text-secondary text-sm font-bold uppercase">OR JOIN MATCH</span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <input
            type="text"
            placeholder="Enter 4-letter code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={4}
            className="w-full px-6 py-4 rounded-xl bg-elevated border-2 border-border text-center text-2xl font-mono font-bold uppercase focus:outline-none focus:border-accent transition-colors"
          />
          <button
            type="submit"
            disabled={isJoining || isCreating || joinCode.length !== 4}
            className="w-full py-4 rounded-xl font-bold text-lg bg-surface text-text-primary border-2 border-border shadow-[0_4px_0_var(--border)] hover:text-accent hover:border-accent hover:shadow-[0_4px_0_var(--accent)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isJoining ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-6 h-6" />}
            Join Battle
          </button>
        </form>
      </div>
      
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}

