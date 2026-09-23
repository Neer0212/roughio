import { BackButton } from '@/components/layout/BackButton';
import { createClient } from '@/lib/supabase/server';
import { LADDER_STAGES } from '@/lib/constants/ladder';
import { Lock, Play, Trophy } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Fermi Ladder | Roughio',
  description: 'Climb the Fermi Ladder and prove your estimation skills across increasingly difficult stages.',
};

export default async function LadderPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  let currentLevel = 1;
  
  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('level')
      .eq('id', session.user.id)
      .single();
      
    if (profile) {
      currentLevel = profile.level;
    }
  }

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <BackButton />
      <div className="text-center mb-16">
        <h1 className="text-4xl sm:text-6xl font-extrabold mb-4 tracking-tight">The Fermi Ladder</h1>
        <p className="text-lg text-text-secondary max-w-2xl mx-auto">
          Progress through increasingly difficult stages. Master everyday estimates to unlock the true scale of the universe.
        </p>
        {!session && (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 text-accent font-medium">
            <span>You are playing as a Guest (Level 1). Sign in to save progress and unlock higher stages!</span>
          </div>
        )}
      </div>

      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-10 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-accent before:via-accent/50 before:to-border">
        {LADDER_STAGES.map((stage, index) => {
          const isUnlocked = currentLevel >= stage.levelRequired;
          const isNextToUnlock = !isUnlocked && currentLevel < stage.levelRequired && (index === 0 || currentLevel >= LADDER_STAGES[index-1].levelRequired);
          
          return (
            <div key={stage.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              {/* Timeline dot */}
              <div className={`flex items-center justify-center w-20 h-20 rounded-full border-4 shadow-xl bg-surface absolute left-0 md:left-1/2 -translate-y-1/2 -translate-x-1/2 z-10 ${isUnlocked ? 'border-accent text-accent' : 'border-border text-text-secondary'}`}>
                {isUnlocked ? <span className="text-3xl">{stage.icon}</span> : <Lock className="w-8 h-8" />}
              </div>

              {/* Card */}
              <div className="w-full pl-24 md:pl-0 md:w-5/12 ml-auto md:ml-0 md:mr-auto md:odd:ml-auto md:odd:mr-0 transition-all duration-300 hover:-translate-y-1">
                <div className={`p-6 sm:p-8 rounded-[2rem] border-2 shadow-2xl relative overflow-hidden ${
                  isUnlocked 
                    ? 'bg-surface border-border hover:border-accent/50' 
                    : isNextToUnlock 
                      ? 'bg-elevated border-border' 
                      : 'bg-elevated/50 border-transparent opacity-60 grayscale'
                }`}>
                  
                  {isUnlocked && (
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                      <span className="text-8xl">{stage.icon}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-2xl font-bold ${isUnlocked ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {stage.name}
                    </h3>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${isUnlocked ? 'bg-accent/20 text-accent' : 'bg-surface text-text-secondary'}`}>
                      Level {stage.levelRequired}
                    </div>
                  </div>
                  
                  <p className={`mb-8 ${isUnlocked ? 'text-text-secondary' : 'text-text-secondary/60'}`}>
                    {stage.description}
                  </p>

                  {isUnlocked ? (
                    <Link
                      href={`/game/play?stage=${stage.id}`}
                      className="inline-flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold text-lg bg-accent text-background shadow-[0_4px_0_rgb(10,135,95)] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      Play Stage
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="inline-flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold text-lg bg-surface text-text-secondary border-2 border-border cursor-not-allowed"
                    >
                      <Lock className="w-5 h-5" />
                      Locked (Requires Lvl {stage.levelRequired})
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* End Trophy */}
      <div className="relative flex justify-start md:justify-center mt-12">
        <div className="flex items-center justify-center w-20 h-20 rounded-full border-4 border-border bg-elevated text-text-secondary absolute left-0 md:left-1/2 -translate-y-1/2 -translate-x-1/2 z-10 shadow-xl">
          <Trophy className="w-8 h-8" />
        </div>
      </div>
    </div>
  );
}

