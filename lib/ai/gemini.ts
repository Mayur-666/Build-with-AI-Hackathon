import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { CALL_TIMEOUT_MS } from "./config";
import { geminiRoomJsonSchema } from "./schema";

/** Writes one room as raw JSON text with a given model. Exactly one HTTP request per call. */
export type RoomWriter = (prompt: string, model: string) => Promise<string>;

type WriterOptions = {
  apiKey?: string;
  /** Injected in tests to count real HTTP requests. */
  fetch?: typeof fetch;
};

/**
 * The only place that talks to Gemini. SDK-level retries are explicitly disabled
 * (attempts: 1) so the room pipeline's two-call budget is the single source of truth.
 */
export function createGeminiWriter({ apiKey = process.env.GEMINI_API_KEY, fetch: fetchImpl }: WriterOptions = {}): RoomWriter {
  let client: GoogleGenAI | null = null;

  return async (prompt, model) => {
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    client ??= new GoogleGenAI({
      apiKey,
      httpOptions: { retryOptions: { attempts: 1 }, ...(fetchImpl ? { fetch: fetchImpl } : {}) },
    });
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: geminiRoomJsonSchema(),
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        temperature: 1,
        abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS),
      },
    });
    const text = response.text;
    if (!text) throw new SyntaxError(`Empty response (finishReason: ${response.candidates?.[0]?.finishReason ?? "unknown"})`);
    return text;
  };
}
