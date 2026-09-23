import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { formatLarge } from '@/lib/utils/number-parser';
import { SCORE_COLORS, SCORE_LABELS } from '@/lib/constants/scoring';

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/game/play');
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  // Fetch attempts history
  const { data: attempts } = await supabase
    .from('attempts')
    .select(`
      *,
      questions (
        text,
        unit
      )
    `)
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Your Profile</h1>
        <p className="text-[rgb(var(--muted-foreground))]">{session.user.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-[rgb(var(--secondary))] p-6 rounded-2xl border border-[rgb(var(--border))]">
          <p className="text-sm font-medium text-[rgb(var(--muted-foreground))] uppercase tracking-wider mb-2">Total XP</p>
          <p className="text-4xl font-bold font-mono text-[rgb(var(--primary))]">{profile?.total_xp || 0}</p>
        </div>
        <div className="bg-[rgb(var(--secondary))] p-6 rounded-2xl border border-[rgb(var(--border))]">
          <p className="text-sm font-medium text-[rgb(var(--muted-foreground))] uppercase tracking-wider mb-2">Level</p>
          <p className="text-4xl font-bold font-mono text-[rgb(var(--foreground))]">{profile?.level || 1}</p>
        </div>
        <div className="bg-[rgb(var(--secondary))] p-6 rounded-2xl border border-[rgb(var(--border))]">
          <p className="text-sm font-medium text-[rgb(var(--muted-foreground))] uppercase tracking-wider mb-2">Highest Streak</p>
          <p className="text-4xl font-bold font-mono text-[rgb(var(--success))]">{profile?.highest_streak || 0} 🔥</p>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6">Recent Estimates</h2>
      <div className="space-y-4">
        {attempts?.length === 0 ? (
          <div className="text-center py-12 bg-[rgb(var(--secondary))] rounded-2xl border border-[rgb(var(--border))]">
            <p className="text-[rgb(var(--muted-foreground))]">You haven't made any estimates yet.</p>
          </div>
        ) : (
          attempts?.map((attempt: any) => (
            <div key={attempt.id} className="bg-[rgb(var(--secondary))] p-5 rounded-2xl border border-[rgb(var(--border))] flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-lg mb-1 line-clamp-1" title={attempt.questions?.text}>
                  {attempt.questions?.text}
                </p>
                <div className="flex items-center gap-3 text-sm text-[rgb(var(--muted-foreground))]">
                  <span>Guess: <strong className="text-[rgb(var(--foreground))]">{formatLarge(attempt.guess)}</strong></span>
                  <span>Actual: <strong className="text-[rgb(var(--foreground))]">{formatLarge(attempt.actual)}</strong></span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span 
                    className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-1"
                    style={{ backgroundColor: `${SCORE_COLORS[attempt.score_classification as keyof typeof SCORE_COLORS]}20`, color: SCORE_COLORS[attempt.score_classification as keyof typeof SCORE_COLORS] }}
                  >
                    {SCORE_LABELS[attempt.score_classification as keyof typeof SCORE_LABELS]}
                  </span>
                  <p className="text-xs text-[rgb(var(--muted-foreground))] font-mono">{attempt.factor.toFixed(2)}x off</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
