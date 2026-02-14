
import React, { useState, useCallback } from 'react';
import { Layout } from './components/Layout';
import { StoryInput } from './components/StoryInput';
import { GameInterface } from './components/GameInterface';
import { GameState, Scene } from './types';
import { generateNextScene } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    originalStory: '',
    history: [],
    currentScene: null,
    status: 'IDLE',
  });

  const handleStartGame = useCallback(async (story: string) => {
    setGameState(prev => ({ ...prev, originalStory: story, status: 'STARTING' }));
    
    try {
      const initialScene = await generateNextScene(story, [], "The adventure begins.");
      setGameState(prev => ({
        ...prev,
        currentScene: initialScene,
        history: [{ role: 'model', text: initialScene.description }],
        status: 'PLAYING'
      }));
    } catch (error) {
      console.error("Failed to start game:", error);
      alert("The loom of destiny snapped. Please check your connection and try again.");
      setGameState(prev => ({ ...prev, status: 'IDLE' }));
    }
  }, []);

  const handleNextTurn = useCallback(async (action: string) => {
    if (!gameState.currentScene) return;

    setGameState(prev => ({ ...prev, status: 'LOADING_NEXT' }));

    try {
      const nextScene = await generateNextScene(
        gameState.originalStory,
        gameState.history,
        action
      );

      setGameState(prev => ({
        ...prev,
        currentScene: nextScene,
        history: [
          ...prev.history,
          { role: 'user' as const, text: action },
          { role: 'model' as const, text: nextScene.description }
        ],
        status: 'PLAYING'
      }));
    } catch (error) {
      console.error("Failed to fetch next scene:", error);
      alert("A tear in the narrative fabric occurred. Let's try that action again.");
      setGameState(prev => ({ ...prev, status: 'PLAYING' }));
    }
  }, [gameState.originalStory, gameState.history, gameState.currentScene]);

  return (
    <Layout>
      {gameState.status === 'IDLE' && (
        <StoryInput 
          onStart={handleStartGame} 
          isLoading={gameState.status === 'STARTING'} 
        />
      )}

      {gameState.status === 'STARTING' && (
        <div className="h-[60vh] flex flex-col items-center justify-center space-y-8 animate-pulse">
           <div className="w-24 h-24 border-8 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
           <p className="text-2xl font-cinzel text-amber-500 tracking-widest uppercase">Consulting the Oracle...</p>
        </div>
      )}

      {(gameState.status === 'PLAYING' || gameState.status === 'LOADING_NEXT') && gameState.currentScene && (
        <GameInterface 
          scene={gameState.currentScene} 
          onChoice={handleNextTurn} 
          isLoading={gameState.status === 'LOADING_NEXT'}
        />
      )}
    </Layout>
  );
};

export default App;
