const Anthropic = require('@anthropic-ai/sdk');

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
            text: `You are an expert e-commerce conversion rate optimization (CRO) specialist. Analyze the provided store data (HTML structure, text content, and trust score metrics).
            
            Store Info:
            - URL: ${payload.url}
            - Score: ${payload.score} (Grade: ${payload.grade})
            - Key Recommendations: ${JSON.stringify(payload.recommendations)}
            - Score Breakdown: ${JSON.stringify(payload.breakdown)}
            
            Based on this data, provide a qualitative assessment in JSON format with the following fields:
            - "designScore": A number between 1-10 rating the implied professionalism based on the data.
            - "assessment": A 2-3 paragraph qualitative assessment of the store's trustworthiness, copy quality, and structure.
            - "priorityFixes": An array of strings containing the top 3 priority fixes in plain English.
            - "nicheComparison": A brief comparison to what is expected for similar stores in this niche.
            
            Be critical but constructive. Look for red flags like missing trust signals, poor copy, or structure issues.
            
            Raw Text Sample:
            ${(payload.text || "").slice(0, 2000)}
            `
          }
        ]
      }
    ];

    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
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

  } catch (error) {
    console.error('Claude Analysis Failed:', error);
    return null; // Fail gracefully
  }
};

module.exports = { analyzeStoreWithClaude };
