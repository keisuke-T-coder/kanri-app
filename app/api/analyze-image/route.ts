import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File;
    const type = formData.get('type') as string || 'case';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    
    // Read the file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Determine the expected output format using prompt
    const prompt = type === 'case' 
      ? `あなたは業務アシスタントです。添付された水回り・設備修理の依頼書画像から以下の情報を抽出し、JSON形式でのみ出力してください。JSON全体を{}で囲み、余計なマークダウンや説明は省いてください。
      {
        "receiptNo": "受付番号",
        "receiptDate": "受付日(YYYY-MM-DD)",
        "contactTel": "連絡先TEL",
        "visitTel": "訪問先TEL",
        "visitAddress": "訪問先住所",
        "targetProduct": "対象商品（品目）",
        "targetProductCode": "対象商品（品番）",
        "usageStartDate": "使用開始年月",
        "requestDetails": "依頼内容",
        "clientMessage": "依頼元メッセージ",
        "clientCategory": "依頼分類",
        "clientName": "依頼元",
        "clientTel": "依頼元TEL",
        "clientFax": "依頼元FAX",
        "clientOrderNo": "依頼元注番"
      }`
      : `あなたは業務アシスタントです。添付された部品発注書またはラベル画像から以下の情報を抽出し、JSON形式でのみ出力してください。JSON全体を{}で囲み、余計なマークダウンや説明は省いてください。
      {
        "partName": "部品名",
        "partCode": "品番",
        "quantity": 1,
        "price": 0
      }`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: file.type
        }
      }
    ]);

    const response = await result.response;
    const text = response.text() || "";
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanText);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
