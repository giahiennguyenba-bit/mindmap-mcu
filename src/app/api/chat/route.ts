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
    systemInstruction += `\nBạn đang trò chuyện với ${userName || 'người dùng'}. Hãy thỉnh thoảng gọi tên họ một cách tự nhiên và ấm áp để tăng sự gắn kết.`;
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

    // Thiết lập model sử dụng gemini-2.5-flash-lite để tối ưu hoá token và tốc độ theo yêu cầu
    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemInstruction,
        tools: [{
          functionDeclarations: [
            {
              name: "add_healing_block",
              description: "BẮT BUỘC GỌI HÀM NÀY ĐỂ THÊM LỊCH. Khi người dùng đồng ý nghỉ ngơi hoặc bạn muốn thêm 1 block chữa lành vào lịch trình của họ, bạn PHẢI gọi hàm này. KHÔNG ĐƯỢC CHỈ TRẢ LỜI BẰNG CHỮ.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: "Tên hoạt động ngắn gọn, sáng tạo (vd: 'Campus Drift', 'Breathwork')."
                  },
                  startTime: {
                    type: Type.STRING,
                    description: "Thời gian bắt đầu, định dạng HH:mm (ví dụ: '14:00')"
                  },
                  endTime: {
                    type: Type.STRING,
                    description: "Thời gian kết thúc, định dạng HH:mm (ví dụ: '16:00')"
                  },
                  dayOfWeek: {
                    type: Type.INTEGER,
                    description: "Ngày trong tuần (0: Sunday, 1: Monday, ..., 6: Saturday). Nếu là hôm nay thì truyền vào index của hôm nay."
                  },
                  location: {
                    type: Type.STRING,
                    description: "Địa điểm đề xuất (Ví dụ: The Slope, Library). Tùy chọn."
                  },
                  ai_note: {
                    type: Type.STRING,
                    description: "Lý do nội bộ của Mindy cho block này (ví dụ: 'Suggested by Mindy based on your high academic load.')."
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
          }
        }
      },
      // Note: History mapping in @google/genai requires `role` and `parts` or `parts: [{text}]`
      // Dashboard sends it as role (user/model) and parts (array of text).
      history: history || [],
    });

    // Gửi tin nhắn (đã bọc context)
    const response = await chat.sendMessage({ message: finalMessage });

    // SDK @google/genai sử dụng property thay vì method
    const text = response.text || "";
    const functionCalls = response.functionCalls || [];

    if (functionCalls.length > 0) {
      console.log("Mindy is calling tools:", JSON.stringify(functionCalls, null, 2));
    }

    // Trả về JSON thông thường (dễ dàng test qua Postman)
    return NextResponse.json({
      text: text,
      functionCalls: functionCalls || []
    });

  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
