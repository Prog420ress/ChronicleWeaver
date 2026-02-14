
import React, { useState, useEffect, useRef } from 'react';
import { Scene } from '../types';

interface GameInterfaceProps {
  scene: Scene;
  onChoice: (choice: string) => void;
  isLoading: boolean;
}

export const GameInterface: React.FC<GameInterfaceProps> = ({ scene, onChoice, isLoading }) => {
  const [customAction, setCustomAction] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scene]);

  const handleSubmitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customAction.trim()) {
      onChoice(customAction);
      setCustomAction('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      {/* Visual Column */}
      <div className="sticky top-24 space-y-4">
        <div className="relative group overflow-hidden rounded-2xl border border-amber-500/20 shadow-2xl bg-slate-900 aspect-video">
          {scene.imageUrl ? (
            <img 
              src={scene.imageUrl} 
              alt="Scene visual" 
              className={`w-full h-full object-cover transition-all duration-1000 ${isLoading ? 'scale-110 blur-md opacity-50' : 'scale-100'}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
        </div>
        <div className="px-4 py-2 bg-slate-900/50 rounded-lg border border-slate-800">
           <p className="text-[10px] font-cinzel text-slate-500 tracking-tighter uppercase mb-1">Illustration Metadata</p>
           <p className="text-xs text-slate-400 italic">"{scene.imagePrompt}"</p>
        </div>
      </div>

      {/* Narrative Column */}
      <div className="space-y-8 pb-12">
        <div ref={scrollRef} className="animate-in fade-in duration-1000">
          <div className="prose prose-invert prose-lg max-w-none">
            {scene.description.split('\n').map((para, i) => (
              <p key={i} className="text-slate-200 leading-relaxed font-serif first-letter:text-4xl first-letter:font-cinzel first-letter:text-amber-500 first-letter:mr-2">
                {para}
              </p>
            ))}
          </div>
        </div>

        {scene.isEnding ? (
          <div className="bg-amber-900/20 border border-amber-500/50 p-8 rounded-2xl text-center space-y-4 animate-bounce-slow">
            <h3 className="text-3xl font-cinzel text-amber-500">The End</h3>
            <p className="text-slate-300">Your chronicle concludes here.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-cinzel rounded-full transition-all"
            >
              Begin a New Legend
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3">
              <p className="text-xs font-cinzel text-amber-500/50 tracking-[0.2em] mb-2">PROPOSED ACTIONS</p>
              {scene.choices.map((choice, i) => (
                <button
                  key={i}
                  disabled={isLoading}
                  onClick={() => onChoice(choice)}
                  className="group relative flex items-center text-left p-4 bg-slate-900/50 hover:bg-amber-900/20 border border-slate-800 hover:border-amber-500/50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  <span className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 group-hover:bg-amber-600 text-xs font-bold transition-colors mr-4">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-slate-300 group-hover:text-white font-medium">
                    {choice}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-xs font-cinzel text-slate-500 bg-slate-950 px-2">
                OR SHAPE YOUR OWN WILL
              </div>
            </div>

            <form onSubmit={handleSubmitCustom} className="flex gap-2">
              <input
                type="text"
                disabled={isLoading}
                placeholder="Type your own action..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-amber-500 outline-none transition-all disabled:opacity-50"
                value={customAction}
                onChange={(e) => setCustomAction(e.target.value)}
              />
              <button
                type="submit"
                disabled={isLoading || !customAction.trim()}
                className="bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 p-3 rounded-xl transition-all shadow-lg shadow-amber-900/20"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
