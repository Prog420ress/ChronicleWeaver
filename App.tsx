
import React, { useState, useCallback, useEffect } from 'react';
import { Layout } from './components/Layout';
import { StoryInput } from './components/StoryInput';
import { GameInterface } from './components/GameInterface';
import { GameState, Scene } from './types';
import { generateNextScene } from './services/geminiService';

const LOCAL_STORAGE_KEY = 'chronicleWeaverSaveGame';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    originalStory: '',
    history: [],
    currentScene: null,
    status: 'IDLE',
  });
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Check for saved game on component mount
  useEffect(() => {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
      setHasSavedGame(true);
    }
  }, []);

  const saveGame = useCallback(() => {
    if (!gameState.currentScene) {
      alert("No game in progress to save!");
      return;
    }
    setIsSaving(true);
    try {
      const saveObject = {
        originalStory: gameState.originalStory,
        history: gameState.history,
        currentScene: gameState.currentScene,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(saveObject));
      console.log('Game saved!');
      alert('Game Saved Successfully!');
    } catch (error) {
      console.error('Failed to save game:', error);
      alert('Failed to save game. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [gameState]);

  const loadGame = useCallback(() => {
    try {
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedData) {
        const loadedState = JSON.parse(savedData);
        setGameState({
          originalStory: loadedState.originalStory,
          history: loadedState.history,
          currentScene: loadedState.currentScene,
          status: 'PLAYING', // Set status to playing after loading
        });
        setHasSavedGame(true); // Keep true as game is loaded
        alert('Game Loaded Successfully!');
      } else {
        alert('No saved game found to load.');
        setHasSavedGame(false); // Ensure false if no data was found
      }
    } catch (error) {
      console.error('Failed to load game:', error);
      alert('Failed to load game. Save data might be corrupted. Starting a new game.');
      localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear potentially bad save
      setHasSavedGame(false);
      // Optionally reset gameState to IDLE or a clean starting state
      setGameState({
        originalStory: '',
        history: [],
        currentScene: null,
        status: 'IDLE',
      });
    }
  }, []);

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
          onLoadGame={loadGame}
          hasSavedGame={hasSavedGame}
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
          onSaveGame={saveGame}
          isSaving={isSaving}
        />
      )}
    </Layout>
  );
};

export default App;
