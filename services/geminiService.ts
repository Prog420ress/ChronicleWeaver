
import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse, Scene, Character } from "../types";

// Removed top-level GoogleGenAI instantiation
// const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTION = `
You are an expert Dungeon Master and Storyteller. 
The user will provide an "Original Story" which serves as the foundation, lore, and tone of the world.
Your job is to guide the user through a text-based RPG based on this story.
IMPORTANT RULES:
1. Stay faithful to the original story's themes, but allow the player to "stray" from the original plot.
2. React logically to user actions. If they do something unexpected, adapt the world consequences.
3. Every response must be in JSON format.
4. Provide 3-4 distinct choices for the player, plus allow for custom input.
5. Provide a detailed "imagePrompt" for a high-quality fantasy/RPG illustration based on the current scene.
6. Track if the player has reached a natural conclusion (isEnding).
`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    sceneDescription: {
      type: Type.STRING,
      description: "A 2-4 paragraph description of the current situation and surroundings."
    },
    imagePrompt: {
      type: Type.STRING,
      description: "A descriptive prompt for an AI image generator (e.g., 'A dark forest with glowing blue mushrooms, cinematic lighting, oil painting style')."
    },
    suggestedChoices: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3-4 concise action choices for the player."
    },
    isEnding: {
      type: Type.BOOLEAN,
      description: "True if the story has reached a definitive end."
    }
  },
  required: ["sceneDescription", "imagePrompt", "suggestedChoices", "isEnding"]
};

// NEW: Schema for character generation from image
const CHARACTER_GENERATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "A creative fantasy character name." },
    appearanceDescription: { type: Type.STRING, description: "A detailed description of the character's appearance and inferred personality based on the image." },
    strength: { type: Type.INTEGER, description: "Character's strength stat (1-5)." },
    dexterity: { type: Type.INTEGER, description: "Character's dexterity stat (1-5)." },
    intelligence: { type: Type.INTEGER, description: "Character's intelligence stat (1-5)." },
    charisma: { type: Type.INTEGER, description: "Character's charisma stat (1-5)." },
  },
  required: ["name", "appearanceDescription", "strength", "dexterity", "intelligence", "charisma"]
};

export async function generateNextScene(
  originalStory: string,
  history: Array<{ role: 'user' | 'model', text: string }>,
  userInput: string,
  character: Character | null // NEW: Accept Character object
): Promise<Scene> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' }); // Instantiated here
  const model = 'gemini-3-pro-preview';
  
  // NEW: Add character details to the initial prompt if available
  const characterContext = character ? 
    `Player Character:
    Name: ${character.name}
    Appearance: ${character.appearanceDescription}
    Stats: Strength ${character.strength}, Dexterity ${character.dexterity}, Intelligence ${character.intelligence}, Charisma ${character.charisma}${character.portraitImageUrl ? ` (Portrait: Player sees this image)` : ''}\n\n` : '';

  const contents = [
    { role: 'user' as const, parts: [{ text: `Original Story Context:\n${originalStory}\n\n${characterContext}` }] },
    ...history.map(h => ({ role: h.role as any, parts: [{ text: h.text }] })),
    { role: 'user' as const, parts: [{ text: `Player Action: ${userInput}` }] }
  ];

  const result = await ai.models.generateContent({
    model,
    contents: { parts: contents.flatMap(c => c.parts) },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA
    }
  });

  const data: AIResponse = JSON.parse(result.text || '{}');
  
  // Now generate the image
  const imageUrl = await generateSceneImage(data.imagePrompt);

  return {
    id: Math.random().toString(36).substr(2, 9),
    description: data.sceneDescription,
    imagePrompt: data.imagePrompt,
    imageUrl: imageUrl,
    choices: data.suggestedChoices,
    isEnding: data.isEnding
  };
}

async function generateSceneImage(prompt: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' }); // Instantiated here
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `16-bit pixel art style, Digital RPG illustration, high fantasy, cinematic composition: ${prompt}` }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Image generation failed:", error);
  }
  return `https://picsum.photos/seed/${Math.random()}/1200/675`;
}

// NEW: Function to generate character from image
export async function generateCharacterFromImage(
  base64ImageData: string,
  mimeType: string
): Promise<Character> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' }); // Instantiated here
  const model = 'gemini-3-pro-preview'; // Or gemini-2.5-flash-image if preferred
  const STAT_POINTS_TOTAL = 10;
  const STAT_MIN = 1;
  const STAT_MAX = 5;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            data: base64ImageData,
            mimeType: mimeType,
          },
        },
        {
          text: `16-bit pixel art style. Analyze the provided image and generate a detailed fantasy RPG character profile.
                 Include a creative name, a descriptive appearance, and assign starting stats
                 (Strength, Dexterity, Intelligence, Charisma). Each stat must be between ${STAT_MIN} and ${STAT_MAX} (inclusive).
                 The total sum of all four stats must be exactly ${STAT_POINTS_TOTAL}.
                 The stats should logically reflect the character's visual traits.
                 Provide the output in JSON format.`
        } 
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: CHARACTER_GENERATION_SCHEMA,
    },
  });

  const generatedData: Character = JSON.parse(response.text || '{}');

  // Post-processing to ensure stat constraints are met
  let { strength, dexterity, intelligence, charisma } = generatedData;

  // Ensure min/max for each stat
  strength = Math.max(STAT_MIN, Math.min(STAT_MAX, strength));
  dexterity = Math.max(STAT_MIN, Math.min(STAT_MAX, dexterity));
  intelligence = Math.max(STAT_MIN, Math.min(STAT_MAX, intelligence));
  charisma = Math.max(STAT_MIN, Math.min(STAT_MAX, charisma));

  let currentTotal = strength + dexterity + intelligence + charisma;
  let remainingPoints = STAT_POINTS_TOTAL - currentTotal;

  // Adjust to reach exactly STAT_POINTS_TOTAL
  // Prioritize adding to stats that are not maxed, or subtracting from stats not at min
  const stats = [
    { name: 'strength', value: strength, setter: (v: number) => strength = v },
    { name: 'dexterity', value: dexterity, setter: (v: number) => dexterity = v },
    { name: 'intelligence', value: intelligence, setter: (v: number) => intelligence = v },
    { name: 'charisma', value: charisma, setter: (v: number) => charisma = v },
  ];

  while (remainingPoints !== 0) {
    let changed = false;
    for (const stat of stats) {
      if (remainingPoints > 0 && stat.value < STAT_MAX) {
        stat.setter(stat.value + 1);
        stat.value++; // Update internal value for next iteration
        remainingPoints--;
        changed = true;
        if (remainingPoints === 0) break;
      } else if (remainingPoints < 0 && stat.value > STAT_MIN) {
        stat.setter(stat.value - 1);
        stat.value--; // Update internal value for next iteration
        remainingPoints++;
        changed = true;
        if (remainingPoints === 0) break;
      }
    }
    // If no stat could be changed (all maxed/minned, but total still off),
    // this means initial values were impossible to normalize within constraints.
    // In a real app, this might indicate an error or require a more complex distribution logic.
    // For now, we'll break to prevent infinite loop and rely on the clamped values.
    if (!changed && remainingPoints !== 0) {
        console.warn("Could not perfectly normalize stats within min/max constraints and total points.");
        break;
    }
  }

  return {
    ...generatedData,
    name: generatedData.name,
    appearanceDescription: generatedData.appearanceDescription,
    strength,
    dexterity,
    intelligence,
    charisma,
    portraitImageUrl: `data:${mimeType};base64,${base64ImageData}` // Store the original image
  };
}

// NEW: Function to generate a random character name
export async function generateRandomCharacterName(): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' }); // Instantiated here
  const model = 'gemini-3-flash-preview';
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          text: `Generate a single, creative fantasy character name. Just the name, no extra text. Example: "Elara"`
        } 
      ],
    },
    config: {
      temperature: 0.9,
      topK: 64,
      topP: 0.95,
      maxOutputTokens: 20, // Keep the response concise
    },
  });
  return response.text?.trim() || 'Unnamed Hero';
}

// NEW: Function to generate an image-based character name
export async function generateCharacterNameFromImage(base64ImageData: string, mimeType: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' }); // Instantiated here
  const model = 'gemini-3-pro-preview'; // Better reasoning for multimodal
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            data: base64ImageData,
            mimeType: mimeType,
          },
        },
        {
          text: `Analyze the provided image of a character. Based on their appearance and overall vibe, suggest a unique, fitting, and clever fantasy character name. Just the name, no extra text, no descriptions. Example: "Kaelen Stonehand"`
        }
      ],
    },
    config: {
      temperature: 0.9,
      topK: 64,
      topP: 0.95,
      maxOutputTokens: 30, // Keep the response concise
    },
  });
  return response.text?.trim() || 'Mysterious Stranger';
}

// NEW: Function to generate a random story
export async function generateRandomStory(): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' }); // Instantiated here
  const model = 'gemini-3-flash-preview';
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [{
        text: `Generate a captivating, brief fantasy RPG origin story (2-3 sentences). Focus on setting the scene for an adventure. Just the story, no extra text, no choices, no titles.`
      }] 
    },
    config: {
      temperature: 0.9,
      topK: 64,
      topP: 0.95,
      maxOutputTokens: 150, // Keep the response concise
    },
  });
  return response.text?.trim() || "An ancient evil stirs in the Whispering Woods, calling upon a lone hero to embark on a perilous quest. Destiny awaits!";
}

// NEW: Function to generate a random character portrait
export async function generateRandomCharacterPortrait(): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' }); // Instantiated here
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `16-bit pixel art style. Digital RPG portrait of a generic fantasy hero, random race (e.g., human, elf, dwarf, orc), random class (e.g., warrior, rogue, mage), simple background. Focus on a clear facial expression, neutral pose, 1:1 aspect ratio. Clear lighting.` }]
      }, 
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        // Assume default mimeType for randomly generated images if not explicitly specified by user upload.
        return `data:image/png;base64,${part.inlineData.data}`; 
      }
    }
  } catch (error) {
    console.error("Random character portrait generation failed:", error);
  }
  // Fallback to a placeholder image
  return `https://picsum.photos/seed/${Math.random()}/200/200`; // A generic placeholder
}


// NEW: Function to generate a random character's details (name, description, stats)
export async function generateRandomCharacterDetails(): Promise<Character> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' }); // Instantiated here
  const model = 'gemini-3-pro-preview';
  const STAT_POINTS_TOTAL = 10;
  const STAT_MIN = 1;
  const STAT_MAX = 5;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          text: `Generate a detailed fantasy RPG character profile: a creative name, a brief appearance description (1-2 sentences), and assign starting stats
                 (Strength, Dexterity, Intelligence, Charisma). Each stat must be between ${STAT_MIN} and ${STAT_MAX} (inclusive).
                 The total sum of all four stats must be exactly ${STAT_POINTS_TOTAL}.
                 The stats should logically reflect typical fantasy archetypes.
                 Provide the output in JSON format.`
        } 
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: CHARACTER_GENERATION_SCHEMA,
    },
  });

  const generatedData: Character = JSON.parse(response.text || '{}');

  // Post-processing to ensure stat constraints are met (same logic as generateCharacterFromImage)
  let { strength, dexterity, intelligence, charisma } = generatedData;

  strength = Math.max(STAT_MIN, Math.min(STAT_MAX, strength));
  dexterity = Math.max(STAT_MIN, Math.min(STAT_MAX, dexterity));
  intelligence = Math.max(STAT_MIN, Math.min(STAT_MAX, intelligence));
  charisma = Math.max(STAT_MIN, Math.min(STAT_MAX, charisma));

  let currentTotal = strength + dexterity + intelligence + charisma;
  let remainingPoints = STAT_POINTS_TOTAL - currentTotal;

  const stats = [
    { name: 'strength', value: strength, setter: (v: number) => strength = v },
    { name: 'dexterity', value: dexterity, setter: (v: number) => dexterity = v },
    { name: 'intelligence', value: intelligence, setter: (v: number) => intelligence = v },
    { name: 'charisma', value: charisma, setter: (v: number) => charisma = v },
  ];

  while (remainingPoints !== 0) {
    let changed = false;
    for (const stat of stats) {
      if (remainingPoints > 0 && stat.value < STAT_MAX) {
        stat.setter(stat.value + 1);
        stat.value++;
        remainingPoints--;
        changed = true;
        if (remainingPoints === 0) break;
      } else if (remainingPoints < 0 && stat.value > STAT_MIN) {
        stat.setter(stat.value - 1);
        stat.value--;
        remainingPoints++;
        changed = true;
        if (remainingPoints === 0) break;
      }
    }
    if (!changed && remainingPoints !== 0) {
        console.warn("Could not perfectly normalize stats for random character within min/max constraints and total points.");
        break;
    }
  }

  // Generate a portrait for this random character
  const portraitImageUrl = await generateRandomCharacterPortrait();

  return {
    name: generatedData.name || 'Random Hero',
    appearanceDescription: generatedData.appearanceDescription || 'A mysterious figure ready for adventure.',
    strength,
    dexterity,
    intelligence,
    charisma,
    portraitImageUrl,
  };
}