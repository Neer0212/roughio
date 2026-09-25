import { BackButton } from '@/components/layout/BackButton';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { formatLarge } from '@/lib/utils/number-parser';
import { SCORE_COLORS, SCORE_LABELS } from '@/lib/constants/scoring';
import { AvatarSelect } from '@/components/profile/AvatarSelect';

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

  // Fetch advanced stats via RPC
  const { data: stats } = await supabase
    .rpc('get_user_statistics', { p_user_id: session.user.id });

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
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <BackButton />
      <div className="mb-10">
        <h1 className="text-3xl sm:text-5xl font-extrabold mb-2">Estimation Dashboard</h1>
        <p className="text-text-secondary text-lg">{session.user.email}</p>
      </div>

      {/* Core Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
          <p className="text-xs sm:text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">Total XP</p>
          <p className="text-3xl sm:text-4xl font-bold font-mono text-accent">{profile?.total_xp?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
          <p className="text-xs sm:text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">Level</p>
          <p className="text-3xl sm:text-4xl font-bold font-mono text-text-primary">{profile?.level || 1}</p>
        </div>
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
          <p className="text-xs sm:text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">Highest Streak</p>
          <p className="text-3xl sm:text-4xl font-bold font-mono text-success">{profile?.highest_streak || 0} 🔥</p>
        </div>
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
          <p className="text-xs sm:text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">Questions</p>
          <p className="text-3xl sm:text-4xl font-bold font-mono text-text-primary">{stats?.total_questions || 0}</p>
        </div>
      </div>

      {/* Advanced Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <div className="bg-elevated p-5 rounded-2xl border border-border/50">
          <p className="text-xs font-bold text-text-secondary uppercase mb-1">Average Factor</p>
          <p className="text-2xl font-bold font-mono">{stats?.avg_factor ? stats.avg_factor.toFixed(2) : '0.00'}x</p>
        </div>
        <div className="bg-elevated p-5 rounded-2xl border border-border/50">
          <p className="text-xs font-bold text-text-secondary uppercase mb-1">Best Estimate</p>
          <p className="text-2xl font-bold font-mono text-success">{stats?.best_factor ? stats.best_factor.toFixed(2) : '0.00'}x</p>
        </div>
        <div className="bg-elevated p-5 rounded-2xl border border-border/50">
          <p className="text-xs font-bold text-text-secondary uppercase mb-1">Under 2x (Excellent)</p>
          <p className="text-2xl font-bold font-mono">{stats?.under_2x_count || 0} <span className="text-sm font-normal text-text-secondary">({stats?.total_questions ? Math.round((stats.under_2x_count / stats.total_questions) * 100) : 0}%)</span></p>
        </div>
        <div className="bg-elevated p-5 rounded-2xl border border-border/50">
          <p className="text-xs font-bold text-text-secondary uppercase mb-1">Under 5x (Good)</p>
          <p className="text-2xl font-bold font-mono">{stats?.under_5x_count || 0} <span className="text-sm font-normal text-text-secondary">({stats?.total_questions ? Math.round((stats.under_5x_count / stats.total_questions) * 100) : 0}%)</span></p>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6">Recent Estimates</h2>
      <div className="space-y-4">
        {attempts?.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-2xl border border-border">
            <p className="text-text-secondary">You haven&apos;t made any estimates yet.</p>
          </div>
        ) : (
          attempts?.map((attempt: any) => (
            <div key={attempt.id} className="bg-surface p-5 rounded-2xl border border-border flex flex-col sm:flex-row gap-4 sm:items-center justify-between hover:bg-elevated transition-colors">
              <div className="flex-1">
                <p className="font-medium text-lg mb-1 line-clamp-1" title={attempt.questions?.text}>
                  {attempt.questions?.text}
                </p>
                <div className="flex items-center gap-3 text-sm text-text-secondary">
                  <span>Guess: <strong className="text-text-primary">{formatLarge(attempt.guess)}</strong></span>
                  <span>Actual: <strong className="text-text-primary">{formatLarge(attempt.actual)}</strong></span>
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
                  <p className="text-xs text-text-secondary font-mono">{attempt.factor.toFixed(2)}x off</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

