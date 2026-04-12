import { NextResponse } from 'next/server';

const GAS_URL = process.env.NEXT_PUBLIC_NEW_GAS_URL || "";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  
  try {
    if (!GAS_URL) throw new Error("GAS_URL is not defined in environment variables");

    const gasUrlWithParams = `${GAS_URL}?${searchParams.toString()}`;
    const res = await fetch(gasUrlWithParams, { 
      cache: "no-store", 
      headers: { 'Accept': 'application/json' }
    });
    
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("GAS Proxy GET - Failed to parse JSON. Response body:", text);
      throw new Error(`GASからの応答がJSONではありませんでした。 (内容: ${text.substring(0, 100)}...)`);
    }

    if (!res.ok) throw new Error(data.error || "Failed to fetch from GAS");
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GAS Proxy GET Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!GAS_URL) throw new Error("GAS_URL is not defined in environment variables");

    const contentType = req.headers.get("content-type") || "";
    let body;

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const text = await req.text();
      const params = new URLSearchParams(text);
      const dataStr = params.get("data");
      body = dataStr ? JSON.parse(dataStr) : {};
    }

    const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        body: new URLSearchParams({ data: JSON.stringify(body) })
    });
    
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("GAS Proxy POST - Failed to parse JSON. Response body:", text);
      throw new Error(`GASからの応答がJSONではありませんでした。 (内容: ${text.substring(0, 100)}...)`);
    }

    if (!res.ok) throw new Error(data.error || "Failed to post to GAS");
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GAS Proxy POST Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
