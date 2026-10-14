'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gamepad2, Menu, X, Trophy, Swords, Target, Flame } from 'lucide-react';
import { HeaderAuth } from './HeaderAuth';

const NAV_LINKS = [
  { href: '/games', label: 'Arcade', badge: '6 Games', highlight: true },
  { href: '/game/play', label: 'Fermi', icon: Target },
  { href: '/battle', label: 'Battle', icon: Swords },
  { href: '/ranked', label: 'Ranked', icon: Flame },
  { href: '/leaderboard', label: 'Ranks', icon: Trophy },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-accent text-[#090A0F] flex items-center justify-center font-black text-lg transition-transform group-hover:scale-105 shadow-[0_0_16px_rgba(204,255,0,0.25)]">
            <Gamepad2 className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl tracking-tight text-text-primary group-hover:text-white transition-colors">
              ROUGHIO
            </span>
            <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-accent leading-none -mt-0.5">
              Cognitive Arcade
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'text-accent bg-accent/10 border border-accent/30'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent'
                }`}
              >
                {link.badge && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                )}
                <span>{link.label}</span>
                {link.badge && (
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-md bg-accent/20 text-accent border border-accent/30">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          <HeaderAuth />

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface border border-border transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-surface px-4 py-4 space-y-2">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-colors ${
                  isActive
                    ? 'text-accent bg-accent/10 border border-accent/30'
                    : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent/20 text-accent border border-accent/30">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
