import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const prompt = `あなたは業務アシスタントです。
提供されたテキストは、外部AIによって画像から抽出された「修理部品のリスト」です。
この情報を解析し、以下の構造を持つJSON配列として出力してください。

【出力形式（JSON配列のみ）】
[
  {
    "partName": "部品名",
    "partCode": "品番",
    "quantity": 1,
    "price": 0
  }
]

【ルール】
- 余計な説明（「了解しました」「ここに出力します」など）は一切不要です。
- JSON全体を[]で囲んで出力してください。
- 数量や金額が数字でない場合は、推測して数値に変換してください（例：1個 → 1, 1000円 → 1000）。
- 不明な項目がある場合は、空文字列（""）または 0 を入れてください。

【解析対象テキスト】
${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const cleanText = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanText);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("Gemini Text Analysis Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
