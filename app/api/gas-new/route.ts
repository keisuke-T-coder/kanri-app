import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "getCases";
  const caseId = searchParams.get("caseId") || "";

  try {
    const gasUrl = process.env.NEXT_PUBLIC_NEW_GAS_URL;
    if (!gasUrl) {
      throw new Error("NEXT_PUBLIC_NEW_GAS_URL is not configured.");
    }
    
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      params.append(key, value);
    });
    // id/caseIdの互換性のための処理
    if (caseId && !params.has("id")) params.append("id", caseId);

    const url = `${gasUrl}?${params.toString()}`;

    const res = await fetch(url, { cache: "no-store", headers: { 'Content-Type': 'application/json' }});
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.details || "GAS request failed");
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const gasUrl = process.env.NEXT_PUBLIC_NEW_GAS_URL;
    if (!gasUrl) {
      throw new Error("NEXT_PUBLIC_NEW_GAS_URL is not configured.");
    }
    
    const body = await req.json();
    const response = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return NextResponse.json({ error: "GAS returned non-JSON response", details: "GAS側の処理でエラーが発生しました。" }, { status: response.status });
    }

    if (!response.ok) {
      return NextResponse.json(data || { error: "GAS Request failed" }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
