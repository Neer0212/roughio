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
            <Link href="/ladder" className="hover:text-accent text-accent font-bold transition-colors">Fermi Ladder</Link>
            <Link href="/leaderboard" className="hover:text-text-primary transition-colors">Leaderboard</Link>
          </nav>
          <HeaderAuth />
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            How close can <span className="text-accent">you</span> get?
          </h1>
          <p className="text-xl md:text-2xl text-text-secondary max-w-2xl mx-auto mb-12">
            You don't need to know the exact answer. You just need to get close. 
            An unlimited Fermi estimation game to test your intuition.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/ladder" 
              className="px-8 py-4 bg-accent hover:brightness-110 shadow-[0_4px_0_rgb(10,135,95)] active:translate-y-1 active:shadow-none text-background font-bold rounded-xl text-lg transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              PLAY CAMPAIGN <ArrowRight size={20} />
            </Link>
            <Link 
              href="/game/play" 
              className="px-8 py-4 bg-elevated hover:bg-border text-text-primary font-bold rounded-xl text-lg transition-transform hover:scale-105 w-full sm:w-auto justify-center flex"
            >
              Free Play
            </Link>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="how-it-works" className="bg-[#19191F] py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-[#22222B] flex items-center justify-center mb-6 text-[#B9A0FF]">
                  <Target size={32} />
                </div>
                <h3 className="text-xl font-bold mb-3">Estimate Anything</h3>
                <p className="text-[#9696A5]">From cups of coffee consumed to stars in the galaxy. Estimate quantities you never thought about.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-[#22222B] flex items-center justify-center mb-6 text-[#8CE6B0]">
                  <Brain size={32} />
                </div>
                <h3 className="text-xl font-bold mb-3">Learn to Reason</h3>
                <p className="text-[#9696A5]">Break down complex problems into simple assumptions. Learn how to arrive at a reasonable answer.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-[#22222B] flex items-center justify-center mb-6 text-[#FF8585]">
                  <Trophy size={32} />
                </div>
                <h3 className="text-xl font-bold mb-3">Compete & Climb</h3>
                <p className="text-[#9696A5]">Earn XP, unlock achievements, and see how your intuition stacks up against your friends.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
