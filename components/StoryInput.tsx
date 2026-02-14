
import React, { useState } from 'react';
import { Character } from '../types'; 

interface StoryInputProps {
  onStart: (story: string) => void;
  isLoading: boolean;
  onLoadGame: () => void;
  hasSavedGame: boolean;
  character: Character | null; 
  onCreateCharacter: () => void; 
}

export const StoryInput: React.FC<StoryInputProps> = ({ onStart, isLoading, onLoadGame, hasSavedGame, character, onCreateCharacter }) => {
  const [text, setText] = useState('');

  const examples = [
    "A lonely knight guards the ruins of a floating sky kingdom.",
    "In a cyberpunk Tokyo, a detective discovers they are actually an AI.",
    "A group of survivors in a post-apocalyptic world discovers a portal to a prehistoric jungle."
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-cinzel text-amber-500">The Weaver's Loom</h2>
        <p className="text-slate-400 text-lg italic">
          "Provide the thread of your story. I shall weave the tapestry of your destiny."
        </p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-xl">
        <div className="flex justify-between items-center mb-4">
          <p className="block text-sm font-bold text-amber-500 font-cinzel">
            {character ? `Your Hero: ${character.name}` : 'No Hero Chosen Yet'}
          </p>
          <button
            onClick={onCreateCharacter}
            disabled={isLoading}
            className="px-4 py-2 text-xs bg-amber-800/30 hover:bg-amber-800/50 border border-amber-800/50 text-amber-400 rounded-full transition-colors font-cinzel"
            aria-label={character ? "Edit your character" : "Create a new character"}
          >
            {character ? "Edit Hero" : "Create Hero"}
          </button>
        </div>

        <label htmlFor="origin-story" className="block text-sm font-bold text-amber-500 mb-2 font-cinzel">
          The Origin Story
        </label>
        <textarea
          id="origin-story"
          className="w-full h-64 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none resize-none font-serif text-lg leading-relaxed"
          placeholder="Enter your story plot, world lore, or character description here, or leave blank for a random tale..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Enter your story plot, world lore, or character description"
        />
        
        <div className="mt-4 flex flex-wrap gap-2">
          {examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => setText(ex)}
              className="text-xs px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors border border-slate-700"
              aria-label={`Use example: ${ex.substring(0, 30)}`}
            >
              {ex.substring(0, 30)}...
            </button>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4">
          {hasSavedGame && (
            <button
              onClick={onLoadGame}
              disabled={isLoading}
              className="w-full py-4 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-cinzel font-bold text-xl rounded-xl transition-all shadow-lg shadow-slate-950/20 active:scale-[0.98]"
              aria-live="polite"
              aria-busy={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Loading Game...
                </div>
              ) : "CONTINUE JOURNEY"}
            </button>
          )}
          <button
            onClick={() => onStart(text)}
            disabled={isLoading} 
            className="w-full py-4 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-cinzel font-bold text-xl rounded-xl transition-all shadow-lg shadow-amber-900/20 active:scale-[0.98]"
            aria-live="polite"
            aria-busy={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Weaving Reality...
              </div>
            ) : "BEGIN A NEW JOURNEY"}
          </button>
        </div>
      </div>
    </div>
  );
};
