import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types for text modification (matching archive backend types)
interface TextModificationRequest {
    text: string;
    utterance: string;
    pastUtterances?: string;  // 過去の発話（「、」で区切られた文字列）
    imageBase64?: string;
    history?: TextModificationHistory[];
    historySummary?: string;
}

interface TextModificationHistory {
    utterance: string;
    editPlan: string;
    originalText: string;
    modifiedText: string;
}

interface GPTResponse {
    should_edit: 'yes' | 'no';
    plan: string;
    content: string;  // 修正後の文章全体
}

// GPT prompt matching archive backend combined_judge_plan_modify.py
function createGPTPrompt(
    text: string, 
    utterance: string, 
    pastUtterances: string,
    historySummary: string,
    history: TextModificationHistory[],
    imageBase64?: string
): any[] {
    
    // Format recent history (last 3 items)
    let historyText = '';
    if (history && history.length > 0) {
        const recentHistory = history.slice(-3);
        historyText = '編集履歴:\n' + recentHistory.map(h => 
            `- 元文章: ${h.originalText}\n  発話: ${h.utterance}\n  計画: ${h.editPlan}\n  修正後: ${h.modifiedText}\n`
        ).join('\n');
    }

    return [
        {
            role: 'system',
            content: `あなたはフリマアプリの商品説明文を改善するAIアシスタントです。

ユーザーが提供する元の商品説明文と、それに関する感想を含む発話に基づいて、以下の処理を一度に行ってください：

## ステップ1: 修正が必要かの判断
その発話が商品説明文に対するフィードバックを含んでいるかを判断してください。
- 具体的な変更指示だけでなく、「読みづらい」「情報が足りない」などのフィードバックの場合でも、修正を検討します。
- 咳払いや意味のない言葉、関係のない話題など、明らかにフィードバックでないものの場合は、修正は不要です。
- 商品説明文をそのまま読んでいるだけの場合なども想定されますが、その場合は修正は不要です。
- 「元に戻して」系の発話の場合も修正を検討します。

## ステップ2: 修正文章の生成（修正が必要な場合のみ）
修正が必要と判断した場合は、以下の方針で修正後の文章全体を生成してください：
- これまでの編集傾向は、現在の発話と矛盾しない範囲で考慮する
- ユーザーから特段指示がない限りは、文章のスタイル（箇条書き、文体など）は基本的に維持する
- 「元に戻して」系の発話の場合は、履歴から適切な過去の状態や特徴を特定して復元する
- フリマアプリの商品説明として適切な表現を心がける
- 画像の内容と説明文の整合性を確認する
- 一度の変更で文章を長くし過ぎたり、短くしすぎたりすると、ユーザーが読むのが辛くなってしまうので、修正は控えめでお願いします。

## 出力形式
以下のJSON形式で出力してください：

{
    "should_edit": "no" または "yes",
    "plan": "修正方針の説明（ユーザーが直感的に確認しやすいようになるべく短くシンプルに）",
    "content": "修正後の商品説明文全体"
}

## 注意点
- 過去の発話と現在の発話が続いている場合があるので、文脈を考慮して解釈してください。
- JSON形式のみを返してください。説明や理由は含めないでください
- 個人が出品する一点物の商品の説明文章なので、他の商品が存在することを前提とした表現や説明になることはありません
- 文章として読みやすいようにスタイルには特に気をつけてください
- 箇条書きの中に急に文章が入り込んだり、空行が変なところに入り込んだりしないように注意してください
- 元の文章に変な空行が含まれていたり、順番がおかしい場合なども、ユーザーの発話に関係なく直していいです
- 重複している項目が無いように注意してください`
        },
        {
            role: 'user',
            content: [
                { type: 'input_text', text: `元の商品説明文: ${text}` },
                { type: 'input_text', text: `ユーザーの現在の発話: ${utterance}` },
                ...(pastUtterances ? [{ type: 'input_text', text: `ユーザーの過去の発話: ${pastUtterances}` }] : []),
                ...(historySummary ? [{ type: 'input_text', text: `これまでの編集傾向:\n${historySummary}` }] : []),
                ...(historyText ? [{ type: 'input_text', text: historyText }] : []),
                ...(imageBase64 ? [{
                    type: 'input_image',
                    image_url: `data:image/jpeg;base64,${imageBase64}`
                }] : [])
            ]
        }
    ];
}


export async function POST(request: NextRequest) {
    try {
        const body: TextModificationRequest = await request.json();
        const { text, utterance, pastUtterances = '', imageBase64, history = [], historySummary = '' } = body;

        if (!text || !utterance) {
            return NextResponse.json(
                { error: 'text and utterance are required' },
                { status: 400 }
            );
        }

        // Create GPT prompt
        const messages = createGPTPrompt(text, utterance, pastUtterances, historySummary, history, imageBase64);

        // Call OpenAI API
        const result = await client.responses.create({
            model: 'gpt-5-nano',
            input: messages,
            reasoning: { effort: "minimal" },
            max_output_tokens: 1000,
        });

        const gptResponse = (result.output_text ?? '').trim();

        if (!gptResponse) {
            // デバッグ時に中身を見る
            console.error('response.output (debug):', result.output);
            throw new Error('No response from GPT');
        }

        // Parse GPT JSON response
        let parsedResponse: GPTResponse;
        try {
            parsedResponse = JSON.parse(gptResponse);
        } catch {
            console.error('Failed to parse GPT response:', gptResponse);
            return NextResponse.json({
                shouldEdit: false,
                error: 'Failed to parse GPT response'
            });
        }

        // If no edit needed, return early
        if (parsedResponse.should_edit === 'no') {
            return NextResponse.json({
                shouldEdit: false,
                plan: ''
            });
        }

        // Return the modified text
        if (parsedResponse.should_edit === 'yes' && parsedResponse.content) {
            return NextResponse.json({
                shouldEdit: true,
                modifiedText: parsedResponse.content,
                plan: parsedResponse.plan
            });
        }

        return NextResponse.json({
            shouldEdit: false,
            plan: ''
        });

    } catch (error) {
        console.error('Text modification error:', error);
        return NextResponse.json(
            { 
                error: 'Failed to process text modification',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}