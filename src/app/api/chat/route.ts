import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Khởi tạo Gemini sẽ được thực hiện bên trong hàm POST để tránh lỗi cache biến môi trường.

export async function POST(req: Request) {
  console.log("Using API Key:", process.env.GEMINI_API_KEY?.slice(0, 5) + "...");
  try {
    const body = await req.json();
    const { message, history, userName, calendarData } = body;

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

    // Tiền xử lý dữ liệu Google Calendar (nếu có)
    let finalMessage = message;
    if (calendarData && Array.isArray(calendarData) && calendarData.length > 0) {
      const calendarContext = calendarData.map(event => {
        const start = event.start?.dateTime || event.start?.date || "Unknown start";
        const end = event.end?.dateTime || event.end?.date || "Unknown end";
        const summary = event.summary || "Untitled Event";
        return `- Event: ${summary}, Start: ${start}, End: ${end}`;
      }).join('\n');

      finalMessage = `
User's Current Schedule:
${calendarContext}

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
      model: "gemini-2.5-flash-lite",
      config: {
        systemInstruction: systemInstruction,
      },
      // Note: History mapping in @google/genai requires `role` and `parts` or `parts: [{text}]`
      // Dashboard sends it as role (user/model) and parts (array of text).
      history: history || [],
    });

    // Gửi tin nhắn (đã bọc context lịch nếu có)
    const response = await chat.sendMessage({ message: finalMessage });
    const text = response.text;

    // Trả về JSON thông thường (dễ dàng test qua Postman)
    // Frontend sẽ trích xuất khối $$$...$$$ từ chuỗi text này
    return NextResponse.json({ text: text });

  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
