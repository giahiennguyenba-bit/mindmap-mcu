import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Khởi tạo Gemini sẽ được thực hiện bên trong hàm POST để tránh lỗi cache biến môi trường.

export async function POST(req: Request) {
  console.log("Using API Key:", process.env.GEMINI_API_KEY?.slice(0, 5) + "...");
  try {
    const body = await req.json();
    const { message, history } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Nạp systemInstruction từ mindy_protocol.md
    const protocolPath = path.join(process.cwd(), ".context", "mindy_protocol.md");
    let systemInstruction = "";
    if (fs.existsSync(protocolPath)) {
      systemInstruction = fs.readFileSync(protocolPath, "utf-8");
    } else {
      console.warn("mindy_protocol.md not found, using default instruction.");
      systemInstruction = "You are Mindy. Always end response with JSON block wrapped in $$$ containing stressScore.";
    }

    // Khởi tạo thư viện bằng API Key lấy trực tiếp
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing in .env.local!");
      return NextResponse.json({ error: "Missing API Key" }, { status: 401 });
    }
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Thiết lập model chuẩn mới nhất của Google (2026) là gemini-3-flash-preview
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: systemInstruction,
      },
      // Note: History mapping in @google/genai requires `role` and `parts` or `parts: [{text}]`
      // Dashboard sends it as role (user/model) and parts (array of text).
      history: history || [],
    });

    // Gửi tin nhắn
    const response = await chat.sendMessage({ message: message });
    const text = response.text;

    // Trả về JSON thông thường (dễ dàng test qua Postman)
    // Frontend sẽ trích xuất khối $$$...$$$ từ chuỗi text này
    return NextResponse.json({ text: text });

  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
