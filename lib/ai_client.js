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

RESPONSE RULES:
1. You will be given REAL VIT data in each message — use it fully and confidently to answer
2. Give complete, specific answers using the provided data — fees, seats, recruiters, cutoffs, etc.
3. Only mention the website URL at the end as a secondary reference, never as the main answer
4. If data is provided to you, NEVER say "I don't have that information" — use what you have
5. For follow-up questions, use conversation history to give contextual answers
6. Never say "Grok", "GPT", "Claude", "OpenAI", or any AI vendor name
7. Never fabricate fees, faculty names, or exam dates not present in the data
8. Always remind students to verify fees and cutoffs from official sources yearly since they change
9. Format responses clearly — use bullet points for lists, bold for important numbers
10. NEVER start your response with "Hello!" or "As VIT Assistant" — get straight to the answer
11. NEVER say "Based on the information I currently have" — just answer directly
12. NEVER say "While I don't have..." — if you have relevant data, use it; if not, say what you DO know
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
      content: `REAL VIT PUNE DATA (use this directly in your answer — do not say "visit the website" if the answer is here):\n\n${JSON.stringify(relevantData, null, 2)}\n\nINSTRUCTION: Extract specific numbers, fees, names, percentiles directly from above and state them confidently. Only refer to website for data NOT present above.`      });
    }

    // Add conversation history (last 6 turns for context)
    const recentHistory = conversationHistory.slice(-6);
    messages.push(...recentHistory);

    // Add current message
    messages.push({ role: 'user', content: userMessage });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
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
          generationConfig: { maxOutputTokens: 1500, temperature: 0.65 }
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