const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function analyzeImpact() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    try {
        console.log("🔍 1. Starting AI Analysis...");
        const diff = fs.readFileSync('pr_diff.txt', 'utf-8');
        const architectureMap = fs.readFileSync('module_map.json', 'utf-8');

        console.log("🔗 2. Connecting to Gemini API...");
        const genAI = new GoogleGenerativeAI(apiKey);
        
        const prompt = "You are an expert QA Architect.\n" +
        "Here is the architecture map of our E-commerce app: " + architectureMap + "\n" +
        "Here are the code changes in the current Merge Request: " + diff + "\n" +
        "Analyze the changes. Identify the primary module changed, AND use the map to identify any other modules that might break indirectly.\n" +
        "IMPORTANT: Only reply with a raw JSON array of the impacted module names. Example: [\"Login\", \"PurchaseFlow\"]";

        // Testing the oldest, most universally available model first
        const genModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        console.log("🧠 3. Sending data to Gemini... waiting for response...");
        const result = await genModel.generateContent(prompt);
        let aiResponse = result.response.text().trim();
        
        console.log("✅ 4. Raw AI Response received: " + aiResponse);

        const tick = String.fromCharCode(96);
        const jsonBlock = tick + tick + tick + "json";
        const codeBlock = tick + tick + tick;
        
        aiResponse = aiResponse.split(jsonBlock).join("");
        aiResponse = aiResponse.split(codeBlock).join("");
        aiResponse = aiResponse.trim();

        fs.writeFileSync('ai_result.txt', aiResponse);
        console.log("💾 5. Successfully saved tags to ai_result.txt");

    } catch (error) {
        console.error("❌ AI Error:", error.message);
        
        // --- DIAGNOSTIC MODE ---
        console.log("\n🕵️ DIAGNOSTIC MODE: Asking Google which models your API key is allowed to use...");
        try {
            const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey);
            const data = await response.json();
            
            if (data.models) {
                // Filter only models that support text generation and strip the "models/" prefix
                const validModels = data.models
                    .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
                    .map(m => m.name.replace('models/', ''));
                
                console.log("🟢 YOUR SPECIFIC KEY CAN USE THESE EXACT MODELS: ");
                console.log(validModels.join(" | "));
                console.log("👉 Update 'genAI.getGenerativeModel({ model: \"...\" })' with one of the names above!\n");
            } else {
                console.log("🔴 No models found. Your Google AI Studio project might need to enable the Generative Language API.");
            }
        } catch(fetchErr) {
             console.log("Diagnostic fetch failed: " + fetchErr.message);
        }

        // Safe Fallback
        fs.writeFileSync('ai_result.txt', '["Login", "PurchaseFlow"]'); 
        console.log("⚠️ Saved fallback tests to ai_result.txt");
    }
}

analyzeImpact();
