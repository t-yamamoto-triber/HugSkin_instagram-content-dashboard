import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { theme, refPostCaption, regulation, feedback, previousProposals, round } =
    await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 500 });
  }

  const systemPrompt = `あなたはInstagramブランドアカウントの運用を支援するコピーライターです。
日本語でInstagramキャプションの案を3つ生成してください。

【ルール】
- 各案は本文＋ハッシュタグで構成する
- 本文は自然で読みやすい日本語
- ハッシュタグは末尾にまとめて、最大30個
- 合計2200文字以内
- 各案は「---案N---」で区切る（N=1,2,3）
- ブランドレギュレーションがあれば必ず遵守する

${regulation ? `【ブランドレギュレーション】\n${regulation}` : ""}`;

  const userLines: string[] = [];

  if (refPostCaption) {
    userLines.push(`【参考にした競合投稿のキャプション】\n${refPostCaption}`);
  }
  if (theme) {
    userLines.push(`【今回の投稿テーマ】\n${theme}`);
  }
  if (round > 1 && previousProposals?.length) {
    userLines.push(
      `【前回の提案（ラウンド${round - 1}）】\n${previousProposals.join("\n\n---\n\n")}`
    );
    userLines.push(
      `【修正フィードバック】\n${feedback || "（フィードバックなし）"}\n\n上記を踏まえて新しい3案を提案してください。`
    );
  } else {
    userLines.push("上記の情報をもとにInstagramキャプションを3案提案してください。");
  }

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: userLines.join("\n\n") }],
      system: systemPrompt,
    });

    const raw = (message.content[0] as { type: string; text: string }).text;

    // Split by ---案N--- delimiters; index 0 is preamble (ignored), 1/2/3 are proposals
    const parts = raw.split(/---案\d+---/);
    const proposals = [1, 2, 3].map((i) => (parts[i] ?? "").trim() || "（生成できませんでした）");

    return NextResponse.json({ proposals });
  } catch (e) {
    return NextResponse.json({ error: "Claude API error", detail: String(e) }, { status: 500 });
  }
}
