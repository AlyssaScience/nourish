import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

const VALID_TYPES = ["pending_meals", "fridge", "meal_plans"];

function getFilePath(type) {
  if (!VALID_TYPES.includes(type)) return null;
  return path.join(DATA_DIR, `${type}.json`);
}

function readJsonFile(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// GET /api/data?type=pending_meals|fridge|meal_plans
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const filePath = getFilePath(type);
  if (!filePath) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const fallback = type === "meal_plans" ? {} : [];
  const data = readJsonFile(filePath, fallback);
  return NextResponse.json(data);
}

// POST /api/data
// Body: { type, action, payload }
export async function POST(request) {
  try {
    const { type, action, payload } = await request.json();

    const filePath = getFilePath(type);
    if (!filePath) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    if (type === "pending_meals") {
      const meals = readJsonFile(filePath, []);

      if (action === "approve") {
        // Remove meal from pending by id
        const updated = meals.filter((m) => m.id !== payload.id);
        writeJsonFile(filePath, updated);
        return NextResponse.json({ success: true, approved: meals.find((m) => m.id === payload.id) });
      }

      if (action === "reject") {
        const updated = meals.filter((m) => m.id !== payload.id);
        writeJsonFile(filePath, updated);
        return NextResponse.json({ success: true });
      }

      if (action === "update") {
        const updated = meals.map((m) => (m.id === payload.id ? { ...m, ...payload } : m));
        writeJsonFile(filePath, updated);
        return NextResponse.json({ success: true });
      }
    }

    if (type === "fridge") {
      if (action === "set") {
        writeJsonFile(filePath, payload);
        return NextResponse.json({ success: true });
      }

      if (action === "add") {
        const items = readJsonFile(filePath, []);
        items.push(payload);
        writeJsonFile(filePath, items);
        return NextResponse.json({ success: true });
      }

      if (action === "remove") {
        const items = readJsonFile(filePath, []);
        const updated = items.filter((it) => it.id !== payload.id);
        writeJsonFile(filePath, updated);
        return NextResponse.json({ success: true });
      }
    }

    if (type === "meal_plans") {
      if (action === "set") {
        writeJsonFile(filePath, payload);
        return NextResponse.json({ success: true });
      }

      if (action === "clear") {
        writeJsonFile(filePath, {});
        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Data API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
