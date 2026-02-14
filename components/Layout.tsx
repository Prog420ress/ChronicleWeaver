
import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col items-center bg-slate-950 text-slate-100 selection:bg-amber-500/30">
      <header className="w-full py-6 px-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-cinzel font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
            CHRONICLE WEAVER
          </h1>
          <div className="text-sm font-cinzel text-slate-400 tracking-widest uppercase">
            AI-Driven RPG Engine
          </div>
        </div>
      </header>
      <main className="w-full max-w-6xl flex-1 p-4 md:p-8">
        {children}
      </main>
      <footer className="w-full py-4 text-center text-slate-500 text-xs font-cinzel border-t border-slate-900">
        © {new Date().getFullYear()} Chronicle Weaver • Powered by Gemini AI
      </footer>
    </div>
  );
};
