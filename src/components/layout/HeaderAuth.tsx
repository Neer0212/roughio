'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { AuthModal } from '@/components/auth/AuthModal';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export function HeaderAuth() {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <div className="flex items-center gap-4">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-text-secondary" />
        ) : user ? (
          <Link 
            href="/profile" 
            className="text-xs font-mono font-bold uppercase tracking-wider px-4 py-2 bg-surface text-text-primary border border-border rounded-xl hover:border-accent/50 hover:text-accent transition-colors"
          >
            Profile
          </Link>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="text-xs font-mono font-black uppercase tracking-wider px-4 py-2 bg-accent text-[#090A0F] rounded-xl hover:bg-accent-hover transition-all shadow-[0_0_15px_rgba(204,255,0,0.2)]"
          >
            Sign In
          </button>
        )}
      </div>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
}
