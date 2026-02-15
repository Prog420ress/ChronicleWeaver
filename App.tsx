
import React, { useState, useCallback, useEffect } from 'react';
import { Layout } from './components/Layout';
import { StoryInput } from './components/StoryInput';
import { GameInterface } from './components/GameInterface';
import { CharacterCreator } from './components/CharacterCreator';
import { GameState, Scene, Character } from './types';
import { generateNextScene, generateCharacterFromImage, generateRandomStory, generateRandomCharacterDetails, generateRandomCharacterName } from './services/geminiService';

const LOCAL_STORAGE_KEY = 'chronicleWeaverSaveGame';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    originalStory: '',
    history: [],
    currentScene: null,
    status: 'IDLE',
    character: null,
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
        character: gameState.character,
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
          status: 'PLAYING',
          character: loadedState.character || null,
        });
        setHasSavedGame(true);
        alert('Game Loaded Successfully!');
      } else {
        alert('No saved game found to load.');
        setHasSavedGame(false);
      }
    } catch (error) {
      console.error('Failed to load game:', error);
      alert('Failed to load game. Save data might be corrupted. Starting a new game.');
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setHasSavedGame(false);
      setGameState({
        originalStory: '',
        history: [],
        currentScene: null,
        status: 'IDLE',
        character: null,
      });
    }
  }, []);

  // Function to handle character creation
  const handleCreateCharacter = useCallback((character: Character) => {
    setGameState(prev => ({
      ...prev,
      character: character,
      status: 'IDLE',
    }));
  }, []);

  // Function to generate character from image, passed to CharacterCreator
  const handleGenerateCharacterFromImage = useCallback(async (base64Data: string, mimeType: string): Promise<Character> => {
    return await generateCharacterFromImage(base64Data, mimeType);
  }, []);

  // Function to generate a random character name (generic, for when no image is uploaded)
  const handleGenerateRandomCharacterName = useCallback(async (): Promise<string> => {
    return await generateRandomCharacterName();
  }, []);

  const handleApiError = useCallback(async (error: any) => {
    // Check for resource exhausted error (HTTP 429)
    if (error?.error?.code === 429) {
      alert(
        `It looks like you've exceeded your API quota or need a paid API key for this feature.\n\n` +
        `Please select an API key from a paid GCP project. You can find more information about billing here: ai.google.dev/gemini-api/docs/billing`
      );
      // Prompt user to select a new key if the aistudio API is available
      if (window.aistudio && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
      }
      setGameState(prev => ({ ...prev, status: 'IDLE' })); // Reset to IDLE so user can try again
    } else {
      console.error("API call failed:", error);
      alert("A tear in the narrative fabric occurred. Please check your connection and try again.");
      setGameState(prev => ({ ...prev, status: 'IDLE' })); // Reset to IDLE for other errors
    }
  }, []);


  const handleStartGame = useCallback(async (story: string) => {
    setGameState(prev => ({ ...prev, status: 'STARTING' }));
    
    try {
      let finalStory = story.trim();
      if (!finalStory) {
        finalStory = await generateRandomStory();
      }

      let finalCharacter = gameState.character;
      if (!finalCharacter) {
        finalCharacter = await generateRandomCharacterDetails();
      }

      const initialScene = await generateNextScene(finalStory, [], "The adventure begins.", finalCharacter);
      setGameState(prev => ({
        ...prev,
        originalStory: finalStory, // Ensure story is saved if randomly generated
        character: finalCharacter, // Ensure character is saved if randomly generated
        currentScene: initialScene,
        history: [{ role: 'model', text: initialScene.description }],
        status: 'PLAYING'
      }));
    } catch (error) {
      await handleApiError(error); // Use the new error handler
    }
  }, [gameState.character, handleApiError]); // Depend on gameState.character as it might be null initially

  const handleNextTurn = useCallback(async (action: string) => {
    if (!gameState.currentScene) return;

    setGameState(prev => ({ ...prev, status: 'LOADING_NEXT' }));

    try {
      const nextScene = await generateNextScene(
        gameState.originalStory,
        gameState.history,
        action,
        gameState.character
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
      await handleApiError(error); // Use the new error handler
      if (gameState.currentScene) { // If there was a previous scene, allow user to retry
        setGameState(prev => ({ ...prev, status: 'PLAYING' }));
      }
    }
  }, [gameState.originalStory, gameState.history, gameState.currentScene, gameState.character, handleApiError]);

  return (
    <Layout>
      {gameState.status === 'IDLE' && (
        <StoryInput 
          onStart={handleStartGame} 
          isLoading={gameState.status === 'STARTING'} 
          onLoadGame={loadGame}
          hasSavedGame={hasSavedGame}
          character={gameState.character}
          onCreateCharacter={() => setGameState(prev => ({ ...prev, status: 'CHARACTER_CREATION' }))}
        />
      )}

      {gameState.status === 'CHARACTER_CREATION' && (
        <CharacterCreator
          onCharacterCreated={handleCreateCharacter}
          onCancel={() => setGameState(prev => ({ ...prev, status: 'IDLE' }))}
          onGenerateCharacter={handleGenerateCharacterFromImage}
          onGenerateRandomName={handleGenerateRandomCharacterName} // Pass the generic random name generation function
          initialCharacter={gameState.character}
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
          character={gameState.character}
        />
      )}
    </Layout>
  );
};

export default App;