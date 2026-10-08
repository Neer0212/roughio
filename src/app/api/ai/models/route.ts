import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.APINEX_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "APINEX_API_KEY is missing" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch("https://api.apinex.bond/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });

    const data = await response.json();

    console.log("APInex models status:", response.status);
    console.log("APInex models:", data);

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("Models error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}