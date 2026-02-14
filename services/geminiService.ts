
import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse, Scene } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

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

export async function generateNextScene(
  originalStory: string,
  history: Array<{ role: 'user' | 'model', text: string }>,
  userInput: string
): Promise<Scene> {
  const model = 'gemini-3-pro-preview';
  
  const contents = [
    { role: 'user' as const, parts: [{ text: `Original Story Context:\n${originalStory}` }] },
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
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Digital RPG illustration, high fantasy, cinematic composition: ${prompt}` }]
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
