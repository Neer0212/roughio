import Link from "next/link";
import { ArrowRight, Target, Brain, Trophy } from "lucide-react";

import { HeaderAuth } from "@/components/layout/HeaderAuth";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary selection:bg-accent/30 selection:text-text-primary">
      {/* Navigation */}
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border-4 border-accent flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-accent" />
          </div>
          <span className="font-bold text-xl tracking-tight">ROUGHIO</span>
        </div>
        <div className="flex items-center gap-8">
          <nav className="hidden md:flex gap-6 text-sm font-medium text-text-secondary">
            <Link href="/game/play" className="hover:text-text-primary transition-colors">Free Play</Link>
            <Link href="/ladder" className="hover:text-text-primary transition-colors">Campaign</Link>
            <Link href="/battle" className="hover:text-text-primary transition-colors flex items-center gap-1">Battle</Link>
            <Link href="/ranked" className="hover:text-accent font-bold text-accent transition-colors">Ranked</Link>
            <Link href="/leaderboard" className="hover:text-text-primary transition-colors">Leaderboard</Link>
          </nav>
          <HeaderAuth />
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <h1 className="text-6xl md:text-[5.5rem] leading-[1.05] font-extrabold tracking-tight mb-6 text-balance">
            How close can <span className="text-accent">you</span> get?
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-12 text-balance">
            You don&apos;t need to know the exact answer. You just need to get close. 
            An unlimited Fermi estimation game to test your intuition.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link 
              href="/ladder" 
              className="px-8 py-4 bg-accent text-background font-bold rounded-xl text-lg hover:bg-accent-dark transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              PLAY CAMPAIGN <ArrowRight size={20} />
            </Link>
            <Link 
              href="/game/play" 
              className="px-8 py-4 bg-transparent border border-border hover:bg-elevated text-text-primary font-bold rounded-xl text-lg transition-colors w-full sm:w-auto justify-center flex"
            >
              Free Play
            </Link>
          </div>

          {/* Game Preview Card */}
          <div className="max-w-3xl mx-auto bg-surface border border-border rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden text-left">
            <div className="absolute top-0 left-0 right-0 h-32 bg-accent/5 blur-[80px] pointer-events-none rounded-t-3xl" />
            <div className="relative z-10 flex flex-col items-center text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-6 border border-border px-3 py-1 rounded-full">Example</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-8 text-balance">How many basketballs can fit in a school bus?</h2>
              
              <div className="w-full max-w-md bg-elevated border border-border rounded-2xl p-6 mb-8 flex flex-col items-center">
                <span className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">Your Estimate</span>
                <span className="text-4xl font-mono font-bold text-text-primary">120,000</span>
              </div>
              
              <div className="flex items-center gap-4 text-accent">
                <Target size={32} />
                <span className="text-5xl font-mono font-bold tracking-tighter">× 1.5</span>
              </div>
              <span className="text-sm font-bold text-accent uppercase tracking-widest mt-2">Excellent</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
