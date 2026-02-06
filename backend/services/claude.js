const Anthropic = require('@anthropic-ai/sdk');

console.log("[AI CONFIG] Using model: claude-3-haiku-20240307");

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const analyzeStoreWithClaude = async (payload) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY is missing. Skipping AI analysis.');
    return null;
  }

  try {
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are an elite Shopify trust & conversion expert (charging $5,000+ for audits). Be direct, confident, and brutally honest. Your goal is to maximize the user's revenue.
            
            Analyze the provided store data (HTML structure, text content, and trust score metrics).
            
            Store Info:
            - URL: ${payload.url}
            - Score: ${payload.score} (Grade: ${payload.grade})
            - Key Recommendations: ${JSON.stringify(payload.recommendations)}
            - Score Breakdown: ${JSON.stringify(payload.breakdown)}
            
            Based on this data, provide a structured qualitative assessment in JSON format with the following fields:
            - "grade": A number between 1-10 rating the overall trust & conversion capability.
            - "summary": A single, punchy 1-sentence summary of the store's current state (e.g., "Great foundation, but missing critical trust signals on the product page.").
            - "issues": An array of 3-4 strings describing exactly what is wrong. Be specific and brutal (e.g., "Footer lacks 'Terms of Service' link," "Product description is generic text block").
            - "competitor_advantages": An array of 2-3 strings listing what top competitors do better (e.g., "Competitors use '100% Satisfaction Guarantee' badge above fold").
            - "fix_steps": An array of strings containing exact, actionable fix steps using Shopify-specific terms (e.g., "Install 'Judge.me' for reviews," "Add 'Free Shipping' bar via Theme Editor").
            
            Be specific. Cite the text or signals found in the raw data. Use specific examples. Quantify impact where possible.
            
            Raw Text Sample:
            ${(payload.text || "").slice(0, 2000)}
            `
          }
        ]
      }
    ];

    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: messages,
    });

    // Extract JSON from response
    const textResponse = msg.content[0].text;
    
    // Find JSON block if wrapped in markdown
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
    }
    
    return JSON.parse(textResponse);

  } catch (err) {
    console.error("[AI ERROR]", err?.response?.data || err.message || err);
    return null; // Fail gracefully
  }
};

module.exports = { analyzeStoreWithAI };
