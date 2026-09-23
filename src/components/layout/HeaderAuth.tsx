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
          <Loader2 className="w-5 h-5 animate-spin text-text-secondary" />
        ) : user ? (
          <Link 
            href="/profile" 
            className="text-sm font-bold px-5 py-2.5 bg-elevated text-text-primary rounded-full hover:bg-border transition-colors"
          >
            Profile
          </Link>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="text-sm font-bold px-5 py-2.5 bg-accent text-background rounded-full hover:bg-accent/90 transition-colors"
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
