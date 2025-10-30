import connectDB from "../../../../config/db";
import Chat from "../../../../models/Chat";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Prepare the chat data to be saves in the db
    const chatData = {
      userId,
      messages: [],
      name: "New Chat",
    };

    // Connect to the db and create a new chat
    await connectDB();
    await Chat.create(chatData);

    return NextResponse.json({ success: true, message: "Chat Created" });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
