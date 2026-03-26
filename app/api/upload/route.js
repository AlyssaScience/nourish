import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const INBOX_DIR = path.join(process.cwd(), "data", "inbox");

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Ensure inbox directory exists
    if (!fs.existsSync(INBOX_DIR)) {
      fs.mkdirSync(INBOX_DIR, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate filename with timestamp
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `meal_${Date.now()}.${ext}`;
    const filePath = path.join(INBOX_DIR, filename);

    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      success: true,
      filename,
      path: `/data/inbox/${filename}`,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
