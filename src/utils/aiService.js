/* DeepSeek 大模型共享服务
 * 文本模型：deepseek-flash（即 deepseek-v4-flash）
 * 视觉模型：deepseek-v4-flash-vision-exp
 * OpenAI 兼容格式，端点 https://api.deepseek.com/chat/completions
 *
 * 使用：
 *   import { callAI, compressImage } from '@/utils/aiService'
 *   const result = await callAI({
 *     messages: [{role:'user',content:'你好'}],
 *     system: '你是中医养生顾问',
 *     imageUrl: '',           // 可选，base64 data URL 或公网 URL
 *     onStage: (label) => {}, // 可选，状态回调
 *   })
 *   // result = { success: true, text: '...', label: '直连·Flash' }
 *   // 或     = { success: false, text: '本地兜底回答', label: '', status: 429, hint: '错误提示' }
 */

const API_KEY = 'sk-5f223cfad7fa435da12b65e7d109e715'

function buildHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + API_KEY
  }
}

/* 兼容提取 DeepSeek 响应里的文字（string / multimodal-array / reasoning_content） */
function extractContent(data) {
  const msg = data?.choices?.[0]?.message
  if (!msg) return ''
  if (typeof msg.content === 'string' && msg.content) return msg.content
  if (Array.isArray(msg.content)) {
    const pieces = []
    for (const seg of msg.content) {
      if (!seg) continue
      if (typeof seg === 'string') pieces.push(seg)
      else if (seg.type === 'text' && seg.text) pieces.push(seg.text)
    }
    const joined = pieces.join('').trim()
    if (joined) return joined
  }
  if (typeof msg.reasoning_content === 'string' && msg.reasoning_content) {
    return msg.reasoning_content
  }
  return ''
}

/* 图片压缩：最大边 1024px，转 JPEG base64 data URL */
export function compressImage(file, maxSide = 1024, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxSide || height > maxSide) {
          if (width >= height) { height = Math.round(height * (maxSide / width)); width = maxSide }
          else { width = Math.round(width * (maxSide / height)); height = maxSide }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 统一调用 DeepSeek 大模型
 * @param {Object} opts
 * @param {Array}  opts.messages - [{role, content}] 数组，最后一条应该是当前 user 消息
 * @param {string} opts.system   - system prompt
 * @param {string} opts.imageUrl - 可选，当前这条 user 消息的图片 URL / base64
 * @param {Function} opts.onStage - 可选，状态回调 (label: string) => void
 * @param {string} opts.fallback - 可选，调用全部失败后的兜底文本（不传则返回空串）
 * @returns {Promise<{success:boolean, text:string, label?:string, status?:number, hint?:string}>}
 */
export async function callAI({ messages, system, imageUrl = '', onStage, fallback = '' }) {
  const hasImage = !!imageUrl
  // 历史消息中带 image 字段的 user 消息，把图片转为占位文字（纯文本模型可读）
  const normalizedHistory = messages.slice(0, -1).map(m => {
    if (m.role === 'user' && m.image) {
      const text = typeof m.content === 'string' ? m.content : ''
      const desc = text
        ? text + '（用户同时上传了一张图片，请结合上下文综合判断）'
        : '（用户上传了一张图片，请结合上下文综合判断）'
      return { role: 'user', content: desc }
    }
    return { role: m.role, content: typeof m.content === 'string' ? m.content : '' }
  })

  // 候选模型列表：有图时首选视觉模型，无图时首选文本模型
  const candidates = hasImage
    ? [
        { endpoint: 'https://api.deepseek.com/chat/completions', model: 'deepseek-v4-flash-vision-exp', label: '直连·V4-Flash-Vision', vision: true },
        { endpoint: '/ds-api/chat/completions', model: 'deepseek-v4-flash-vision-exp', label: '代理·V4-Flash-Vision', vision: true },
        { endpoint: 'https://api.deepseek.com/chat/completions', model: 'deepseek-flash', label: '直连·Flash(兜底)', vision: false },
        { endpoint: '/ds-api/chat/completions', model: 'deepseek-flash', label: '代理·Flash(兜底)', vision: false }
      ]
    : [
        { endpoint: 'https://api.deepseek.com/chat/completions', model: 'deepseek-flash', label: '直连·Flash', vision: false },
        { endpoint: '/ds-api/chat/completions', model: 'deepseek-flash', label: '代理·Flash', vision: false }
      ]

  const MAX_RETRIES = 3
  let lastStatus = 0
  let lastErrMsg = ''
  let replyText = ''
  let finalLabel = ''

  outer: for (let ci = 0; ci < candidates.length; ci++) {
    const { endpoint, model, label, vision } = candidates[ci]

    // 为当前候选构建 messages（视觉模型用数组 content + 图片；纯文本模型用 string + 图片占位）
    let currentUserContent
    let currentSystem
    const rawLastUser = messages[messages.length - 1]
    const rawLastText = typeof rawLastUser?.content === 'string' ? rawLastUser.content : ''
    if (vision && hasImage) {
      currentUserContent = [
        ...(rawLastText ? [{ type: 'text', text: rawLastText }] : []),
        { type: 'image_url', image_url: { url: imageUrl } }
      ]
      currentSystem = system || '你是一位专业的中医养生顾问，请结合用户上传的图片和问题给出中医角度的分析与建议。先简要描述你看到的图片内容，再给出针对性建议。用 emoji 和换行排版，控制在 300 字以内。'
    } else if (!vision && hasImage) {
      const desc = rawLastText
        ? rawLastText + '（用户同时上传了一张图片，我暂时无法直接看到图片内容，请基于用户描述给出建议，并提醒用户下次详细描述图片内容或稍后再试）'
        : '（用户上传了一张图片，但我暂时无法直接看图，请让用户描述图片内容后再给出建议）'
      currentUserContent = desc
      currentSystem = system || '你是一位专业的中医养生顾问，请用简洁的中文给出实用的建议。用 emoji 和换行排版，控制在 200 字以内。'
    } else {
      currentUserContent = rawLastText || ''
      currentSystem = system || '你是一位专业的中医养生顾问，请用简洁的中文给出实用的建议。用 emoji 和换行排版，控制在 200 字以内。'
    }

    const apiMessages = [
      { role: 'system', content: currentSystem },
      ...normalizedHistory,
      { role: 'user', content: currentUserContent }
    ]
    const payload = {
      model,
      messages: apiMessages,
      temperature: 0.7,
      max_tokens: 800,
      stream: false
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const stage = attempt === 0
          ? `🤔 ${label}（第1次）`
          : `🤔 ${label} 第${attempt + 1}次…`
        if (onStage) onStage(stage)

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify(payload),
          cache: 'no-store'
        })
        lastStatus = res.status
        let body = null
        try { body = await res.json() } catch (_) { body = null }

        if (res.status === 429) {
          const errMsg = body?.error?.message || ''
          lastErrMsg = errMsg
          const retryAfterHeader = res.headers.get('Retry-After') || res.headers.get('retry-after')
          let retryMs
          if (retryAfterHeader && !isNaN(parseInt(retryAfterHeader, 10))) {
            retryMs = parseInt(retryAfterHeader, 10) * 1000 + 500
          } else {
            retryMs = Math.max(2, Math.pow(2, attempt + 2)) * 1000
          }
          if (attempt < MAX_RETRIES - 1) {
            if (onStage) onStage(`🤕 ${label} 限流，${(retryMs / 1000).toFixed(0)}s 后第${attempt + 2}次…`)
            await new Promise(r => setTimeout(r, retryMs))
            continue
          }
          continue outer
        }

        if (res.status === 401 || res.status === 403 || res.status === 400) {
          if (body?.error) lastErrMsg = body.error.message || body.error
          break outer
        }

        if (!res.ok) {
          if (body?.error) lastErrMsg = body.error.message || body.error
          continue
        }

        const extracted = body ? extractContent(body) : ''
        if (extracted) {
          replyText = extracted
          finalLabel = label
          break outer
        }
        lastErrMsg = '响应 200 但无内容'
        continue outer
      } catch (err) {
        lastStatus = -1
        lastErrMsg = (err && err.message) || 'Network/CORS Error'
        break outer
      }
    }
  }

  if (replyText) {
    if (onStage) onStage(`✅ 调用成功 · ${finalLabel}（${replyText.length}字）`)
    return { success: true, text: replyText, label: finalLabel }
  }

  let hint = ''
  if (lastStatus === 429) {
    hint = '🤕 大模型全部限流，等一会再试～'
    if (lastErrMsg) hint += ` 服务端：${lastErrMsg}`
  } else if (lastStatus === 401 || lastStatus === 403) {
    hint = '🔑 API Key 无效或已过期，请检查 https://platform.deepseek.com/api_keys'
  } else if (lastStatus === 400) {
    hint = `⚠️ 请求格式错误：${lastErrMsg}`
  } else if (lastStatus >= 500) {
    hint = `💥 DeepSeek 服务器异常（HTTP ${lastStatus}）`
  } else if (lastStatus === -1) {
    hint = `🌐 网络/CORS 错误：${lastErrMsg || '未知'}`
  } else {
    hint = `⚠️ 未收到有效回答（HTTP ${lastStatus}）${lastErrMsg ? ' · ' + lastErrMsg : ''}`
  }
  if (onStage) onStage(`⚠️ 调用失败（HTTP ${lastStatus}）`)

  return {
    success: false,
    text: fallback || '',
    label: '',
    status: lastStatus,
    hint
  }
}
