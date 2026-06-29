import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse large JSON bodies for audio/base64
  app.use(express.json({ limit: "50mb" }));

  // API constraints
  const ai = new GoogleGenAI({ 
     apiKey: process.env.GEMINI_API_KEY,
     httpOptions: {
        headers: {
           'User-Agent': 'aistudio-build'
        }
     }
  });

  // API router
  const apiRouter = express.Router();

  apiRouter.post("/transcribe", async (req, res) => {
    try {
      const { text, audioBase64, mimeType } = req.body;
      
      let contents: any = [];
      const parts = [];

      if (audioBase64 && mimeType) {
         parts.push({
            inlineData: {
               data: audioBase64.split(',')[1] || audioBase64, // strip data:audio/..
               mimeType: mimeType
            }
         });
      }
      
      if (text) {
         parts.push({ text });
      } else if (audioBase64) {
         parts.push({ text: `Transcribe y mejora este audio para ser registrado como avance del proyecto. 
Corrige posibles errores, ordénalo para que sea claro, separa las ideas principales.
Detecta bloqueos si los menciona. Enumera los próximos pasos y decisiones pendientes si los hay.
Mantén el sentido original y NO inventes información. Proponer una redacción profesional y clara.

Responde ÚNICAMENTE con un JSON válido con la siguiente estructura (sin formato markdown ni bloques de código extraños, solo la pura cadena JSON):
{
  "text": "La redacción profesional mejorada del avance...",
  "blockers": "Si se detectaron bloqueos ponlos aquí, de lo contrario deja vacío",
  "nextSteps": "Si se detectaron próximos pasos o decisiones, ponlo aquí, de lo contrario deja vacío"
}` });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts }
      });

      let resultJson;
      try {
        let textResult = response.text || "{}";
        // Clean up possible markdown wrappers
        textResult = textResult.replace(/^```json/g, "").replace(/^```/g, "").replace(/```$/g, "").trim();
        resultJson = JSON.parse(textResult);
      } catch (e) {
        resultJson = { text: response.text, blockers: "", nextSteps: "" };
      }

      res.json(resultJson);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to process audio" });
    }
  });

  app.use("/api", apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
