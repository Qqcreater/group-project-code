<template>
  <div class="module">
    <div class="module-head">
      <h2>🩺 个人健康自测</h2>
      <p>通过语音、文字、图片与实时人脸多维采集，初步评估您的健康状态。</p>
    </div>

    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab"
        :class="{ active: active === t.key }"
        @click="active = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <div class="panel">
      <!-- 语音 -->
      <section v-show="active === 'voice'" class="block">
        <h3>语音自述</h3>
        <p class="hint">点击下方按钮，用自然语言描述您近期的身体感受（需浏览器支持语音识别）。</p>
        <div class="voice-row">
          <button class="btn primary" :class="{ recording: recording }" @click="toggleVoice">
            {{ recording ? '⏹ 停止录音' : '🎤 开始录音' }}
          </button>
          <span v-if="recording" class="pulse-dot"></span>
        </div>
        <div v-if="!supportsSpeech" class="warn">
          当前浏览器不支持语音识别，您可直接在下方文本框中输入。
        </div>
        <textarea
          v-model="voiceText"
          class="text-input"
          rows="4"
          placeholder="语音转写内容或出现识别结果后将显示在这里…"
        ></textarea>
        <button class="btn" :disabled="!voiceText || aiLoading" @click="analyzeText(voiceText, 'voice')">
          {{ aiLoading ? 'AI 分析中…' : '分析语音自述' }}
        </button>
        <div v-if="aiLoading" class="stage-tip">{{ aiStage }}</div>
      </section>

      <!-- 文字 -->
      <section v-show="active === 'text'" class="block">
        <h3>文字描述</h3>
        <p class="hint">描述您的症状、作息或情绪，例如「最近总是失眠、容易疲劳」。</p>
        <textarea
          v-model="textInput"
          class="text-input"
          rows="5"
          placeholder="请输入您的健康困扰…"
        ></textarea>
        <button class="btn primary" :disabled="!textInput || aiLoading" @click="analyzeText(textInput, 'text')">
          {{ aiLoading ? 'AI 分析中…' : '生成健康建议' }}
        </button>
        <div v-if="aiLoading" class="stage-tip">{{ aiStage }}</div>
      </section>

      <!-- 图片 -->
      <section v-show="active === 'image'" class="block">
        <h3>图片上传</h3>
        <p class="hint">上传舌象、皮肤或饮食照片，系统将给出参考性分析（演示为模拟识别）。</p>
        <label class="uploader">
          <input type="file" accept="image/*" @change="onImage" />
          <span>📷 选择图片</span>
        </label>
        <div v-if="imagePreviewUrl" class="img-preview">
          <img :src="imagePreviewUrl" alt="预览" />
        </div>
        <button class="btn primary" :disabled="!imageUrl || aiLoading" @click="analyzeImage">
          {{ aiLoading ? 'AI 看图中…' : 'AI 分析图片' }}
        </button>
        <div v-if="aiLoading" class="stage-tip">{{ aiStage }}</div>
      </section>

      <!-- 实时人脸 -->
      <section v-show="active === 'face'" class="block">
        <h3>实时人脸识别</h3>
        <p class="hint">调用摄像头，模拟进行面部状态检测（疲劳、面色、专注度等参考指标）。</p>
        <div class="camera-wrap">
          <video ref="video" class="camera" autoplay muted playsinline></video>
          <canvas ref="overlay" class="camera-overlay"></canvas>
          <div v-if="!cameraOn" class="camera-placeholder">摄像头未开启</div>
        </div>
        <div class="voice-row">
          <button class="btn primary" @click="toggleCamera">
            {{ cameraOn ? '⏹ 关闭摄像头' : '📹 开启摄像头' }}
          </button>
          <button class="btn" :disabled="!cameraOn || aiLoading" @click="captureFace">📸 {{ aiLoading ? 'AI 分析中…' : '抓拍并 AI 分析' }}</button>
        </div>
        <div v-if="aiLoading" class="stage-tip">{{ aiStage }}</div>
        <div v-if="!supportsCamera" class="warn">当前环境不支持摄像头访问（需 HTTPS 或 localhost）。</div>
      </section>

      <!-- 分析结果 -->
      <section v-if="result" class="result">
        <div class="result-head">📋 {{ resultTitle }}分析结果</div>
        <div class="result-body">{{ result }}</div>
        <div class="result-tags">
          <span v-for="(t, i) in resultTags" :key="i" class="tag">{{ t }}</span>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { callAI, compressImage } from '@/utils/aiService'

/* 关键词匹配（AI 调用失败时的本地兜底，同时用于生成 resultTags） */
const KEYWORDS = [
  { words: ['失眠', '睡不着', '睡不好'], tag: '睡眠障碍' },
  { words: ['疲劳', '乏力', '没精神', '累'], tag: '气虚疲劳' },
  { words: ['头痛', '头晕'], tag: '头部不适' },
  { words: ['胃口', '食欲不振', '吃不下'], tag: '脾胃偏弱' },
  { words: ['焦虑', '压力大', '烦躁', '紧张'], tag: '情绪紧张' },
  { words: ['咳嗽', '咽干', '喉咙'], tag: '肺燥' },
  { words: ['怕冷', '手脚凉'], tag: '阳虚' },
  { words: ['舌苔', '舌象'], tag: '舌象观察' },
  { words: ['皮肤', '面色'], tag: '面色观察' },
  { words: ['痘痘', '长痘', '痤疮'], tag: '皮肤问题' },
  { words: ['眼', '眼圈', '干涩'], tag: '眼周状态' }
]

export default {
  name: 'HealthSelfTest',
  data() {
    return {
      active: 'voice',
      tabs: [
        { key: 'voice', label: '🎤 语音' },
        { key: 'text', label: '✍️ 文字' },
        { key: 'image', label: '🖼️ 图片' },
        { key: 'face', label: '📹 人脸' }
      ],
      recording: false,
      voiceText: '',
      textInput: '',
      imageUrl: '',          // base64 data URL（传给 AI 用）
      imagePreviewUrl: '',   // 页面预览用的 objectURL
      result: '',
      resultTitle: '',
      resultTags: [],
      cameraOn: false,
      mediaStream: null,
      rafId: null,
      recognition: null,
      supportsSpeech: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
      supportsCamera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      aiLoading: false,
      aiStage: ''
    }
  },
  beforeUnmount() {
    this.stopVoice()
    this.stopCamera()
    if (this.imagePreviewUrl) URL.revokeObjectURL(this.imagePreviewUrl)
  },
  methods: {
    /* ---------- 语音 ---------- */
    toggleVoice() {
      if (!this.supportsSpeech) return
      if (this.recording) this.stopVoice(); else this.startVoice()
    },
    startVoice() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      this.recognition = new SR()
      this.recognition.lang = 'zh-CN'
      this.recognition.interimResults = true
      this.recognition.continuous = true
      this.recognition.onresult = (e) => {
        let txt = ''
        for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript
        this.voiceText = txt
      }
      this.recognition.onend = () => { this.recording = false }
      this.recognition.start()
      this.recording = true
    },
    stopVoice() {
      if (this.recognition) {
        try { this.recognition.stop() } catch (_) { /* ignore */ }
      }
      this.recording = false
    },

    /* ---------- 图片（上传 → 压缩 base64） ---------- */
    async onImage(e) {
      const file = e.target.files[0]
      if (!file) return
      if (this.imagePreviewUrl) URL.revokeObjectURL(this.imagePreviewUrl)
      this.imagePreviewUrl = URL.createObjectURL(file)
      try {
        this.imageUrl = await compressImage(file)
      } catch (err) {
        alert('图片处理失败，请换一张')
        this.imagePreviewUrl = ''
      }
    },

    /* ---------- 文本分析（语音/文字共用） → 调大模型 ---------- */
    async analyzeText(text, source) {
      if (!text || this.aiLoading) return
      this.resultTitle = source === 'voice' ? '语音' : '文字'
      this.aiLoading = true
      this.aiStage = '准备分析…'
      const fallbackKB = this._localKBFallback(text)
      const system = '你是一位专业的中医健康评估师。用户通过语音或文字描述了自己的身体症状，请从中医角度进行辨证分析。\n要求：\n1. 先列出你识别到的主要症状（用 emoji + 短词）\n2. 给出可能的中医证型判断\n3. 从食疗、穴位、起居、运动四个维度给出具体建议\n4. 整体控制在 300 字以内\n5. 排版清晰，不要用 Markdown 标题'
      const result = await callAI({
        messages: [{ role: 'user', content: text }],
        system,
        onStage: (s) => { this.aiStage = s },
        fallback: fallbackKB
      })
      this.aiLoading = false
      this.result = result.text || fallbackKB
      this.resultTags = this._extractTags(text)
    },

    /* ---------- 图片分析 → V 模型（有图必走 4.6v-flash） ---------- */
    async analyzeImage() {
      if (!this.imageUrl || this.aiLoading) return
      this.resultTitle = '图片'
      this.aiLoading = true
      this.aiStage = 'AI 看图中…'
      const system = '你是一位专业的中医健康评估师，擅长从舌象、面色、皮肤、饮食等照片中提取健康线索。请先描述你看到的图片内容，再结合中医理论给出辨证分析与建议。要求：\n1. 先简要描述图片（是舌象 / 面色 / 皮肤 / 食物 / 其他）\n2. 列出你观察到的特征（如舌苔厚薄、舌质颜色、面色明暗、皮肤有无异常等）\n3. 给出可能的健康倾向（中医证型）\n4. 从食疗、穴位、起居、运动四个维度给出具体建议\n5. 最后温馨提示：AI 分析仅供参考，异常请及时就医\n6. 控制在 350 字以内，排版清晰用 emoji'
      const result = await callAI({
        messages: [
          { role: 'user', content: [
            { type: 'text', text: '请帮我分析这张图片的健康线索' },
            { type: 'image_url', image_url: { url: this.imageUrl } }
          ] }
        ],
        system,
        imageUrl: this.imageUrl,
        onStage: (s) => { this.aiStage = s },
        fallback: '图片分析暂时失败。你可以尝试重新上传清晰的照片，或者直接用「文字描述」说出你的症状，我来帮你分析～'
      })
      this.aiLoading = false
      this.result = result.text || '图片分析暂时失败，请稍后再试。'
      this.resultTags = ['AI 看图', '建议面诊复核']
    },

    /* ---------- 实时人脸 ---------- */
    async toggleCamera() {
      if (this.cameraOn) { this.stopCamera() } else { await this.startCamera() }
    },
    async startCamera() {
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: true })
        const video = this.$refs.video
        video.srcObject = this.mediaStream
        this.cameraOn = true
        this.$nextTick(() => this.drawLoop())
      } catch (err) {
        this.supportsCamera = false
        alert('无法访问摄像头：' + err.message)
      }
    },
    stopCamera() {
      if (this.mediaStream) { this.mediaStream.getTracks().forEach(t => t.stop()); this.mediaStream = null }
      if (this.rafId) cancelAnimationFrame(this.rafId)
      this.rafId = null
      this.cameraOn = false
    },
    drawLoop() {
      const video = this.$refs.video
      const canvas = this.$refs.overlay
      if (!video || !canvas) return
      const w = (canvas.width = video.clientWidth)
      const h = (canvas.height = video.clientHeight)
      const ctx = canvas.getContext('2d')
      const loop = () => {
        ctx.clearRect(0, 0, w, h)
        const bw = w * 0.42, bh = h * 0.6
        const bx = w / 2 - bw / 2 + Math.sin(Date.now() / 600) * 6
        const by = h / 2 - bh / 2
        ctx.strokeStyle = '#7fc8a9'; ctx.lineWidth = 3
        ctx.strokeRect(bx, by, bw, bh)
        ctx.fillStyle = 'rgba(127,200,169,0.15)'
        ctx.fillRect(bx, by, bw, bh)
        ctx.font = '13px sans-serif'; ctx.fillStyle = '#7fc8a9'
        ctx.fillText('Face · 检测中…', bx, by - 8)
        this.rafId = requestAnimationFrame(loop)
      }
      loop()
    },

    /* 抓拍 → 把当前 video 画面转 base64 → 调大模型（V 模型看人脸） */
    async captureFace() {
      if (!this.cameraOn || this.aiLoading) return
      const video = this.$refs.video
      if (!video) return
      // 用 video 当前帧导出 base64（压缩到 640 宽）
      const snapCanvas = document.createElement('canvas')
      const maxW = 640
      snapCanvas.width = Math.min(maxW, video.videoWidth || maxW)
      snapCanvas.height = Math.round(snapCanvas.width * (video.videoHeight / (video.videoWidth || 1)))
      snapCanvas.getContext('2d').drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height)
      const faceB64 = snapCanvas.toDataURL('image/jpeg', 0.85)

      this.resultTitle = '人脸'
      this.aiLoading = true
      this.aiStage = 'AI 分析面相中…'
      const system = '你是一位结合现代视觉与中医面诊理论的健康评估师。用户刚刚上传了一张实时抓拍的人像照片（可能是面色、面部表情或皮肤状态）。请结合图片内容给出中医面诊角度的分析。要求：\n1. 先描述你看到的面部特征（面色明暗、有无光泽、是否疲劳、眼周状态、皮肤情况等）\n2. 结合中医面诊理论，给出可能的脏腑倾向（面白→气虚、面红→实热、面黄→脾虚湿困、面色晦暗→瘀滞等）\n3. 给出 3-5 条具体调养建议\n4. 最后温馨提示：AI 分析仅供参考，持续异常请及时就医\n5. 控制在 300 字以内，排版清晰用 emoji'
      const result = await callAI({
        messages: [
          { role: 'user', content: [
            { type: 'text', text: '请帮我分析这张抓拍人像的面色与健康线索' },
            { type: 'image_url', image_url: { url: faceB64 } }
          ] }
        ],
        system,
        imageUrl: faceB64,
        onStage: (s) => { this.aiStage = s },
        fallback: '人脸抓拍分析暂时失败。你可以先做个简单的自我观察：\n· 看看自己的面色是偏红润、偏白、偏黄还是偏暗\n· 观察眼周是否有黑眼圈、眼袋\n· 感受近期是否容易疲劳、焦虑或失眠\n\n把这些描述写在「文字」页，我来帮你进一步分析～'
      })
      this.aiLoading = false
      this.result = result.text || '人脸抓拍分析暂时失败，请稍后再试。'
      this.resultTags = ['AI 面相', '建议面诊复核']
    },

    /* ---------- 工具方法 ---------- */
    _extractTags(text) {
      const matched = KEYWORDS.filter(k => k.words.some(w => text.includes(w)))
      if (matched.length) return matched.map(m => m.tag)
      return ['状态平稳']
    },
    _localKBFallback(text) {
      const matched = KEYWORDS.filter(k => k.words.some(w => text.includes(w)))
      if (matched.length === 0) {
        return '未匹配到明显健康信号。请继续保持规律作息、均衡饮食与适度运动，并定期自测。'
      }
      return '根据你的描述，可能涉及：\n' +
        matched.map(m => `· ${m.tag}`).join('\n') +
        '\n建议保持规律作息、均衡饮食，症状持续请及时就医。'
    }
  }
}
</script>

<style scoped>
.module-head h2 {
  margin: 0 0 6px;
  color: #2f5d50;
}
.module-head p {
  margin: 0 0 18px;
  color: #7a8a82;
  font-size: 14px;
}
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.tab {
  padding: 9px 16px;
  border: 1px solid #d8e3dd;
  background: #fff;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  color: #5a6b62;
  transition: all 0.2s;
}
.tab.active {
  background: #2f5d50;
  color: #fff;
  border-color: #2f5d50;
}
.panel {
  background: #fff;
  border-radius: 14px;
  padding: 22px;
  box-shadow: 0 4px 18px rgba(47, 93, 80, 0.06);
}
.block h3 {
  margin: 0 0 8px;
  color: #2f5d50;
}
.hint {
  color: #8a9b93;
  font-size: 13px;
  margin: 0 0 14px;
}
.text-input {
  width: 100%;
  border: 1px solid #dce5e0;
  border-radius: 10px;
  padding: 12px;
  font-size: 14px;
  resize: vertical;
  outline: none;
  margin-bottom: 12px;
}
.text-input:focus {
  border-color: #7fc8a9;
}
.btn {
  padding: 10px 20px;
  border: 1px solid #2f5d50;
  background: #fff;
  color: #2f5d50;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn.primary {
  background: #2f5d50;
  color: #fff;
}
.btn.recording {
  background: #c0392b;
  border-color: #c0392b;
  color: #fff;
}
.stage-tip {
  margin-top: 10px;
  font-size: 12px;
  color: #7fc8a9;
  background: #f1f8f4;
  border-radius: 6px;
  padding: 6px 10px;
  display: inline-block;
}
.voice-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.pulse-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #c0392b;
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 0.7;
  }
  100% {
    transform: scale(1.4);
    opacity: 0.2;
  }
}
.uploader {
  display: inline-block;
  padding: 14px 22px;
  border: 1px dashed #b9cabf;
  border-radius: 10px;
  cursor: pointer;
  color: #5a6b62;
  margin-bottom: 14px;
}
.uploader input {
  display: none;
}
.img-preview {
  margin-bottom: 14px;
}
.img-preview img {
  max-width: 260px;
  border-radius: 10px;
  border: 1px solid #e6ebe7;
}
.camera-wrap {
  position: relative;
  width: 100%;
  max-width: 420px;
  aspect-ratio: 4 / 3;
  background: #1f2a26;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 14px;
}
.camera {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.camera-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.camera-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9fb3a9;
}
.result {
  margin-top: 20px;
  background: #f1f7f4;
  border-left: 4px solid #7fc8a9;
  border-radius: 8px;
  padding: 16px;
}
.result-head {
  font-weight: 600;
  color: #2f5d50;
  margin-bottom: 8px;
}
.result-body {
  white-space: pre-line;
  font-size: 14px;
  line-height: 1.7;
  color: #3c4a44;
}
.result-tags {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.tag {
  background: #dcefe5;
  color: #2f5d50;
  padding: 4px 12px;
  border-radius: 14px;
  font-size: 12px;
}
.warn {
  background: #fff4e5;
  color: #b9770e;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 12px;
}

@media (max-width: 640px) {
  .panel {
    padding: 16px 14px;
  }
  .voice-row {
    flex-wrap: wrap;
  }
  .img-preview img {
    max-width: 100%;
  }
  .result {
    padding: 14px 12px;
  }
}
</style>
