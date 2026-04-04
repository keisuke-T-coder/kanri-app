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
    
    let url = `${gasUrl}?action=${action}`;
    if (caseId) url += `&id=${caseId}&caseId=${caseId}`;

    const res = await fetch(url, { cache: "no-store", headers: { 'Content-Type': 'application/json' }});
    if (!res.ok) throw new Error("Failed to fetch from GAS");
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
    const res = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
