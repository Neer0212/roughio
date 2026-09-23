import { createClient } from '@/lib/supabase/server';
import { Trophy, Medal, Star } from 'lucide-react';
import { getLevelProgress } from '@/lib/utils/leveling';
import { BackButton } from '@/components/layout/BackButton';

export const revalidate = 60; // Cache for 60 seconds

export default async function LeaderboardPage() {
  const supabase = createClient();
  
  // Fetch top 100 profiles ordered by total_xp
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, total_xp, highest_streak, level')
    .order('total_xp', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching leaderboard:', error);
  }

  // To mask full emails for privacy
  const maskEmail = (email: string) => {
    const [name, domain] = email.split('@');
    if (!name || !domain) return email;
    return `${name.substring(0, 3)}***@${domain}`;
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <BackButton />
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-elevated text-accent mb-4">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">Global Leaderboard</h1>
        <p className="text-lg text-text-secondary">The most accurate estimators in the world.</p>
      </div>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-elevated/50 border-b border-border">
                <th className="px-6 py-4 text-sm font-bold text-text-secondary uppercase tracking-wider w-20 text-center">Rank</th>
                <th className="px-6 py-4 text-sm font-bold text-text-secondary uppercase tracking-wider">Estimator</th>
                <th className="px-6 py-4 text-sm font-bold text-text-secondary uppercase tracking-wider text-center">Level</th>
                <th className="px-6 py-4 text-sm font-bold text-text-secondary uppercase tracking-wider text-right">Total XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profiles?.map((profile, index) => {
                const rank = index + 1;
                const isTop3 = rank <= 3;
                
                return (
                  <tr 
                    key={profile.id} 
                    className="hover:bg-elevated/30 transition-colors group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {rank === 1 ? <Medal className="w-6 h-6 text-warning mx-auto" /> :
                       rank === 2 ? <Medal className="w-6 h-6 text-slate-300 mx-auto" /> :
                       rank === 3 ? <Medal className="w-6 h-6 text-amber-600 mx-auto" /> :
                       <span className="text-text-secondary font-bold font-mono">{rank}</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isTop3 ? 'bg-accent/20 text-accent' : 'bg-elevated text-text-secondary'}`}>
                          {profile.email.charAt(0).toUpperCase()}
                        </div>
                        <span className={`font-medium ${isTop3 ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary transition-colors'}`}>
                          {maskEmail(profile.email)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border">
                        <Star className="w-3.5 h-3.5 text-accent" />
                        <span className="font-bold font-mono text-sm">{profile.level || getLevelProgress(profile.total_xp).level}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-bold text-accent">
                      {profile.total_xp.toLocaleString()} XP
                    </td>
                  </tr>
                );
              })}
              
              {(!profiles || profiles.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-text-secondary">
                    No estimators found. Be the first to play!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

