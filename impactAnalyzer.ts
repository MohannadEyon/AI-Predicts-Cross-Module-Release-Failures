import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';

// Jenkins will securely pass this key later
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

async function analyzeImpact() {
    try {
        const diff = fs.readFileSync('pr_diff.txt', 'utf-8');
        const architectureMap = fs.readFileSync('app_dependencies.json', 'utf-8');

        const prompt = `You are an expert QA Architect.
        Here is the architecture map of our E-commerce app: ${architectureMap}
        Here are the code changes in the current Merge Request: ${diff}

        Analyze the changes. Identify the primary module changed, AND use the map to identify any other modules that might break indirectly.
        IMPORTANT: Only reply with a raw JSON array of the impacted module names. Do not include markdown or backticks. Example: ["Login", "Checkout"]`;

        // Using Gemini 1.5 Flash - it is the fastest for this kind of logic
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        let aiResponse = result.response.text().trim();

        // Clean up markdown just in case
        if (aiResponse.startsWith('```')) {
            aiResponse = aiResponse.replace(/```json|```/g, '').trim();
        }

        console.log(aiResponse);

    } catch (error) {
        console.error("AI Error:", error);
        console.log('["Smoke"]'); // If it fails, run a Smoke test group as a fallback
    }
}

analyzeImpact();
