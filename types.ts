
export interface Character {
  name: string;
  appearanceDescription: string;
  strength: number;
  dexterity: number;
  intelligence: number;
  charisma: number;
  portraitImageUrl?: string; // NEW: To store the Base64 image
}

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
  status: 'IDLE' | 'CHARACTER_CREATION' | 'STARTING' | 'PLAYING' | 'LOADING_NEXT';
  character: Character | null;
}

export interface AIResponse {
  sceneDescription: string;
  imagePrompt: string;
  suggestedChoices: string[];
  isEnding: boolean;
}
