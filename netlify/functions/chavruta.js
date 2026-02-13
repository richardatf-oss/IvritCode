// netlify/functions/chavruta.js
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function handler(event) {
  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { prompt } = JSON.parse(event.body || "{}");
    if (!prompt || typeof prompt !== "string") {
      return {
        statusCode: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing `prompt` string." }),
      };
    }

    const instructions = [
      "You are IvritCode Chavruta: a programming study partner for a Hebrew opcode VM.",
      "Return STRICT JSON ONLY (no markdown, no backticks).",
      "Schema: {\"program\":\"...\",\"commentary\":\"...\"}",
      "program: an IvritCode program (Hebrew letters one per instruction) with optional inline comments.",
      "commentary: brief explanation + what to expect in letter-stream + suggested 231 gates to watch for.",
      "Be concise, but helpful.",
    ].join("\n");

    // Responses API example format (recommended by OpenAI docs). :contentReference[oaicite:0]{index=0}
    const resp = await client.responses.create({
      model: "gpt-5",
      instructions,
      input: prompt.trim(),
    });

    const text = resp.output_text || "";

    return {
      statusCode: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: text }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Chavruta function error",
        details: String(err?.message || err),
      }),
    };
  }
}
