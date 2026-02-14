
import React, { useState, useEffect } from 'react';
import { Character } from '../types';
import { generateCharacterNameFromImage } from '../services/geminiService'; // NEW: Import for image-based name generation

interface CharacterCreatorProps {
  onCharacterCreated: (character: Character) => void;
  onCancel: () => void;
  onGenerateCharacter: (base64Data: string, mimeType: string) => Promise<Character>;
  onGenerateRandomName: () => Promise<string>; // This will be the generic random name generator from App.tsx
  initialCharacter?: Character | null; // For editing existing character
}

export const CharacterCreator: React.FC<CharacterCreatorProps> = ({ onCharacterCreated, onCancel, onGenerateCharacter, onGenerateRandomName, initialCharacter }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(initialCharacter?.portraitImageUrl || null);
  const [selectedImageMimeType, setSelectedImageMimeType] = useState<string | null>(null);
  const [generatedCharacter, setGeneratedCharacter] = useState<Character | null>(initialCharacter || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRandomizingName, setIsRandomizingName] = useState(false);
  const [userEnteredName, setUserEnteredName] = useState(initialCharacter?.name || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCharacter) {
      setSelectedImage(initialCharacter.portraitImageUrl || null);
      setUserEnteredName(initialCharacter.name || '');
      // Attempt to extract MIME type from data URL if available
      if (initialCharacter.portraitImageUrl && initialCharacter.portraitImageUrl.startsWith('data:')) {
        const match = initialCharacter.portraitImageUrl.match(/^data:([^;]+);base64,/);
        if (match && match[1]) {
          setSelectedImageMimeType(match[1]);
        }
      }
    }
  }, [initialCharacter]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file.');
        return;
      }
      setError(null);
      setSelectedImageMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        setSelectedImage(reader.result as string);
        generateCharacter(base64Data, file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateCharacter = async (base64Data: string, mimeType: string) => {
    setIsGenerating(true);
    setError(null);
    setGeneratedCharacter(null); // Clear previous character while generating new one
    try {
      const character = await onGenerateCharacter(base64Data, mimeType);
      setGeneratedCharacter(character);
      // ONLY set userEnteredName if it's currently empty, otherwise respect user's input
      if (!userEnteredName.trim()) { 
        setUserEnteredName(character.name);
      }
    } catch (err) {
      console.error("Failed to generate character:", err);
      setError("Failed to generate character from image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle random name generation
  const handleRandomizeName = async () => {
    setIsRandomizingName(true);
    setError(null);
    try {
      let nameToSet: string;
      if (selectedImage && selectedImageMimeType) {
        // If an image is uploaded, generate name based on the image
        nameToSet = await generateCharacterNameFromImage(selectedImage.split(',')[1], selectedImageMimeType);
      } else {
        // If no image, use the generic random name generator from App.tsx
        nameToSet = await onGenerateRandomName();
      }
      setUserEnteredName(nameToSet);
    } catch (err) {
      console.error("Failed to generate random name:", err);
      setError("Failed to generate a random name. Please try again.");
    } finally {
      setIsRandomizingName(false);
    }
  };

  const handleConfirm = () => {
    if (generatedCharacter) {
      const characterToSave = {
        ...generatedCharacter,
        name: userEnteredName.trim() || generatedCharacter.name || 'Unnamed Hero' // Prioritize user's name
      };
      onCharacterCreated(characterToSave);
    }
  };

  const displayCharacterName = userEnteredName.trim() || generatedCharacter?.name || 'Unnamed Hero';

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-cinzel text-amber-500">Forge Your Hero</h2>
        <p className="text-slate-400 text-lg italic">
          "Upload a portrait, and the loom shall reveal your champion's fate."
        </p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-xl space-y-6">
        {error && <p className="text-red-500 text-center">{error}</p>}

        <div className="flex flex-col items-center space-y-4">
          <label 
            htmlFor="portrait-upload" 
            className="w-48 h-48 border-4 border-dashed border-amber-500/50 rounded-full flex items-center justify-center cursor-pointer hover:border-amber-500 transition-colors relative overflow-hidden bg-slate-950"
            aria-label="Upload character portrait"
          >
            {selectedImage && (
              <img src={selectedImage} alt="Character Portrait Preview" className="absolute inset-0 w-full h-full object-cover" />
            )}
            {!selectedImage && !isGenerating && (
              <div className="text-slate-400 text-center flex flex-col items-center">
                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                <span>Upload Image</span>
              </div>
            )}
            {isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm text-amber-400">
                <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-2" />
                <p className="text-sm">Weaving character...</p>
              </div>
            )}
            <input
              id="portrait-upload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              disabled={isGenerating}
            />
          </label>
          <p className="text-slate-500 text-sm">Recommended: Clear face portrait for best results.</p>
        </div>

        {/* Character Name Input */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <label htmlFor="char-name" className="block text-sm font-bold text-amber-500 font-cinzel">
            Character Name (Optional)
          </label>
          <div className="flex gap-2">
            <input
              id="char-name"
              type="text"
              value={userEnteredName}
              onChange={(e) => setUserEnteredName(e.target.value)}
              placeholder="Leave blank for AI-generated or randomize"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:ring-2 focus:ring-amber-500 outline-none"
              disabled={isGenerating || isRandomizingName}
            />
            <button
              type="button"
              onClick={handleRandomizeName}
              disabled={isGenerating || isRandomizingName}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-cinzel text-sm rounded-xl transition-all flex items-center gap-2"
              aria-label="Randomize character name"
            >
              {isRandomizingName ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2.188m0 0H15" />
                </svg>
              )}
              Randomize
            </button>
          </div>
        </div>

        {generatedCharacter && !isGenerating && (
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xl font-cinzel text-amber-400 text-center">{displayCharacterName}</h3>
            <p className="text-slate-300 text-sm italic text-center">
              "{generatedCharacter.appearanceDescription}"
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-slate-400">
              <p><strong>Strength:</strong> <span className="text-amber-300">{generatedCharacter.strength}</span></p>
              <p><strong>Dexterity:</strong> <span className="text-amber-300">{generatedCharacter.dexterity}</span></p>
              <p><strong>Intelligence:</strong> <span className="text-amber-300">{generatedCharacter.intelligence}</span></p>
              <p><strong>Charisma:</strong> <span className="text-amber-300">{generatedCharacter.charisma}</span></p>
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-cinzel font-bold text-lg rounded-xl transition-all shadow-lg shadow-slate-950/20 active:scale-[0.98]"
            disabled={isGenerating || isRandomizingName}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-cinzel font-bold text-lg rounded-xl transition-all shadow-lg shadow-amber-900/20 active:scale-[0.98]"
            disabled={!generatedCharacter || isGenerating || isRandomizingName}
          >
            Confirm Hero
          </button>
        </div>
      </div>
    </div>
  );
};
