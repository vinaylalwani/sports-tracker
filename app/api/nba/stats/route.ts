// app/api/risk/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * GET /api/risk
 * Returns player injury risk predictions from trained ML model
 */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "ml/player_risk_predictions.json");
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "ML predictions file not found. Run train_model.py first." },
        { status: 500 }
      );
    }

    const data = fs.readFileSync(filePath, "utf8");
    const predictions = JSON.parse(data);

    return NextResponse.json(predictions);
  } catch (error) {
    console.error("Error reading ML predictions:", error);
    return NextResponse.json(
      { error: "Failed to load predictions" },
      { status: 500 }
    );
  }
}