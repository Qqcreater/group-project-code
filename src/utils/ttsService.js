/* TTS 服务：优先豆包（火山引擎 TTS），未配置凭证或调用失败时回退浏览器语音 */

const CFG_KEY = 'zy_doubao_tts'

/* 读取/保存豆包 TTS 配置 { appid, token, cluster, voice } */
export function loadTtsConfig() {
  try {
    const cfg = JSON.parse(localStorage.getItem(CFG_KEY))
    return cfg && cfg.appid && cfg.token ? cfg : null
  } catch (_) { return null }
}
export function saveTtsConfig(cfg) {
  if (cfg && cfg.appid && cfg.token) localStorage.setItem(CFG_KEY, JSON.stringify(cfg))
  else localStorage.removeItem(CFG_KEY)
}

/* 豆包常用音色（火山引擎 mars_bigtts 系列） */
export const DOUBAO_VOICES = [
  { id: 'zh_female_cancan_mars_bigtts', name: '灿灿 · 活泼女声' },
  { id: 'zh_female_yujie_mars_bigtts', name: '御姐 · 知性女声' },
  { id: 'zh_female_shuangkuai_mars_bigtts', name: '爽快 · 干练女声' },
  { id: 'zh_female_wanwanxiaohe_mars_bigtts', name: '湾湾小何 · 温柔女声' },
  { id: 'zh_female_wanqudashu_mars_bigtts', name: '顽趣大叔 · 男声' },
  { id: 'zh_male_beijingxiaoye_mars_bigtts', name: '北京小哥 · 男声' }
]

let currentAudio = null

/* 挑选浏览器最优中文女声（回退用） */
function pickBrowserVoice() {
  const voices = window.speechSynthesis.getVoices().filter(v => /^zh/i.test(v.lang))
  const prefer = [/Google\s*普通话/i, /Xiaoxiao|晓晓/i, /Yaoyao|姚瑶/i, /Huihui|慧慧/i, /female|女/i]
  for (const re of prefer) {
    const hit = voices.find(v => re.test(v.name))
    if (hit) return hit
  }
  return voices[0] || null
}

/* 豆包 TTS：返回已创建的 Audio，失败抛错 */
async function doubaoTts(text, cfg) {
  const res = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer;' + cfg.token
    },
    body: JSON.stringify({
      app: { appid: cfg.appid, token: 'access_token', cluster: cfg.cluster || 'volcano_tts' },
      user: { uid: 'xiaoyi-user' },
      audio: { voice_type: cfg.voice || 'zh_female_cancan_mars_bigtts', encoding: 'mp3', speed_ratio: 1.0 },
      request: { reqid: 'req-' + Date.now() + '-' + Math.floor(Math.random() * 1e6), text, operation: 'query' }
    })
  })
  if (!res.ok) throw new Error('豆包TTS HTTP ' + res.status)
  const data = await res.json()
  if (data.code !== 3000 || !data.data) throw new Error('豆包TTS ' + (data.message || ('code ' + data.code)))
  const bin = atob(data.data)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/mp3' })))
}

/* 浏览器语音播报（回退）；onPulse 在每个词语边界触发，用于口型节奏 */
function speakBrowser(text, onStart, done, onPulse) {
  if (!('speechSynthesis' in window)) { done(); return }
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'
  const v = pickBrowserVoice()
  if (v) u.voice = v
  u.onstart = () => onStart && onStart()
  u.onboundary = () => onPulse && onPulse()
  u.onend = done
  u.onerror = done
  window.speechSynthesis.speak(u)
}

/* ===== 口型振幅回调（0~1，约每 50ms 一次） ===== */
let ampTimer = 0
let ampLevel = 0
let currentAnalyser = null
let audioCtx = null

function _stopAmp() {
  if (ampTimer) { clearInterval(ampTimer); ampTimer = 0 }
  currentAnalyser = null
  ampLevel = 0
}
/* 启动振幅输出；mode: analyser=真实音频分析, pulse=边界事件脉冲 */
function _startAmp(mode, onAmp) {
  _stopAmp()
  if (!onAmp) return
  ampTimer = setInterval(() => {
    if (mode === 'analyser' && currentAnalyser) {
      const buf = new Uint8Array(currentAnalyser.fftSize)
      currentAnalyser.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128
        sum += v * v
      }
      // 噪声门限 + 归一化 + 软压缩
      const rms = Math.sqrt(sum / buf.length)
      let x = (rms - 0.02) / 0.22
      if (x < 0) x = 0
      if (x > 1) x = 1
      ampLevel = 1 - Math.exp(-3 * x)
    } else {
      ampLevel *= 0.82 // 脉冲自然衰减
      if (ampLevel < 0.02) ampLevel = 0
    }
    onAmp(ampLevel)
  }, 50)
}
function _pulse() { ampLevel = 1 }

/* 统一播报入口：speakText(text, { onStart, onEnd, onAmp }) */
export function speakText(text, { onStart, onEnd, onAmp } = {}) {
  stopText()
  const cfg = loadTtsConfig()
  const finish = () => { _stopAmp(); if (onAmp) onAmp(0); onEnd && onEnd() }
  if (cfg) {
    doubaoTts(text, cfg).then(audio => {
      currentAudio = audio
      audio.onended = finish
      audio.onerror = finish
      onStart && onStart()
      // 真实音频振幅分析（豆包 mp3）
      try {
        const AC = window.AudioContext || window.webkitAudioContext
        if (AC) {
          audioCtx = new AC()
          const src = audioCtx.createMediaElementSource(audio)
          const analyser = audioCtx.createAnalyser()
          analyser.fftSize = 512
          src.connect(analyser)
          analyser.connect(audioCtx.destination)
          currentAnalyser = analyser
          _startAmp('analyser', onAmp)
        }
      } catch (_) { /* 无法分析时退化为持续中等振幅 */
        ampLevel = 0.5; _startAmp('pulse', onAmp)
      }
      audio.play().catch(finish)
    }).catch(() => {
      // 豆包失败：回退浏览器语音，用词语边界脉冲驱动口型
      _startAmp('pulse', onAmp)
      speakBrowser(text, onStart, finish, _pulse)
    })
  } else {
    _startAmp('pulse', onAmp)
    speakBrowser(text, onStart, finish, _pulse)
  }
}

/* 停止播报 */
export function stopText() {
  _stopAmp()
  if (currentAudio) {
    try { currentAudio.pause() } catch (_) { /* noop */ }
    currentAudio = null
  }
  if (audioCtx) { try { audioCtx.close() } catch (_) { /* noop */ } audioCtx = null }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}
