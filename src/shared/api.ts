const ARK_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/responses';
const ARK_MODEL = 'doubao-seed-2-0-mini-260215';

const PROMPT =
  '请识别图中的题目，提取题目内容和参考答案，以JSON格式返回，格式为：{"question":"题目内容","answer":"参考答案"}';

interface ArkOutputItem {
  type: string;
  content?: Array<{ type: string; text?: string }> | string;
}

interface ArkApiResponse {
  output?: ArkOutputItem[];
  // some versions wrap in choices
  choices?: Array<{ message?: { content?: string } }>;
}

export async function recognizeQuestion(
  imageDataUrl: string,
  apiKey: string,
): Promise<{ question: string; answer: string }> {
  if (!apiKey) {
    throw new Error('ARK API Key 未配置，请在设置页面填写 ARK API Key');
  }

  const response = await fetch(ARK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: ARK_MODEL,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_image', image_url: imageDataUrl },
            { type: 'input_text', text: PROMPT },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`API 请求失败: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as ArkApiResponse;

  // Extract text content from response
  let text = '';

  if (Array.isArray(data.output) && data.output.length > 0) {
    const item = data.output[0];
    if (typeof item.content === 'string') {
      text = item.content;
    } else if (Array.isArray(item.content)) {
      text = item.content
        .filter((c) => c.type === 'output_text' || c.type === 'text')
        .map((c) => c.text ?? '')
        .join('');
    }
  } else if (Array.isArray(data.choices) && data.choices.length > 0) {
    text = data.choices[0]?.message?.content ?? '';
  }

  // Try to parse JSON from the response text
  try {
    // First attempt: the whole response might be JSON
    const direct = JSON.parse(text.trim()) as { question?: string; answer?: string };
    return {
      question: direct.question ?? text,
      answer: direct.answer ?? '',
    };
  } catch {
    // Second attempt: extract JSON object from prose
    try {
      const jsonMatch = text.match(/\{[^{}]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { question?: string; answer?: string };
        return {
          question: parsed.question ?? text,
          answer: parsed.answer ?? '',
        };
      }
    } catch {
      // Fall through to return raw text
    }
  }

  return { question: text || '（识别内容为空）', answer: '' };
}
