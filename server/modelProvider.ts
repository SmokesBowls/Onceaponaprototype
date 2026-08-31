export interface GenerateTextParams {
  systemPrompt?: string;
  userPrompt: string;
  jsonMode?: boolean;
  temperature?: number;
  model?: string;
}

export interface GenerateTextResult {
  text: string;
  rawOutput?: any;
  usedFallbackModel?: boolean;
  providerName: string;
}

export interface ModelProvider {
  name: string;
  isAvailable(): boolean;
  generateText(params: GenerateTextParams): Promise<GenerateTextResult>;
}

import { GoogleGenAI } from '@google/genai';

export class GeminiProvider implements ModelProvider {
  name = 'Gemini';
  private client: GoogleGenAI | null = null;
  private clientInitialized = false;

  private getClient(): GoogleGenAI | null {
    if (!this.clientInitialized) {
      this.clientInitialized = true;
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        this.client = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build-onceaponatime',
            },
          },
        });
      }
    }
    return this.client;
  }

  isAvailable(): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  async generateText(params: GenerateTextParams): Promise<GenerateTextResult> {
    const ai = this.getClient();
    if (!ai) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }

    const candidateModels = [
      params.model || 'gemini-3.7-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
    ];

    let lastError: any = null;

    for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
      const currentModel = candidateModels[mIdx];
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const config: any = {};
          if (params.systemPrompt) {
            config.systemInstruction = params.systemPrompt;
          }
          if (params.jsonMode) {
            config.responseMimeType = 'application/json';
          }
          if (typeof params.temperature === 'number') {
            config.temperature = params.temperature;
          }

          const response = await ai.models.generateContent({
            model: currentModel,
            contents: params.userPrompt,
            config,
          });

          if (response && typeof response.text === 'string') {
            let outputText = response.text.trim();
            // If jsonMode was requested, clean markdown code blocks if present
            if (params.jsonMode) {
              if (outputText.startsWith('```json')) {
                outputText = outputText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
              } else if (outputText.startsWith('```')) {
                outputText = outputText.replace(/^```\s*/, '').replace(/\s*```$/, '');
              }
            }

            return {
              text: outputText,
              rawOutput: response,
              usedFallbackModel: mIdx > 0,
              providerName: `Gemini (${currentModel})`,
            };
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[GeminiProvider] Attempt failed model=${currentModel} attempt=${attempt + 1}: ${err?.message || err}`);
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 600));
          }
        }
      }
    }

    throw lastError || new Error('All model provider attempts exhausted.');
  }
}

// Singleton provider instance
let defaultProvider: ModelProvider | null = null;

export function getModelProvider(): ModelProvider {
  if (!defaultProvider) {
    defaultProvider = new GeminiProvider();
  }
  return defaultProvider;
}
