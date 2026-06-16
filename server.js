import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Initialize the OpenAI client
// It automatically looks for an environment variable named OPENAI_API_KEY
const openai = new OpenAI();

app.post('/translate', async (req, res) => {
    const { text, tone } = req.body;

    if (!text || text.trim() === "") {
        return res.status(400).json({ error: "Text cannot be empty" });
    }

    // 1. Build the system instruction tailored to the selected tone
    let systemInstruction =
        "You are a translator that converts dense, boring corporate jargon, legal terms-of-service, " +
        "and employment contracts into plain, direct English for teenagers. Strip away fluff. Be brutally honest. " +
        "Output the result in 3 to 5 bullet points max.";

    if (tone === "slang") {
        systemInstruction += " Use modern internet slang and analogies where appropriate, but keep the core facts 100% accurate.";
    } else if (tone === "brutal") {
        systemInstruction += " Do not sugarcoat anything. If a company is exploiting the user, say it bluntly (e.g., 'They own your data').";
    }

    try {
        // 2. Call the OpenAI Chat Completions API
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: `Translate this text:\n\n${text}` }
            ],
            temperature: 0.7,
        });

        // 3. Send the response back to the frontend
        res.json({ translation: response.choices[0].message.content });

    } catch (error) {
        console.error("OpenAI Error:", error);
        res.status(500).json({ error: "Something went wrong with the AI translation." });
    }
});

app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
});