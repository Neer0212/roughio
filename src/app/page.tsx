import Link from "next/link";
import { ArrowRight, Target, Brain, Trophy } from "lucide-react";

import { HeaderAuth } from "@/components/layout/HeaderAuth";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary overflow-hidden">
      {/* Navigation */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold text-lg">
            R
          </div>
          <span className="font-extrabold text-2xl tracking-tight hidden sm:block">roughio</span>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex gap-6 font-bold text-text-secondary">
            <Link href="/game/play" className="hover:text-text-primary transition-colors">Free Play</Link>
            <Link href="/ladder" className="hover:text-text-primary transition-colors">Campaign</Link>
            <Link href="/battle" className="hover:text-text-primary transition-colors">Multiplayer</Link>
            <Link href="/leaderboard" className="hover:text-text-primary transition-colors">Leaderboard</Link>
          </nav>
          <HeaderAuth />
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <section className="max-w-5xl mx-auto bg-accent text-white rounded-[3rem] p-12 md:p-20 text-center shadow-lg relative transform rotate-1 hover:rotate-0 transition-transform duration-500">
          <div className="flex justify-between items-center mb-16 text-white/90 font-bold uppercase tracking-widest text-sm">
            <span>Roughio</span>
            <span>No. 001</span>
          </div>
          
          <h1 className="text-6xl md:text-[6rem] leading-[1.05] font-black tracking-tight mb-4">
            Make a guess.
          </h1>
          <h2 className="text-5xl md:text-6xl font-bold text-warning italic mb-16 font-serif">
            educated
          </h2>
          
          <div className="text-white/80 font-bold mb-10 uppercase tracking-widest">
            Daily Challenge - {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          
          <div className="flex justify-center">
            <Link 
              href="/game/play" 
              className="px-10 py-5 bg-white text-accent font-black rounded-full text-lg hover:bg-gray-100 transition-colors shadow-md flex items-center gap-3 uppercase tracking-wider"
            >
              Play Today&apos;s <ArrowRight size={20} />
            </Link>
          </div>
        </section>

        {/* How to Play */}
        <section className="py-32 max-w-5xl mx-auto text-center">
          <h2 className="text-5xl font-black mb-24 relative inline-block">
            <span className="relative z-10">How to Play</span>
            <div className="absolute bottom-1 left-[-10px] right-[-10px] h-4 bg-warning/60 -z-10 transform -rotate-1" />
          </h2>
          
          <div className="grid md:grid-cols-2 gap-20 items-center text-left mb-32">
            <div>
              <h3 className="text-4xl font-black mb-6 relative inline-block">
                <span className="relative z-10">01. Make your best guess</span>
                <div className="absolute bottom-1 left-[-5px] right-[-5px] h-3 bg-warning/60 -z-10 transform -rotate-1" />
              </h3>
              <p className="text-xl text-text-secondary font-medium leading-relaxed">
                No Googling. Just napkin math, gut instinct, and a built-in calculator when you need it.
              </p>
            </div>
            
            <div className="bg-accent text-white rounded-[2rem] p-8 shadow-xl transform rotate-2 hover:rotate-0 transition-transform">
              <div className="flex justify-between items-center text-white/80 text-sm font-bold mb-6">
                <span>Q1 / 3</span>
                <span>Roughio</span>
              </div>
              <h4 className="text-3xl font-black mb-8 leading-tight">
                How many iPhones have been produced since the launch in 2007?
              </h4>
              <div className="border-b-2 border-white/50 pb-2 flex justify-between items-end mb-8">
                <span className="text-white/50 text-xl font-bold">your guess</span>
                <span className="text-xs uppercase tracking-widest font-bold">iPhones</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="w-12 h-12 rounded-full border-2 border-white/50 flex items-center justify-center opacity-50">
                  <span className="text-xl">🧮</span>
                </div>
                <div className="px-6 py-2 rounded-full border-2 border-white/50 text-sm font-bold tracking-widest uppercase">
                  Lock it in ↵
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
