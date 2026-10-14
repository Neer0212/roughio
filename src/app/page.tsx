import Link from "next/link";
import {
  ArrowRight,
  TrendingUp,
  Eye,
  Volume2,
  Grid,
  HelpCircle,
  Layers,
  Swords,
  Flame,
  Trophy,
  Zap,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { ARCADE_GAMES } from "@/lib/games/registry";

const GAME_ICONS: Record<string, any> = {
  fermi: TrendingUp,
  "color-recall": Eye,
  "sound-match": Volume2,
  "pattern-recall": Grid,
  "rare-answer": HelpCircle,
  "order-of-magnitude": Layers,
};

const COGNITIVE_PILLARS = [
  {
    tag: "Scale & Magnitude",
    title: "Napkin Math & Fermi Intuition",
    desc: "Calculate the uncalculable. Estimate total piano tuners, iPhone shipments, and cosmic distances using gut scaling.",
    accent: "text-fermi",
    border: "hover:border-fermi/40",
  },
  {
    tag: "Sensory Memory",
    title: "Chroma & Microtonal Ear",
    desc: "Memorize transient sensory stimuli. Reconstruct exact HSL shades and dial oscillators to cent-level pitch accuracy.",
    accent: "text-color-recall",
    border: "hover:border-color-recall/40",
  },
  {
    tag: "Recall & Depth",
    title: "Spatial Matrix & Obscure Trivia",
    desc: "Push working memory span on high-speed sequences and discover esoteric valid answers that score point bonuses.",
    accent: "text-sound-match",
    border: "hover:border-sound-match/40",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col selection:bg-accent selection:text-[#090A0F]">
      <Navbar />

      <main className="flex-1 w-full">
        {/* Retro Arcade Hero */}
        <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-border/60 bg-grid">
          {/* Ambient Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-accent/10 blur-[130px] rounded-full pointer-events-none -z-10" />
          <div className="absolute top-1/3 left-1/4 w-[350px] h-[250px] bg-fermi/10 blur-[140px] rounded-full pointer-events-none -z-10" />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            {/* Arcade Live Ticker Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-border shadow-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-text-secondary">
                Retro-Modern Cognitive Arcade · 6 Playable Arenas
              </span>
            </div>

            {/* Bold Gaming Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.04] mb-6">
              TEST YOUR GUT, <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-[#E5FF7F] to-emerald-400">
                MEMORY &amp; SCALE.
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-text-secondary max-w-2xl mx-auto font-medium mb-10 leading-relaxed">
              No multiple choice. No Googling. An indie arcade of raw numerical intuition, 
              color memorization, pitch matching, and pattern recall.
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/game/play"
                className="w-full sm:w-auto px-8 py-4 bg-accent text-[#090A0F] font-mono font-black text-sm uppercase tracking-wider rounded-xl hover:bg-accent-hover transition-all shadow-[0_0_25px_rgba(204,255,0,0.35)] flex items-center justify-center gap-2 group"
              >
                <span>Play Free Game</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/games"
                className="w-full sm:w-auto px-8 py-4 bg-surface text-text-primary hover:text-white font-mono font-bold text-sm uppercase tracking-wider rounded-xl border border-border hover:border-border-hover hover:bg-elevated transition-all flex items-center justify-center gap-2"
              >
                <span>Browse All 6 Games</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-accent/20 text-accent font-bold">
                  6/6
                </span>
              </Link>
            </div>

            {/* Arcade Mini Stats Strip */}
            <div className="mt-14 pt-8 border-t border-border/40 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-left sm:text-center">
              <div className="p-3">
                <div className="text-2xl sm:text-3xl font-mono font-black text-white">6 Modes</div>
                <div className="text-xs font-mono uppercase tracking-wider text-text-secondary mt-0.5">Fully Playable</div>
              </div>
              <div className="p-3">
                <div className="text-2xl sm:text-3xl font-mono font-black text-accent">Real-Time</div>
                <div className="text-xs font-mono uppercase tracking-wider text-text-secondary mt-0.5">Head-to-Head Battle</div>
              </div>
              <div className="p-3">
                <div className="text-2xl sm:text-3xl font-mono font-black text-white">Adaptive</div>
                <div className="text-xs font-mono uppercase tracking-wider text-text-secondary mt-0.5">Dynamic Difficulty</div>
              </div>
              <div className="p-3">
                <div className="text-2xl sm:text-3xl font-mono font-black text-sound-match">Pure Audio</div>
                <div className="text-xs font-mono uppercase tracking-wider text-text-secondary mt-0.5">Web Audio Synthesizer</div>
              </div>
            </div>
          </div>
        </section>

        {/* The 6 Arcade Arenas Grid (Game-First Section) */}
        <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-mono font-bold uppercase tracking-wider mb-2">
                <Zap className="w-3.5 h-3.5" />
                <span>The Arcade Selection</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                Six Cognitive Arenas
              </h2>
            </div>
            <Link
              href="/games"
              className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-accent hover:underline"
            >
              <span>View full arcade lobby</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ARCADE_GAMES.map((game) => {
              const Icon = GAME_ICONS[game.id] || Zap;
              return (
                <Link
                  key={game.id}
                  href={game.route}
                  className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-surface border border-border hover:border-border-hover hover:bg-elevated transition-all duration-300 hover:-translate-y-1 shadow-lg overflow-hidden"
                >
                  {/* Subtle Top Border Glow on Hover */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: game.accentColor }}
                  />

                  <div>
                    {/* Header: Icon & Category */}
                    <div className="flex items-center justify-between mb-5">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{
                          backgroundColor: `${game.accentColor}18`,
                          color: game.accentColor,
                          border: `1px solid ${game.accentColor}35`,
                        }}
                      >
                        <Icon className="w-6 h-6" />
                      </div>

                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-background border border-border text-text-secondary">
                        {game.category}
                      </span>
                    </div>

                    {/* Title & Tagline */}
                    <h3 className="text-2xl font-black text-text-primary group-hover:text-white transition-colors mb-2">
                      {game.name}
                    </h3>
                    <p className="text-sm text-text-secondary leading-relaxed mb-6 font-medium">
                      {game.tagline}
                    </p>

                    {/* Skill tags */}
                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {game.metrics.skills.map((skill) => (
                        <span
                          key={skill}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-background/80 text-text-secondary border border-border"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-4 border-t border-border flex items-center justify-between mt-auto">
                    <span className="text-xs font-mono text-text-muted">
                      {game.metrics.duration}
                    </span>
                    <span
                      className="text-xs font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1.5 group-hover:translate-x-1 transition-transform"
                      style={{ color: game.accentColor }}
                    >
                      <span>Play Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Cognitive Foundations Section */}
        <section className="py-16 bg-surface/50 border-y border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-accent mb-2 block">
                How Roughio Tests Your Brain
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                Designed for Raw Intuition, Not Rote Trivia
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {COGNITIVE_PILLARS.map((col, idx) => (
                <div
                  key={idx}
                  className={`p-6 rounded-2xl bg-surface border border-border ${col.border} transition-colors flex flex-col justify-between`}
                >
                  <div>
                    <span className={`text-[11px] font-mono font-bold uppercase tracking-wider block mb-3 ${col.accent}`}>
                      0{idx + 1} · {col.tag}
                    </span>
                    <h3 className="text-xl font-black text-text-primary mb-3">
                      {col.title}
                    </h3>
                    <p className="text-sm text-text-secondary leading-relaxed font-medium">
                      {col.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Competitive Modes Callout */}
        <section className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Battle Card */}
            <div className="p-8 sm:p-10 rounded-3xl bg-surface border border-border relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
              <div>
                <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center mb-6">
                  <Swords className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent mb-2 block">
                  Live Multiplayer
                </span>
                <h3 className="text-3xl font-black text-white mb-3">
                  Battle Your Friends
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed mb-8 font-medium">
                  Create a custom 4-character lobby code. Race against your friends in real-time rounds. 
                  Live opponent progress, sudden-death points, and match recaps.
                </p>
              </div>
              <Link
                href="/battle"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-accent text-[#090A0F] font-mono font-bold text-xs uppercase tracking-wider hover:bg-accent-hover transition-colors shadow-md w-full sm:w-auto"
              >
                <span>Create Battle Lobby</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Ranked Daily Card */}
            <div className="p-8 sm:p-10 rounded-3xl bg-surface border border-border relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-48 h-48 bg-warning/5 rounded-full blur-3xl pointer-events-none" />
              <div>
                <div className="w-12 h-12 rounded-2xl bg-warning/15 border border-warning/30 text-warning flex items-center justify-center mb-6">
                  <Flame className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-warning mb-2 block">
                  Daily Challenge &amp; Elo
                </span>
                <h3 className="text-3xl font-black text-white mb-3">
                  Ranked Ladder
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed mb-8 font-medium">
                  One official set of challenge questions per day. Lock in your predictions, 
                  protect your streak, climb Elo tiers, and secure your place on the global ranks.
                </p>
              </div>
              <Link
                href="/ranked"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-elevated border border-border text-white font-mono font-bold text-xs uppercase tracking-wider hover:border-warning hover:text-warning transition-colors w-full sm:w-auto"
              >
                <span>Enter Ranked Ladder</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Arcade Footer */}
      <footer className="border-t border-border bg-surface/60 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="font-black text-lg tracking-tight text-text-primary">ROUGHIO</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-accent/20 text-accent border border-accent/30">
                ARCADE
              </span>
            </div>
            <p className="text-xs text-text-muted font-mono">
              Numerical intuition, sensory memory, and mental scale.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono font-bold uppercase tracking-wider text-text-secondary">
            <Link href="/games" className="hover:text-accent transition-colors">Arcade</Link>
            <Link href="/game/play" className="hover:text-accent transition-colors">Fermi</Link>
            <Link href="/battle" className="hover:text-accent transition-colors">Battle</Link>
            <Link href="/ranked" className="hover:text-accent transition-colors">Ranked</Link>
            <Link href="/leaderboard" className="hover:text-accent transition-colors">Leaderboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
