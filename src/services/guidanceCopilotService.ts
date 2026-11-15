/**
 * Guidance AI Copilot Service (AICS SafeZone)
 * 
 * Strict Privacy & Architectural Directives:
 * 1. Zero Access to Student Personal Data: Never reads, deletes, updates, or queries student records.
 * 2. System & SOP Expert: Knows all modules (Concerns Hub, Cases, Appointments, Analytics, Settings, Masterlist).
 * 3. Answers any question (ano, saan, paano, bakit, kailangan, sino, etc.) in friendly, professional Taglish / English.
 * 4. Fallback Engine: If offline or rate-limited, provides deterministic local knowledge base answers instantly.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-3.5-flash';

const SYSTEM_INSTRUCTION = `
You are "Aicy AI" (AICS Guidance Copilot & SafeZone Staff Assistant), an intelligent, supportive, and privacy-first in-app assistant built exclusively for the AICS Montalban Branch Guidance Office.
Your name is "Aicy AI" and your icon is the friendly AICS SafeZone robot mascot.

YOUR CORE ROLE & SCOPE:
- Guide the Guidance Counselor, Guidance Associates, and Staff on how to use every single feature of the AICS SafeZone Portal.
- Answer questions asked in Taglish, Filipino, or English, whether fully phrased or brief/fragmented (e.g. "paano gumawa ng case", "saan mag print", "ano sasabihin sa umiiyak", "pending review bakit").
- Provide compassionate, professional, standard-operating-procedure (SOP) counseling phrasing and crisis de-escalation tips.

CRITICAL PRIVACY & SECURITY GUARDRAILS (RA 10173 - DATA PRIVACY ACT OF 2012):
1. ZERO DATABASE / STUDENT ACCESS: You DO NOT have access to read, modify, delete, or search student records, names, contact numbers, grades, or personal files.
2. ABSOLUTE REFUSAL OF STUDENT DATA MANIPULATION: If a user asks you to delete, modify, or reveal specific student information (e.g., "idelete mo si Myka", "ano phone number ni Juan", "baguhin mo section ni..."), you MUST strictly and politely refuse.
   - Example Refusal: "Paumanhin po, bilang Aicy AI, mahigpit na ipinagbabawal sa aking sistema ang paggalaw o pag-access sa database at personal na impormasyon ng mga mag-aaral alinsunod sa Data Privacy Act (RA 10173). Hindi ko maaaring i-delete o baguhin ang records ng sinumang estudyante tulad ni Myka. Maaari niyo po itong isagawa nang direkta at may pahintulot sa Student Masterlist o Cases tab."

SYSTEM KNOWLEDGE BASE:
1. Concerns Hub:
   - Where incoming student submissions (Personal Concern or Peer Referral) arrive with "Pending Review".
   - Actions: Counselor can click "Approve" (opens 2-way real-time chat with student) or "Reject" (with reason).
   - "Approve & Link to Case": Can link to an existing active case or generate a brand new Case File.
2. Cases Management:
   - Tracks formal guidance cases (e.g. CAS-2026-001).
   - Holds Case Notes, Interventions, Scheduled Conferences, Status (Active, Monitoring, Resolved, Archived).
3. Appointments:
   - Scheduling face-to-face or online counseling sessions with students and guardians.
4. Analytics & Reports:
   - Generates and exports ISO 25010 compliant summary reports, quarterly case graphs, PDF/Excel export with AICS Montalban branch headers.
5. Student Masterlist:
   - Authorized directory of registered students with search, filters (Grade 11/12, ICT/ABM/GAS/HUMSS), and account status.
6. Communication Style:
   - Clear, step-by-step (1, 2, 3), zero emojis (use standard text bullet points), concise, and directly actionable.
`;

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

// Fallback response generator if network fails or offline
function getLocalFallbackAnswer(query: string): string {
  const q = query.toLowerCase();

  if (q.includes('delete') || q.includes('tanggalin') || q.includes('bura') || q.includes('myka') || q.includes('student')) {
    if (q.includes('myka') || q.includes('delete') || q.includes('bura')) {
      return "Paumanhin po, mahigpit na ipinagbabawal sa aking sistema ang paggalaw o pag-access sa database at personal na impormasyon ng mga mag-aaral alinsunod sa Data Privacy Act (RA 10173). Hindi ko maaaring i-delete o baguhin ang records ng sinumang estudyante. Mangyaring isagawa ito nang manual sa Student Masterlist gamit ang inyong authorized guidance credentials.";
    }
  }

  if (q.includes('case') || q.includes('kaso')) {
    return "Para gumawa ng Case:\n1. Pumunta sa Concerns Hub sa kaliwang sidebar.\n2. Piliin ang concern ng estudyante at i-click ang 'Approve & Link to Case'.\n3. Kung bagong kaso, pindutin ang 'Create New Case' at maglagay ng Case Title.\n4. Awtomatiko itong magiging official case file sa Cases tab at mabubuksan ang chat sa student.";
  }

  if (q.includes('print') || q.includes('report') || q.includes('export') || q.includes('download')) {
    return "Para mag-export ng Reports:\n1. Buksan ang 'Analytics & Reports' sa kaliwang menu.\n2. I-set ang date filter sa nais na buwan o quarter.\n3. Pindutin ang 'Export PDF' o 'Export Excel' sa kanang itaas para makuha ang opisyal na kopya na may AICS Montalban header.";
  }

  if (q.includes('pending') || q.includes('approve') || q.includes('reject')) {
    return "Ang mga bagong submitted concern ay mananatiling 'Pending Review' hanggang hindi ito inaaksyunan ng Guidance.\n- I-click ang concern card para basahin ang salaysay.\n- Pindutin ang 'Approve' para buksan ang chat, o 'Reject' kung invalid o naulit ang submission.";
  }

  if (q.includes('sagot') || q.includes('iyak') || q.includes('umiiyak') || q.includes('stress')) {
    return "Inirerekomendang panimula sa distressed o nag-aalalang mag-aaral:\n'Huminga ka nang malalim. Ligtas ka rito sa AICS Guidance. Nandito kami para makinig nang walang panghuhusga. Gusto mo ba tayong mag-usap sa opisina o komportable ka muna rito sa chat?'\nPaalala: Kung may banta sa sarili, i-flag agad bilang High Priority para sa agarang in-person consultation.";
  }

  return "Nandito ako para tulungan ka sa paggamit ng AICS SafeZone Portal. Maaari kang magtanong kung paano gumawa ng case, mag-approve ng concern, mag-export ng reports, o mag-schedule ng appointment. Paano kita matutulungan?";
}

export async function askGuidanceCopilot(
  prompt: string,
  history: CopilotMessage[]
): Promise<string> {
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) return '';

  // Intercept data modification attempts immediately at client layer for safety
  const lower = cleanPrompt.toLowerCase();
  if (
    (lower.includes('delete') || lower.includes('tanggalin') || lower.includes('burahin') || lower.includes('drop')) &&
    (lower.includes('student') || lower.includes('myka') || lower.includes('account') || lower.includes('record'))
  ) {
    return "Paumanhin po, bilang Aicy AI, mahigpit na ipinagbabawal sa aking sistema ang paggalaw, pagbura, o pag-access sa database at personal na impormasyon ng mga mag-aaral alinsunod sa Data Privacy Act (RA 10173). Hindi ko maaaring i-delete o baguhin ang records ng sinumang estudyante. Mangyaring isagawa ito nang manual sa Student Masterlist kung may kaukulang administrative approval.";
  }

  if (!GEMINI_API_KEY) {
    return getLocalFallbackAnswer(cleanPrompt);
  }

  try {
    const formattedHistory = history.slice(-6).map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
        contents: [
          ...formattedHistory,
          {
            role: 'user',
            parts: [{ text: cleanPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 600,
        },
      }),
    });

    if (!res.ok) {
      console.warn('Gemini API call returned non-200, falling back to local knowledge:', res.status);
      return getLocalFallbackAnswer(cleanPrompt);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidate) {
      return candidate.trim();
    }
    return getLocalFallbackAnswer(cleanPrompt);
  } catch (err) {
    console.error('Copilot service error, using offline fallback:', err);
    return getLocalFallbackAnswer(cleanPrompt);
  }
}
