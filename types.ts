
export interface Scene {
  id: string;
  description: string;
  imagePrompt: string;
  imageUrl?: string;
  choices: string[];
  isEnding: boolean;
}

export interface GameState {
  originalStory: string;
  history: Array<{ role: 'user' | 'model', text: string }>;
  currentScene: Scene | null;
  status: 'IDLE' | 'STARTING' | 'PLAYING' | 'LOADING_NEXT';
}

export interface AIResponse {
  sceneDescription: string;
  imagePrompt: string;
  suggestedChoices: string[];
  isEnding: boolean;
}
