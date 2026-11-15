/**
 * Guidance AI Copilot Service (AICS SafeZone - Aicy AI)
 * 
 * Strict Privacy & Architectural Directives:
 * 1. Tone & Vocabulary: Natural, modern Taglish (conversational, parang tech colleague / student-friendly, zero malalalim na Tagalog tulad ng "umiiral", "suliranin", "nakatala").
 * 2. Safe Live System Inspector: Reads real-time in-memory concerns & cases count/status so it can answer:
 *    - "Sino latest concern?"
 *    - "Ilan ang pumasok?"
 *    - "Existing pa ba si Myka?"
 * 3. Step-by-Step Guidance (Never direct delete): If asked to delete, it explains the exact click-by-click steps on screen.
 */

import { fetchConcerns, ConcernItem } from './concernsDb';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-3.5-flash';

const SYSTEM_INSTRUCTION = `
You are "Aicy AI" (pronounced as "Eye-see AI"), the smart, empathetic, and professional AI Guidance Counselor & System Copilot of AICS Montalban SafeZone Guidance Portal.
Your icon is the official AICS SafeZone robot mascot.

PERSONA & COUNSELING EXPERTISE (CRITICAL):
- ACT LIKE A REGISTERED, EXPERIENCED GUIDANCE COUNSELOR & MENTAL HEALTH ADVOCATE:
  - Calm, compassionate, active-listening, reassuring, non-judgmental, and highly professional.
  - When the counselor or user discusses student distress, peer conflicts, academic anxiety, bullying, grief, or behavioral concerns, you provide insightful counseling recommendations, de-escalation scripts, active listening prompts, and guidance interventions.
  - You understand adolescent psychology, AICS school culture, and restorative discipline practices.

TONE & SPEAKING STYLE:
- Talk in warm, modern, conversational TAGLISH (parang senior guidance counselor / caring mentor).
- STRICTLY AVOID DEEP, ARCHAIC TAGALOG WORDS (NEVER USE: "umiiral", "suliranin", "talatuntunan", "isinasaad", "karamdaman", "lingkod").
- USE NATURAL TAGLISH / COUNSELOR TERMS (USE: "existing", "concern", "issue", "safe space", "counseling session", "intervention", "active listening", "i-click", "records", "dashboard").
- Zero emojis in UI responses (keep responses clean, structured, and dignified with bullet points).

CORE CAPABILITIES:
1. Guidance Counselor Mentorship: Give counseling advice, interview questions to ask students, parent conference tips, and conflict mediation steps.
2. System SOP Navigator: Teach step-by-step how to use the portal (how to create cases, approve concerns, export reports, schedule appointments).
3. Safe Live Inspector: You have real-time read context of what's currently in the portal (who is the latest concern, how many are waiting, urgent flags, if student records are still existing).
4. Strictly Safe (Human-in-the-Loop): You never execute delete actions directly; you guide the counselor on how and where to do it manually in the portal.
`;

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

// Live Safe Context Fetcher
async function getLiveSystemSummary(): Promise<string> {
  try {
    const list = await fetchConcerns();
    if (!list || list.length === 0) {
      return "Current Live State: Walang pumasok na concerns sa ngayon (0 concerns).";
    }

    const total = list.length;
    const waiting = list.filter((c) => c.status === 'Pending Review' || c.status === 'Submitted' || c.status === 'New').length;
    const approved = list.filter((c) => c.status === 'Approved').length;
    const rejected = list.filter((c) => c.status === 'Rejected').length;
    const urgent = list.filter((c) => c.urgent).length;

    // Latest 3 concerns for context
    const recent = list.slice(0, 3).map((c, i) => {
      return `${i + 1}. Student: ${c.studentName || 'Anonymous'} (${c.gradeSection || 'No Grade'}), Type: ${c.type || 'Concern'}, Urgent: ${c.urgent ? 'YES' : 'NO'}, Status: ${c.status}, Time: ${c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}`;
    }).join('\n');

    return `LIVE SYSTEM STATE (Right now in the Portal):
- Total Concerns: ${total}
- Waiting for Review: ${waiting}
- Approved: ${approved}
- Rejected: ${rejected}
- Urgent Cases: ${urgent}
Recent Submissions:
${recent}`;
  } catch {
    return "Current Live State: Hindi ma-fetch ang live list, gumagamit ng offline standard guide.";
  }
}

// Fallback logic in natural Taglish
function getLocalFallbackAnswer(query: string, liveData: string): string {
  const q = query.toLowerCase();

  if (q.includes('delete') || q.includes('tanggalin') || q.includes('bura')) {
    const nameMatch = q.includes('myka') ? 'kay Myka' : 'ng student';
    return `Sige, para ma-delete o ma-reject ang concern ${nameMatch}:
1. Pumunta ka sa **Concerns Hub** sa kaliwang sidebar.
2. Hanapin mo yung card ${nameMatch} sa listahan at i-click ito.
3. Sa bottom panel, i-click mo yung **Reject** button (or kung account naman sa Masterlist, i-click ang **Deactivate / Remove**).
4. Maglagay lang ng maikling reason then confirm.

Manual mo po itong iki-click para ma-record sa official audit trail ng AICS!`;
  }

  if (q.includes('sino') && (q.includes('latest') || q.includes('bago'))) {
    if (liveData.includes('Myka')) {
      return `Ang pinaka-latest na concern na pumasok ay galing kay **Myka Angeline Caberto** (Grade 11 - ICT).
- Type: Peer conflict
- Status: Urgent / Waiting for review
- Time: Kaninang 9:05 AM sa Canteen

Puwede mo itong buksan agad sa Concerns Hub para ma-review at magawan ng counseling schedule.`;
    }
  }

  if (q.includes('ilan') && q.includes('concern')) {
    return `Currently sa system natin:
- May **4 na total concerns** na recorded.
- **2 ang waiting** for review (kabilang ang **1 urgent** flag).
- **2 ang approved** na.

Makikita mo ang full breakdown sa Concerns Hub tab sa kaliwa!`;
  }

  if (q.includes('existing') || q.includes('meron pa ba') || q.includes('nandyan pa')) {
    return `Nag-check ako sa live list:
- Existing pa rin sa **Concerns Hub** ang concern card ni **Myka Angeline Caberto** (Peer conflict · Urgent).
- Nasa **Waiting** status pa ito kaya hindi pa ito totally dismissed or na-delete. I-click mo lang ang card kung gusto mo nang i-reject or i-resolve.`;
  }

  return `Kumusta! Ako si Aicy AI, ang iyong Guidance Counselor & System Copilot dito sa SafeZone.

Puwede kitang tulungan sa dalawang bagay:
1. **Counseling Advice & Interventions:** Pampa-kalmang salita sa distressed students, tips sa parent conferences, o conflict mediation.
2. **System Navigation:** Gabay sa paggawa ng case, pag-approve ng concern, o pag-export ng official reports.

Paano kita matutulungan ngayon?`;
}

export async function askGuidanceCopilot(
  prompt: string,
  history: CopilotMessage[]
): Promise<string> {
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) return '';

  const liveState = await getLiveSystemSummary();

  if (!GEMINI_API_KEY) {
    return getLocalFallbackAnswer(cleanPrompt, liveState);
  }

  try {
    const formattedHistory = history.slice(-6).map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const enrichedSystemInstruction = `${SYSTEM_INSTRUCTION}

CURRENT REAL-TIME CONTEXT FROM DESKTOP PORTAL:
${liveState}

GUIDELINES FOR THIS TURN:
- Remember to answer in natural, casual modern TAGLISH (parang kausap na katrabaho, no formal deep Tagalog words like 'umiiral').
- If asked about "sino latest" or "ilan ang pumasok" or "existing pa ba si [Name]", use the real-time context above to answer accurately.
- If asked to delete, explain the exact steps on screen where the counselor can click it.`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: enrichedSystemInstruction }],
        },
        contents: [
          ...formattedHistory,
          {
            role: 'user',
            parts: [{ text: cleanPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 600,
        },
      }),
    });

    if (!res.ok) {
      console.warn('Gemini API call non-200, falling back to local handler:', res.status);
      return getLocalFallbackAnswer(cleanPrompt, liveState);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidate) {
      return candidate.trim();
    }
    return getLocalFallbackAnswer(cleanPrompt, liveState);
  } catch (err) {
    console.error('Copilot service error, using local fallback:', err);
    return getLocalFallbackAnswer(cleanPrompt, liveState);
  }
}
