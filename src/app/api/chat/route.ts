import { GoogleGenAI, Type, FunctionCallingConfigMode } from "@google/genai";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Khởi tạo Gemini sẽ được thực hiện bên trong hàm POST để tránh lỗi cache biến môi trường.

export async function POST(req: Request) {
  console.log("Using API Key:", process.env.GEMINI_API_KEY?.slice(0, 5) + "...");
  try {
    const body = await req.json();
    const { message, history, userName, calendarData, currentDay, todayIndex } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Nạp systemInstruction từ mindy_protocol.md
    const protocolPath = path.join(process.cwd(), ".context", "mindy_protocol.md");
    let systemInstruction = "";
    if (fs.existsSync(protocolPath)) {
      systemInstruction = fs.readFileSync(protocolPath, "utf-8");
    } else {
      systemInstruction = "You are Mindy. Always end response with JSON block wrapped in $$$ containing stressScore.";
    }

    // Lấy thời gian hiện tại theo múi giờ Đài Loan (Asia/Taipei)
    const nowTaipei = new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei", dateStyle: "full", timeStyle: "long" });

    // Inject User Context & Current Time
    systemInstruction += `\n[PERSONALIZATION] You are speaking with ${userName || 'the user'}. Use their name warmly but not excessively. Always respond in English.`;
    systemInstruction += `\n[STYLE RULE] NEVER use markdown bolding (**text**). Use plain text only. Keep it clean and conversational.`;
    systemInstruction += `\n[BREVITY RULE] Keep responses to 3-4 sentences. Longer (5-6) ONLY when the student shares something deeply personal. Always validate emotions first before offering suggestions.`;
    systemInstruction += `\n[CRITICAL CONTEXT] Current Time in Taipei (MCU Timezone): ${nowTaipei}`;
    systemInstruction += `\n[CALENDAR CONTEXT] Today is: ${currentDay || 'Unknown'} (Index: ${todayIndex ?? 'N/A'}). Use this index to calculate correct dayOfWeek for healing blocks.`;

    // Tiền xử lý dữ liệu lịch (từ user_schedules Firebase)
    let finalMessage = message;
    if (calendarData && Array.isArray(calendarData) && calendarData.length > 0) {
      const scheduleSummary = calendarData.map(s =>
        `- ${s.title} at ${s.location || 'campus'} (${s.startTime} - ${s.endTime})`
      ).join('\n');

      finalMessage = `
[USER_SCHEDULE_FOR_TODAY]:
${scheduleSummary}

Analyze the gaps and the user's potential stress level before responding.

User's Message: ${message}
`;
    }

    // Khởi tạo thư viện bằng API Key lấy trực tiếp
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing in .env.local!");
      return NextResponse.json({ error: "Missing API Key" }, { status: 401 });
    }
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Sử dụng duy nhất model gemini-2.5-flash theo yêu cầu
    const modelName = "gemini-2.5-flash";
    console.log(`[Mindy] Connecting via model: ${modelName}...`);

    try {
      const chat = ai.chats.create({
        model: modelName,
        config: {
          systemInstruction: systemInstruction,
          tools: [{
            functionDeclarations: [
              {
                name: "add_healing_block",
                description: "MANDATORY TOOL TO ADD SCHEDULE BLOCKS. Call this when you want to suggest a restoration/healing activity to the user.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    title: {
                      type: Type.STRING,
                      description: "Creative and short activity name (e.g., 'Campus Drift', 'Breathwork')."
                    },
                    startTime: {
                      type: Type.STRING,
                      description: "Start time in 24h format HH:mm (e.g., '14:00')"
                    },
                    endTime: {
                      type: Type.STRING,
                      description: "End time in 24h format HH:mm (e.g., '15:00')"
                    },
                    dayOfWeek: {
                      type: Type.NUMBER,
                      description: "Index of the day (0=Sun, 6=Sat)."
                    },
                    location: {
                      type: Type.STRING,
                      description: "MCU Landmark (e.g., 'The Slope', 'Library 3F')."
                    },
                    ai_note: {
                      type: Type.STRING,
                      description: "One-sentence explanation for this healing block."
                    }
                  },
                  required: ["title", "startTime", "endTime", "dayOfWeek", "ai_note"]
                }
              }
            ]
          }],
          toolConfig: {
            functionCallingConfig: {
              mode: FunctionCallingConfigMode.AUTO,
            },
          },
        },
        history: history || [],
      });

      const response = await chat.sendMessage({ message: finalMessage });

      return NextResponse.json({
        text: response.text || "",
        functionCalls: response.functionCalls || [],
        usedModel: modelName
      });
    } catch (err: any) {
      console.error(`[Mindy] Error using ${modelName}:`, err.message);
      return NextResponse.json({
        error: "Mindy system is temporarily unavailable.",
        details: err.message
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Critical API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
