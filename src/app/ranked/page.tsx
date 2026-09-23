'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Target, Trophy, Clock, Play, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { BackButton } from '@/components/layout/BackButton';
import { createClient } from '@/lib/supabase/client';
import { AuthModal } from '@/components/auth/AuthModal';

export default function RankedDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  
  const [elo, setElo] = useState(1200);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (user) {
        // Fetch Elo
        const { data: profile } = await supabase.from('profiles').select('elo_rating').eq('id', user.id).single();
        if (profile) setElo(profile.elo_rating || 1200);
        
        // Check if played today
        const today = new Date().toISOString().split('T')[0];
        const { data: attempt } = await supabase.from('daily_attempts').select('id').eq('date', today).eq('user_id', user.id).maybeSingle();
        if (attempt) setHasPlayedToday(true);
      }
      
      // Fetch Daily Leaderboard
      const today = new Date().toISOString().split('T')[0];
      const { data: leaders } = await supabase
        .from('daily_attempts')
        .select('*, profiles(email)')
        .eq('date', today)
        .order('total_score', { ascending: false })
        .limit(10);
        
      if (leaders) setLeaderboard(leaders);
      setLoading(false);
    }
    
    fetchData();
  }, [user, supabase]);

  const handlePlay = () => {
    if (!user) return setShowAuthModal(true);
    router.push('/ranked/play');
  };

  const getRankTitle = (elo: number) => {
    if (elo >= 2000) return { title: 'Grandmaster', color: 'text-[#FFD700]' };
    if (elo >= 1600) return { title: 'Master', color: 'text-[#C0C0C0]' };
    if (elo >= 1400) return { title: 'Diamond', color: 'text-[#b9f2ff]' };
    if (elo >= 1200) return { title: 'Gold', color: 'text-[#FFD700]' };
    if (elo >= 1000) return { title: 'Silver', color: 'text-[#C0C0C0]' };
    return { title: 'Bronze', color: 'text-[#CD7F32]' };
  };

  const rank = getRankTitle(elo);

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 md:py-12">
        <BackButton />
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-accent/20 text-accent rounded-full flex items-center justify-center mx-auto mb-6">
          <Target className="w-10 h-10" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Ranked Mode</h1>
        <p className="text-text-secondary text-lg">The Daily Challenge. One shot. Global Elo.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Profile Card */}
        <div className="bg-surface rounded-3xl p-8 border border-border shadow-xl text-center relative overflow-hidden">
          <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-6">Your Rating</h2>
          <div className="text-6xl font-black font-mono mb-2">{elo}</div>
          <div className={`text-xl font-bold uppercase tracking-widest mb-8 ${rank.color}`}>{rank.title}</div>
          
          <button
            onClick={handlePlay}
            disabled={hasPlayedToday && !!user}
            className={`w-full py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_0_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-none ${
              hasPlayedToday && !!user
                ? 'bg-elevated text-text-secondary cursor-not-allowed shadow-[0_4px_0_var(--border)]'
                : 'bg-accent text-background shadow-[0_4px_0_rgb(10,135,95)] hover:brightness-110'
            }`}
          >
            {hasPlayedToday && !!user ? (
              <>
                <Clock className="w-6 h-6" /> Come back tomorrow
              </>
            ) : (
              <>
                <Play className="w-6 h-6 fill-current" /> Play Daily Challenge
              </>
            )}
          </button>
        </div>

        {/* Info Card */}
        <div className="bg-surface rounded-3xl p-8 border border-border shadow-xl flex flex-col justify-center">
          <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
            <AlertCircle className="text-accent" /> How it works
          </h3>
          <ul className="space-y-4 text-text-secondary">
            <li className="flex gap-3">
              <span className="font-bold text-accent">1.</span>
              <span>Everyone plays the exact same 3 questions each day.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-accent">2.</span>
              <span>You only get one attempt. No calculators, no hints.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-accent">3.</span>
              <span>Your Elo rating updates instantly based on your average accuracy factor.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-surface rounded-3xl p-8 border border-border shadow-xl">
        <h2 className="font-bold text-2xl mb-8 flex items-center gap-3">
          <Trophy className="text-accent" /> Today&apos;s Top Players
        </h2>
        
        {leaderboard.length === 0 ? (
          <div className="text-center text-text-secondary py-8">No one has completed the challenge today yet! Be the first.</div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, i) => (
              <div key={entry.id} className="flex items-center justify-between p-4 bg-elevated rounded-xl border border-border">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-[#FFD700] text-black' : i === 1 ? 'bg-[#C0C0C0] text-black' : i === 2 ? 'bg-[#CD7F32] text-black' : 'bg-surface'}`}>
                    {i + 1}
                  </div>
                  <span className="font-bold truncate max-w-[150px] sm:max-w-none">{entry.profiles?.email}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs text-text-secondary uppercase">Score</div>
                    <div className="font-mono font-bold">{entry.total_score}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-text-secondary uppercase">Elo Change</div>
                    <div className={`font-bold ${entry.elo_change > 0 ? 'text-success' : entry.elo_change < 0 ? 'text-destructive' : 'text-text-secondary'}`}>
                      {entry.elo_change > 0 ? '+' : ''}{entry.elo_change}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}

