const ARK_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const ARK_MODEL = 'doubao-seed-1-6-vision-250815';

const PROMPT =
  '请仔细分析图片中的题目内容，提取完整的题目文本和对应的参考答案。返回格式必须是严格的JSON：{"question":"完整的题目内容","answer":"参考答案"}。如果图片中没有答案，请将answer设为空字符串。'

interface ArkOutputItem {
  type: string;
  content?: Array<{ type: string; text?: string }> | string;
}

interface ArkApiResponse {
  choices?: Array<{ message?: { content?: string | Array<{ type: string; text?: string }> } }>;
  output?: ArkOutputItem[]; // Keep for backward compatibility
}

export async function recognizeQuestion(
  imageDataUrl: string,
  apiKey: string,
  modelOverride?: string,
): Promise<{ question: string; answer: string }> {
  apiKey = (apiKey ?? '').trim()
  if (!apiKey) {
    throw new Error('ARK API Key 未配置或为空，请在设置页面填写有效的 ARK API Key');
  }
  // helper to perform a request with timeout
  async function doRequest(bodyObj: unknown, timeout = 30000) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)
    try {
      try {
        const masked = apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : '(<empty>)'
        console.debug('[Ark] request ->', {
          endpoint: ARK_ENDPOINT,
          model: ARK_MODEL,
          maskedApiKey: masked,
          bodyPreview: JSON.stringify(bodyObj).slice(0, 200),
        })
      } catch (e) {
        /* ignore logging errors */
      }
      const res = await fetch(ARK_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(bodyObj),
        signal: controller.signal,
      })
      try {
        const rid = res.headers.get('x-request-id') || res.headers.get('x-request-Id')
        console.debug('[Ark] response status=', res.status, 'x-request-id=', rid)
      } catch (e) {
        /* ignore */
      }
      return res
    } finally {
      clearTimeout(id)
    }
  }

  const modelToUse = (modelOverride && modelOverride.trim()) || ARK_MODEL

  const baseRequest = {
    model: modelToUse,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT + '\n\nIMAGE_BASE64:\n' + imageDataUrl },
        ],
      },
    ],
    temperature: 0.1, // 降低温度以获得更准确的识别结果
    max_tokens: 2000, // 设置合理的最大 token 数
  }

  const response = await doRequest(baseRequest)
  const raw = await response.text().catch(() => '')
  if (!response.ok) {
    // throw an object containing debugResponse for callers to persist
    throw { message: `API 请求失败: ${response.status}`, debugResponse: raw }
  }

  let data: ArkApiResponse | undefined
  try {
    data = JSON.parse(raw) as ArkApiResponse
  } catch {
    // fallback to response.json if parsing failed
    try {
      data = (await (response as any).json()) as ArkApiResponse
    } catch {
      data = undefined
    }
  }

  // Extract text content from response
  let text = ''

  if (data && Array.isArray(data.output) && data.output.length > 0) {
    const item = data.output[0];
    if (typeof item.content === 'string') {
      text = item.content;
    } else if (Array.isArray(item.content)) {
      text = item.content
        .filter((c) => c.type === 'output_text' || c.type === 'text')
        .map((c) => c.text ?? '')
        .join('');
    }
  } else if (data && Array.isArray(data.choices) && data.choices.length > 0) {
    const message = data.choices[0]?.message;
    if (message) {
      if (typeof message.content === 'string') {
        text = message.content;
      } else if (Array.isArray(message.content)) {
        text = message.content
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text ?? '')
          .join('');
      }
    }
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
    // Second attempt: extract JSON object from prose using a greedy match
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { question?: string; answer?: string }
        return {
          question: parsed.question ?? text,
          answer: parsed.answer ?? '',
        }
      }
    } catch {
      // Fall through to return raw text
    }
  }

  // If response text is empty or likely unhelpful, try a fallback: send image as base64 inside text
  if (!text || text.trim().length < 10) {
    try {
      const fallbackBody = {
        model: ARK_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT + '\n\nIMAGE_BASE64:\n' + imageDataUrl },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }
      const resp2 = await doRequest(fallbackBody, 45000)
      const raw2 = await resp2.text().catch(() => '')
      if (!resp2.ok) {
        throw { message: `API 请求失败: ${resp2.status}`, debugResponse: raw2 }
      }
      let data2: ArkApiResponse | undefined
      try {
        data2 = JSON.parse(raw2) as ArkApiResponse
      } catch {
        try {
          data2 = (await (resp2 as any).json()) as ArkApiResponse
        } catch {
          data2 = undefined
        }
      }
      let t2 = ''
      if (data2 && Array.isArray(data2.output) && data2.output.length > 0) {
        const item = data2.output[0]
        if (typeof item.content === 'string') t2 = item.content
        else if (Array.isArray(item.content)) t2 = item.content.map((c) => (c as any).text ?? '').join('')
      } else if (data2 && Array.isArray(data2.choices) && data2.choices.length > 0) {
        const message = data2.choices[0]?.message;
        if (message) {
          if (typeof message.content === 'string') {
            t2 = message.content;
          } else if (Array.isArray(message.content)) {
            t2 = message.content.map((c: any) => c.text ?? '').join('');
          }
        }
      }

      // try parse json
      try {
        const direct = JSON.parse(t2.trim()) as { question?: string; answer?: string }
        return { question: direct.question ?? t2, answer: direct.answer ?? '' }
      } catch {
        const jsonMatch = t2.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as { question?: string; answer?: string }
          return { question: parsed.question ?? t2, answer: parsed.answer ?? '' }
        }
      }

      if (t2 && t2.trim().length > 0) return { question: t2, answer: '' }
    } catch (err) {
      // If fallback threw an object, propagate debugResponse via thrown object
      if (err && typeof err === 'object' && (err as any).debugResponse) throw err
      // ignore other fallback errors and return original empty result
    }
  }

  return { question: text || '（识别内容为空）', answer: '' };
}

export async function testArkKey(apiKey: string, timeout = 15000): Promise<string> {
  apiKey = (apiKey ?? '').trim()
  if (!apiKey) throw new Error('ARK API Key 未配置或为空')

  const candidateModels = [
    ARK_MODEL,
    'doubao-seed-1-6-vision-250815',
    'doubao-seed-2-0-mini-260215',
    'doubao-seed-1-6-flash-250828',
    'Doubao-Seed-1.6-flash',
    'doubao-vision-pro-32k',
    'doubao-vision-lite-32k',
    'doubao-seed-2-0-mini',
  ]

  let lastErr: any = null

  for (const model of candidateModels) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)
    try {
      const res = await fetch(ARK_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [{ type: 'text', text: '连通性测试：请简单返回字符串 OK' }],
            },
          ],
          temperature: 0.1,
          max_tokens: 100,
        }),
        signal: controller.signal,
      })

      const raw = await res.text().catch(() => '')
      if (!res.ok) {
        // capture last error and try next model
        lastErr = { status: res.status, body: raw }
        // If it's a 401/403 it's probably a key problem — stop early
        if (res.status === 401 || res.status === 403) {
          // Authentication error — give actionable message
          let helpMsg = '认证失败：请检查 ARK API Key 是否正确、是否在控制台已启用对应模型，或密钥是否过期/被撤销。'
          // try to extract server message
          try {
            const parsed = JSON.parse(raw)
            if (parsed && parsed.error && parsed.error.message) helpMsg += ` 服务器信息：${parsed.error.message}`
          } catch {}
          throw new Error(`API 请求失败: ${res.status} ${raw} — ${helpMsg}`)
        }
        continue
      }

      // parse and return
      let data: ArkApiResponse | undefined
      try {
        data = JSON.parse(raw) as ArkApiResponse
      } catch {
        try {
          data = (await (res as any).json()) as ArkApiResponse
        } catch {
          data = undefined
        }
      }

      let text = ''
      if (data && Array.isArray(data.output) && data.output.length > 0) {
        const item = data.output[0]
        if (typeof item.content === 'string') text = item.content
        else if (Array.isArray(item.content)) text = item.content.map((c) => (c as any).text ?? '').join('')
      } else if (data && Array.isArray(data.choices) && data.choices.length > 0) {
        const message = data.choices[0]?.message
        if (message) {
          if (typeof message.content === 'string') text = message.content
          else if (Array.isArray(message.content)) text = message.content.map((c: any) => c.text ?? '').join('')
        }
      }

      return `OK (model: ${model}) ` + (text || '（空响应）')
    } catch (err) {
      // If we threw due to 401/403 above, rethrow to let caller know
      if (err instanceof Error && /API 请求失败: 401|API 请求失败: 403/.test(err.message)) throw err
      lastErr = err
    } finally {
      clearTimeout(id)
    }
  }

  // none succeeded
  if (lastErr && typeof lastErr === 'object') {
    if ((lastErr as any).status) {
      throw new Error(`所有候选模型均不可用，最后一次响应: ${JSON.stringify(lastErr)}`)
    }
    throw lastErr
  }
  throw new Error('所有候选模型均不可用，未收到可用响应')
}
