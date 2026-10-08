'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, Check } from 'lucide-react';
import { NumericInput } from '@/components/game/NumericInput';
import { parseNumber, formatLarge } from '@/lib/utils/number-parser';
import { useAuth } from '@/lib/hooks/useAuth';

export default function RankedPlay() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guesses, setGuesses] = useState<number[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      router.push('/ranked');
      return;
    }

    async function init() {
      try {
        const res = await fetch('/api/ranked/today');
        const data = await res.json();
        
        if (!res.ok || !data.challenge || !data.questions) throw new Error('Failed to load challenge');
        
        setQuestions(data.questions);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    
    init();
  }, [user, router]);

  const parsedGuess = parseNumber(currentInput);

  const handleNext = async () => {
    if (!parsedGuess.value) return;
    
    const newGuesses = [...guesses, parsedGuess.value];
    
    if (currentIndex < 2) {
      setGuesses(newGuesses);
      setCurrentIndex(currentIndex + 1);
      setCurrentInput('');
    } else {
      // Submit all
      setSubmitting(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch('/api/ranked/submit', {
          method: 'POST',
          body: JSON.stringify({ date: today, guesses: newGuesses })
        });
        const data = await res.json();
        if (res.ok) {
          setResult(data);
        } else {
          alert(data.error);
          router.push('/ranked');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-accent" /></div>;
  if (questions.length !== 3) return <div className="flex-1 text-center p-8">Error loading questions.</div>;

  if (result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-4xl mx-auto w-full py-8 md:py-12">
        <div className="bg-surface w-full rounded-[2.5rem] p-8 md:p-12 border border-border shadow-2xl text-center mb-10">
          <div className="w-20 h-20 bg-accent/20 text-accent rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-extrabold mb-2">Challenge Complete</h2>
          <p className="text-text-secondary mb-8">Your results have been locked in.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-elevated p-4 rounded-2xl border border-border">
              <div className="text-xs text-text-secondary uppercase font-bold mb-1">Total Score</div>
              <div className="text-2xl font-mono font-bold">{result.totalScore}</div>
            </div>
            <div className="bg-elevated p-4 rounded-2xl border border-border">
              <div className="text-xs text-text-secondary uppercase font-bold mb-1">Avg Factor</div>
              <div className="text-2xl font-mono font-bold">{result.avgFactor.toFixed(2)}x</div>
            </div>
          </div>
          
          <div className={`p-6 rounded-2xl border ${result.eloChange > 0 ? 'bg-success/10 border-success/30' : result.eloChange < 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-surface border-border'}`}>
            <div className="text-sm font-bold uppercase mb-2">Elo Rating Change</div>
            <div className="text-5xl font-black mb-2">
              {result.eloChange > 0 ? '+' : ''}{result.eloChange}
            </div>
            <div className="text-text-secondary font-medium">New Rating: <span className="text-text-primary font-bold">{result.newElo}</span></div>
          </div>
        </div>

        {/* Breakdown */}
        {result.results && result.results.length > 0 && (
          <div className="w-full space-y-4 mb-10">
            <h3 className="text-xl font-bold text-text-primary ml-2 mb-2 uppercase tracking-widest">Question Breakdown</h3>
            {result.results.map((r: any, i: number) => (
              <div key={r.id} className="bg-surface p-6 sm:p-8 rounded-[2rem] border border-border flex flex-col gap-5 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center flex-shrink-0 mt-1">
                    {i + 1}
                  </div>
                  <h4 className="text-lg sm:text-xl font-bold leading-tight">{r.text}</h4>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pl-0 sm:pl-14">
                  <div className="bg-elevated p-4 rounded-2xl border border-border">
                    <div className="text-xs text-text-secondary uppercase font-bold mb-1">Your Estimate</div>
                    <div className="font-mono font-bold text-lg truncate" title={`${formatLarge(r.guess)} ${r.unit}`}>
                      {formatLarge(r.guess)} <span className="text-sm opacity-50">{r.unit}</span>
                    </div>
                  </div>
                  <div className="bg-elevated p-4 rounded-2xl border border-border">
                    <div className="text-xs text-text-secondary uppercase font-bold mb-1">Actual Answer</div>
                    <div className="font-mono font-bold text-lg text-accent truncate" title={`${formatLarge(r.referenceAnswer)} ${r.unit}`}>
                      {formatLarge(r.referenceAnswer)} <span className="text-sm opacity-50">{r.unit}</span>
                    </div>
                  </div>
                  <div className="bg-elevated p-4 rounded-2xl border border-border col-span-2 sm:col-span-1">
                    <div className="text-xs text-text-secondary uppercase font-bold mb-1">Factor</div>
                    <div className="font-mono font-bold text-lg">{r.factor.toFixed(2)}x</div>
                    <div className="text-xs font-bold uppercase tracking-widest mt-1 opacity-70">{r.classification.replace(/_/g, ' ')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <button
          onClick={() => router.push('/ranked')}
          className="w-full max-w-sm mx-auto py-5 rounded-2xl font-bold text-xl bg-accent text-background shadow-[0_4px_0_rgb(10,135,95)] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const question = questions[currentIndex];

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-8 md:py-16">
      <div className="flex items-center justify-between mb-12">
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className={`w-12 h-2 rounded-full ${i < currentIndex ? 'bg-accent' : i === currentIndex ? 'bg-accent/50' : 'bg-elevated'}`} />
          ))}
        </div>
        <div className="text-sm font-bold text-text-secondary uppercase tracking-widest">
          Question {currentIndex + 1} of 3
        </div>
      </div>
      
      <div className="text-center space-y-6 mb-12">
        <h1 className="text-3xl md:text-5xl font-extrabold leading-tight text-text-primary drop-shadow-sm">
          {question.text}
        </h1>
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-elevated border border-border shadow-inner">
          <span className="text-text-secondary text-sm font-bold uppercase tracking-widest">Unit</span>
          <span className="font-mono font-bold text-accent text-lg">{question.unit}</span>
        </div>
      </div>
      
      <div className="max-w-xl mx-auto w-full space-y-6">
        <NumericInput
          value={currentInput}
          onChange={setCurrentInput}
          onSubmit={handleNext}
          disabled={submitting}
          error={parsedGuess.error}
          autoFocus
        />
        <button
          onClick={handleNext}
          disabled={!parsedGuess.value || submitting}
          className="w-full py-5 rounded-2xl font-bold text-xl bg-accent text-background shadow-[0_4px_0_rgb(10,135,95)] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : currentIndex === 2 ? 'Submit Challenge' : 'Next Question'}
          {!submitting && currentIndex !== 2 && <ArrowRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}

