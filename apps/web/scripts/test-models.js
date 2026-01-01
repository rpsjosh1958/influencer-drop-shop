
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Access API key from environment
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) {
  console.error("Error: GOOGLE_GENERATIVE_AI_API_KEY is not set.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    console.log("Fetching available Gemini models...");
    // Note: The SDK doesn't have a direct 'listModels' method exposed easily in the helper, 
    // but we can try to infer or use the model endpoint if supported. 
    // Actually, for Node SDK, we might need to test individual models or use the REST API.
    
    // Testing known models explicitly
    const candidates = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash-001",
        "gemini-1.5-pro",
        "gemini-1.0-pro",
        "gemini-2.0-flash-exp",
    ];

    for (const modelName of candidates) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Test");
            console.log(`✅ ${modelName} is AVAILABLE. Response:`, result.response.text());
        } catch (error) {
            console.log(`❌ ${modelName} failed:`, error.message.split('\n')[0]);
        }
    }

  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
