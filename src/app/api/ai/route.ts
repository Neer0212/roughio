import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.APINEX_API_KEY;

    if (!apiKey) {
      console.error("APINEX_API_KEY is missing");

      return NextResponse.json(
        { error: "APInex API key is not configured" },
        { status: 500 }
      );
    }

    console.log("Sending request to APInex...");

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 30000);

    let response: Response;

    try {
      response = await fetch(
        "https://api.apinex.bond/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "free/gpt-6-luna",
            messages: [
              {
                role: "user",
                content: message,
              },
            ],
            stream: false,
          }),
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    const data = await response.json();

    console.log("APInex status:", response.status);
    console.log("APInex response:", data);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "APInex request failed",
          details: data,
        },
        { status: response.status }
      );
    }

    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      return NextResponse.json(
        {
          error: "APInex returned no message",
          details: data,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      reply,
    });
  } catch (error: unknown) {
    console.error("AI route error:", error);

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        {
          error: "APInex request timed out after 30 seconds",
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}