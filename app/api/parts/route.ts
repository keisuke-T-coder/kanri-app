import { NextResponse } from "next/server";

export async function GET() {
  try {
    const gasUrl = process.env.GAS_PARTS_API_URL;

    if (!gasUrl) {
      return NextResponse.json(
        { error: "GAS_PARTS_API_URL is not set" },
        { status: 500 }
      );
    }

    const url = `${gasUrl}?type=parts`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch GAS data", detail: data },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Server error", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const gasUrl = process.env.GAS_PARTS_API_URL;

    if (!gasUrl) {
      return NextResponse.json(
        { error: "GAS_PARTS_API_URL is not set" },
        { status: 500 }
      );
    }

    const body = await req.json();

    const formData = new URLSearchParams();
    formData.append("data", JSON.stringify(body));

    const res = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: formData.toString(),
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to update GAS data", detail: data },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Server error", detail: String(error) },
      { status: 500 }
    );
  }
}