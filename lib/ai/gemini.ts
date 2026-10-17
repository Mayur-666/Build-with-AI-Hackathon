import "server-only";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { geminiRoomJsonSchema } from "./schema";

export const GEMINI_MODEL = "gemini-3.8-flash";
const TIMEOUT_MS = 25_000;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

/** One structured-output call. Returns Gemini's raw JSON text. */
export async function generateRoomText(prompt: string): Promise<string> {
  const response = await getClient().models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: geminiRoomJsonSchema(),
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      temperature: 1,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    },
  });
  const text = response.text;
  if (!text) throw new Error(`Empty response (finishReason: ${response.candidates?.[0]?.finishReason ?? "unknown"})`);
  return text;
}
