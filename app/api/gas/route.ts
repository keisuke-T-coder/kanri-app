import { NextResponse } from 'next/server';

const GAS_URL = "https://script.google.com/macros/s/AKfycbzUNj7zvj3lNyiVw9Ru8maYy68PCsNkKrGhXdsxbRXaOQtJeo7QVfvUCkktWStpedlU/exec";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "cases";
  const caseId = searchParams.get("caseId") || "";

  try {
    let url = `${GAS_URL}?type=${type}`;
    if (caseId) url += `&caseId=${caseId}`;

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
    const body = await req.json();
    const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: JSON.stringify(body) })
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
