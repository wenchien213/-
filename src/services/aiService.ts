import { GoogleGenAI, Type } from "@google/genai";
import { Character } from "../types";

export async function analyzeDiary(
  date: string,
  tags: string[],
  diary: string,
  userApiKey?: string | null
) {
  const apiKey = userApiKey || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("系統配置錯誤：找不到 API 金鑰。請檢查 Secrets 設定。");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    根據「全腦人生」(Whole Brain Living) 的理論，分析以下用戶的今日記錄。
    日期：${date}
    選擇的情緒標籤：${tags.join(', ')}
    日記內容：${diary}

    請根據這些資訊，判定用戶今天四個大腦人格（Character 1-4）的使用比例（百分比，總和為 100）。
    並提供一段古今中外知名偉人的名言來勉勵用戶，以及一段針對用戶今日狀態的建議。

    人格定義簡述：
    1號：邏輯、組織、理性、細節。
    2號：警覺、恐懼、焦慮、過去。
    3號：玩心、創意、冒險、當下。
    4號：平靜、連結、靈性、感恩。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scores: {
              type: Type.OBJECT,
              properties: {
                1: { type: Type.NUMBER },
                2: { type: Type.NUMBER },
                3: { type: Type.NUMBER },
                4: { type: Type.NUMBER },
              },
              required: ["1", "2", "3", "4"]
            },
            quote: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                author: { type: Type.STRING }
              },
              required: ["text", "author"]
            },
            advice: { type: Type.STRING }
          },
          required: ["scores", "quote", "advice"]
        }
      }
    });

    if (!response.text) {
      throw new Error("AI 模型回傳空內容。可能觸發了安全過濾或其他限制。");
    }

    const result = JSON.parse(response.text.trim());
    return result;
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    if (error.message?.includes("429")) {
      throw new Error("分析頻率過高 (Quota Exceeded)，請稍候再試。");
    }
    if (error.message?.includes("403")) {
      throw new Error("API 金鑰無權限或已被封鎖，請嘗試更換金鑰。");
    }
    throw new Error(error.message || "AI 分析過程中發生未知錯誤。");
  }
}
