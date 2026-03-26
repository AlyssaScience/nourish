import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const { action, imageBase64, mediaType, preferences, fridgeItems } =
      await request.json();

    let systemPrompt = "";
    let userContent = [];

    if (action === "analyze-meal") {
      systemPrompt =
        "You are a nutrition expert. Analyze food photos and provide calorie/macro estimates. Always respond in valid JSON only. Be reasonably accurate with portion estimates based on visual cues.";
      userContent = [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: imageBase64,
          },
        },
        {
          type: "text",
          text: 'Analyze this meal photo. Identify each food item and estimate calories, protein (g), carbs (g), and fat (g) for each. Then provide a total. Respond in this exact JSON format only, no other text:\n{"items":[{"name":"string","calories":number,"protein":number,"carbs":number,"fat":number,"portion":"string"}],"total":{"calories":number,"protein":number,"carbs":number,"fat":number},"summary":"A brief 1-sentence health note about this meal"}',
        },
      ];
    } else if (action === "scan-fridge") {
      systemPrompt =
        'You are a food identification expert. Identify all visible food items in fridge/pantry photos. Be specific (e.g., "baby spinach" not just "greens"). Respond in valid JSON only.';
      userContent = [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: imageBase64,
          },
        },
        {
          type: "text",
          text: 'Look at this fridge/pantry photo and identify all visible food items. For each item, categorize it. Respond in this exact JSON format only:\n{"items":[{"name":"string","category":"produce|protein|dairy|grains|condiments|frozen|beverages|other"}]}',
        },
      ];
    } else if (action === "plan-meals") {
      systemPrompt =
        "You are a creative home chef and nutritionist. Suggest practical, delicious meals based on available ingredients. Be creative but realistic. Respond in valid JSON only.";
      const fridgeList = (fridgeItems || []).join(", ");
      userContent = [
        {
          type: "text",
          text: `My fridge currently has: ${fridgeList || "Nothing listed yet"}.\n\n${preferences ? "My preferences/dietary needs: " + preferences : ""}\n\nPlease suggest 3 meals I can make. For each meal, tell me what I have and what I might need to buy. Respond in this exact JSON format only:\n{"meals":[{"name":"string","description":"string","haveIngredients":["string"],"needIngredients":["string"],"estimatedCalories":number,"cookTime":"string","difficulty":"easy|medium|hard"}],"shoppingList":["string"]}`,
        },
      ];
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Could not parse AI response" },
        { status: 500 }
      );
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error("Claude API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
