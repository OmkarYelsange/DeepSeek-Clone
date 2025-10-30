export const maxDuration = 60;
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Chat from "../../../../models/Chat";
import connectDB from "../../../../config/db";

export async function POST(req) {
  try {
    console.log("➡️ API request received");

    const { userId } = getAuth(req);
    const { chatId, prompt } = await req.json();

    console.log("✅ User ID:", userId);
    console.log("💬 Prompt:", prompt);

    if (!userId) {
      console.log("❌ No user ID found");
      return NextResponse.json({
        success: false,
        message: "User not authenticated",
      });
    }

    await connectDB();
    console.log("✅ Connected to MongoDB");

    const chat = await Chat.findOne({ userId, _id: chatId });
    if (!chat) {
      console.log("❌ Chat not found:", chatId);
      return NextResponse.json({
        success: false,
        message: "Chat not found",
      });
    }

    // Save user prompt
    chat.messages.push({
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    });

    console.log("🚀 Sending prompt to Hugging Face...");

    // ✅ Use a working, free model
    const HF_API_URL =
      "https://api-inference.huggingface.co/models/google/flan-t5-small";

    const HF_API_KEY = process.env.HF_API_KEY;

    if (!HF_API_KEY) {
      throw new Error(
        "Hugging Face API key not found in environment variables!"
      );
    }

    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 200 },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Hugging Face API Error:", errorText);
      throw new Error("Failed to fetch response from Hugging Face");
    }

    const data = await response.json();
    console.log("✅ Hugging Face Response:", data);

    // ✅ Handle both possible output formats
    const aiReply =
      data?.[0]?.generated_text ||
      data?.generated_text ||
      data?.[0]?.summary_text ||
      "Sorry, I couldn’t generate a response.";

    const message = {
      role: "assistant",
      content: aiReply,
      timestamp: Date.now(),
    };

    chat.messages.push(message);
    await chat.save();

    console.log("✅ Chat saved successfully");
    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error("🔥 Chat AI API Error Details:");
    console.error("➡️ Message:", error.message);
    console.error("➡️ Stack:", error.stack);
    if (error.response) {
      console.error("➡️ Response:", await error.response.text());
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
