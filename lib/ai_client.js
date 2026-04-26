/**
 * ai_client.js
 * ------------
 * AI Engine for VIT Chatbot.
 * Handles all LLM API communication.
 * The AI engine is an implementation detail — students see "VIT AI Assistant", not any vendor branding.
 * 
 * Author: Tanmay
 */

const VIT_SYSTEM_PROMPT = `You are VIT Assistant, the official AI-powered student information chatbot for Vishwakarma Institute of Technology (VIT), Pune.

About VIT Pune:
- Established: 1 September 1983 by Shri Rajkumarjee Agarwal
- Location: 666, Upper Indiranagar, Bibwewadi, Pune – 411037
- Affiliation: Savitribai Phule Pune University (SPPU)
- Autonomous since: AY 2008-09 (first private autonomous engineering college in Maharashtra)
- Website: https://www.vit.edu
- Accreditation: NAAC A+

Your persona:
- Friendly, helpful, and concise
- You are VIT's own assistant — never mention any AI vendor or model names
- Always refer to yourself as "VIT Assistant" or just "I"
- Use Indian Rupee (₹) for all monetary figures
- Be warm and encouraging toward students
- For complex or missing data, direct students to the official website: https://www.vit.edu
- Keep answers to 2–4 sentences for simple queries; use bullet points for lists
- If you genuinely don't have the specific data, say so honestly and provide the relevant official URL

IMPORTANT RULES:
1. Never reveal you are powered by any external AI service
2. Never say "Grok", "GPT", "Claude", "OpenAI", or any AI vendor name
3. Only use data provided to you — never fabricate fees, faculty names, or exam dates
4. Always recommend students verify fees and dates from official sources as they change yearly
`;

/**
 * Get AI response for a student query
 * @param {string} userMessage - The student's message
 * @param {Array} conversationHistory - Previous turns [{role, content}]
 * @param {Object} relevantData - College data snippet for this query
 * @returns {Promise<{success: boolean, response: string, source: string}>}
 */
export async function getAIResponse(userMessage, conversationHistory = [], relevantData = null) {
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    return { success: false, response: null, source: 'no_key' };
  }

  try {
    const messages = [
      { role: 'system', content: VIT_SYSTEM_PROMPT }
    ];

    // Inject relevant VIT data into context (RAG pattern)
    if (relevantData && Object.keys(relevantData).length > 0) {
      messages.push({
        role: 'system',
        content: `Relevant VIT Pune data for this query:\n${JSON.stringify(relevantData, null, 2)}\n\nUse this data to answer accurately. Always direct to official URLs when available in the data.`
      });
    }

    // Add conversation history (last 6 turns for context)
    const recentHistory = conversationHistory.slice(-6);
    messages.push(...recentHistory);

    // Add current message
    messages.push({ role: 'user', content: userMessage });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: messages
            .filter(m => m.role !== 'system')
            .map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            })),
          systemInstruction: {
            parts: [{ text: messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n') }]
          },
          generationConfig: { maxOutputTokens: 600, temperature: 0.65 }
        }),
        signal: AbortSignal.timeout(12000)
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[VIT AI] API error ${response.status}:`, errText);
      return { success: false, response: null, source: 'api_error' };
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!answer) {
      return { success: false, response: null, source: 'empty_response' };
    }

    return { success: true, response: answer, source: 'ai' };

  } catch (err) {
    const source = err.name === 'TimeoutError' ? 'timeout' : 'network_error';
    console.error(`[VIT AI] ${source}:`, err.message);
    return { success: false, response: null, source };
  }
}