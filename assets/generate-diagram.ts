import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import mime from "mime";
import { writeFile, readFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { parseArgs } from "util";

// Load GEMINI_API_KEY. A real environment variable always wins; otherwise we
// fall back to a local .env in the repo root (one level up from assets/).
// dotenv does not override variables that are already set in the environment.
dotenvConfig({
  path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env"),
});

const { values } = parseArgs({
  options: {
    prompt: { type: "string" },
    output: { type: "string", default: "~/infographics/diagram.png" },
    ref: { type: "string", multiple: true },
  },
});

if (!values.prompt) {
  console.error("Error: --prompt is required");
  process.exit(1);
}

if (!values.ref || values.ref.length === 0) {
  console.error("Error: at least one --ref <image-path> is required");
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
  console.error(
    "Error: GEMINI_API_KEY is not set. Export it in your shell, or copy " +
      ".env.example to .env and add your key. Get one at https://aistudio.google.com/apikey"
  );
  process.exit(1);
}

async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  // Build parts array: all reference images first, then the prompt text
  const parts: Array<
    { inlineData: { mimeType: string; data: string } } | { text: string }
  > = [];

  for (const refPath of values.ref!) {
    const expandedPath = refPath.replace(/^~/, process.env.HOME || "");
    const imageBuffer = await readFile(expandedPath);
    const imageMimeType = mime.getType(expandedPath) || "image/jpeg";
    parts.push({
      inlineData: {
        mimeType: imageMimeType,
        data: imageBuffer.toString("base64"),
      },
    });
    console.log(`Loaded reference: ${refPath}`);
  }

  parts.push({ text: values.prompt! });

  const config = {
    responseModalities: ["IMAGE", "TEXT"] as const,
    thinkingConfig: { thinkingLevel: "MINIMAL" as const },
    imageConfig: { imageSize: "1K" },
  };

  console.log("Generating diagram with Gemini...");

  const response = await ai.models.generateContentStream({
    model: "gemini-3.1-flash-image-preview",
    config,
    contents: [{ role: "user", parts }],
  });

  const outputPath = (values.output || "~/infographics/diagram.png").replace(
    /^~/,
    process.env.HOME || ""
  );
  await mkdir(dirname(outputPath), { recursive: true });

  let saved = false;
  for await (const chunk of response) {
    if (!chunk.candidates || !chunk.candidates[0]?.content?.parts) {
      continue;
    }

    for (const part of chunk.candidates[0].content.parts) {
      if (part.inlineData) {
        const ext =
          mime.getExtension(part.inlineData.mimeType || "") || "png";
        const finalPath = outputPath.replace(/\.[^.]+$/, "") + "." + ext;
        const buffer = Buffer.from(part.inlineData.data || "", "base64");
        await writeFile(finalPath, buffer);
        console.log(`Image saved: ${finalPath}`);
        saved = true;
      } else if (part.text) {
        console.log(part.text);
      }
    }
  }

  if (!saved) {
    console.error("No image was generated. Try refining your prompt.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Generation failed:", err.message || err);
  process.exit(1);
});
