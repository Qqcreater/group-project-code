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
        <div v-if="cameraError" class="warn">⚠️ {{ cameraError }}</div>
        <div v-else-if="!supportsCamera" class="warn">当前环境不支持摄像头访问（需 HTTPS 或 localhost）。</div>
      </section>

      <!-- 分析结果 -->
      <section v-if="result" class="result">
        <div class="result-head">📋 {{ resultTitle }}分析结果</div>
        <div class="result-body" v-html="formatText(result)"></div>
        <div class="result-tags">
          <span v-for="(t, i) in resultTags" :key="i" class="tag">{{ t }}</span>
        </div>
      </section>

      <!-- 根据建议推荐的养生课程（B站跟练视频） -->
      <section v-if="recommendCourses.length || aiCustomCourse || aiCourseLoading" class="recommend">
        <div class="rec-head">🎯 根据分析为你推荐的养生课程</div>
        <div v-if="aiCourseLoading && !aiCustomCourse" class="rec-loading">🤖 AI 正在根据本次分析为你定制专属课程…</div>
        <!-- AI 定制课程：用户自主选择添加 -->
        <div v-if="aiCustomCourse" class="rec-card ai-rec-card">
          <div class="rec-emoji">{{ aiCustomCourse.emoji }}</div>
          <div class="rec-info">
            <div class="rec-title">{{ aiCustomCourse.title }}<span class="ai-badge">✨ AI定制</span></div>
            <div class="rec-meta">{{ aiCustomCourse.cat }} · {{ aiCustomCourse.level }} · 约{{ Math.max(1, Math.round(aiCustomCourse.videoSec / 60)) }}分钟跟练</div>
            <div class="rec-desc">{{ aiCustomCourse.desc }}</div>
            <div v-if="aiCustomCourse.bvid" class="rec-video">
              <span class="rec-video-txt">🎬 {{ aiCustomCourse.videoTitle }}（{{ aiCustomCourse.teacher }}）</span>
              <button class="rec-swap" title="换一个视频" @click="swapAiVideo">↻ 换一个</button>
            </div>
            <div v-else class="rec-video none">⏳ 正在匹配B站视频…</div>
          </div>
          <div class="rec-actions">
            <button v-if="!aiCourseAdded" class="rec-btn primary" :disabled="!aiCustomCourse.bvid" @click="addAiCourse">➕ 添加到养生课程</button>
            <span v-else class="rec-added">✓ 已添加</span>
            <a
              v-if="aiCustomCourse.bvid"
              class="rec-btn"
              :href="'https://www.bilibili.com/video/' + aiCustomCourse.bvid"
              target="_blank"
              rel="noopener"
            >▶ B站原片</a>
          </div>
        </div>
        <div v-if="aiCourseAdded" class="rec-ai-tip">
          ✨ 《{{ aiCustomCourse.title }}》已加入「养生课程」页顶部（带 自主添加 标记）
        </div>
        <div class="rec-list">
          <div v-for="c in recommendCourses" :key="c.id" class="rec-card">
            <div class="rec-emoji">{{ c.emoji }}</div>
            <div class="rec-info">
              <div class="rec-title">{{ c.title }}</div>
              <div class="rec-meta">📺 {{ c.teacher }} · {{ c.level }} · 约{{ Math.round(c.videoSec / 60) }}分钟</div>
              <div class="rec-match" v-if="c.hitKeys && c.hitKeys.length">匹配：{{ c.hitKeys.slice(0, 3).join('、') }}</div>
            </div>
            <div class="rec-actions">
              <button class="rec-btn primary" @click="gotoCourse(c)">▶ 去课程页跟练</button>
              <a class="rec-btn" :href="'https://www.bilibili.com/video/' + c.bvid" target="_blank" rel="noopener">B站观看</a>
            </div>
          </div>
        </div>
        <a class="rec-more" :href="bilibiliSearchUrl()" target="_blank" rel="noopener">🔍 在哔哩哔哩搜索更多相关视频 →</a>
      </section>
    </div>
  </div>
</template>

<script>
import { callAI, compressImage } from '@/utils/aiService'
import { matchCoursesByText, COURSE_JUMP_KEY, saveAiCourse, loadAiCourses } from '@/utils/courseLibrary'

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
      recommendCourses: [], // 根据分析建议匹配到的养生课程
      aiCustomCourse: null, // AI 根据分析生成的定制课程（展示后由用户自主决定是否添加）
      aiCourseAdded: false, // 该定制课程是否已被用户添加到养生课程库
      aiCourseLoading: false, // AI 定制课程是否正在生成（四种采集方式共用）
      aiVidIdx: 0,          // 当前绑定的候选视频下标
      cameraOn: false,
      mediaStream: null,
      rafId: null,
      recognition: null,
      supportsSpeech: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
      supportsCamera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      cameraError: '',        // 摄像头错误提示（按类型给出可操作指引）
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
    /* 结果文本渲染：转义 HTML，**加粗** 转成 <b>，行首 * 转成 · */
    formatText(text) {
      const esc = String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      return esc
        .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
        .replace(/^[\t ]*\*[\t ]*/gm, '· ')
        .replace(/\*/g, '')
    },
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
      const system = '你是一位专业的中医健康评估师。用户通过语音或文字描述了自己的身体症状，请从中医角度进行详尽的辨证分析。\n重要：直接输出最终分析结果，禁止输出"需求分析/任务/输出限制"等规划文本，禁止展示推理步骤，禁止使用 ** 或 # 等 markdown 标记。\n输出结构（总字数 500-800 字，排版清晰、多用 emoji 和换行）：\n1. 🔍【症状梳理】列出你识别到的主要症状，逐项简析\n2. 🩺【辨证分析】给出可能的中医证型判断（如气虚、阴虚、肝郁、脾虚湿困等），说明判断依据\n3. 🥗【饮食调养】3-4 条具体食疗建议（食材、做法、忌口）\n4. 🛌【作息起居】3-4 条作息与情志调节建议（睡眠、穴位按摩、情绪疏导）\n5. 🧘【运动功法】推荐 1-2 种适合的养生功法（如八段锦、太极、冥想、瑜伽、经络拍打等），说明为什么适合\n6. ⚠️【温馨提示】AI 分析仅供参考，症状持续或加重请及时就医'
      const result = await callAI({
        messages: [{ role: 'user', content: text }],
        system,
        maxTokens: 2200,
        onStage: (s) => { this.aiStage = s },
        fallback: fallbackKB
      })
      this.aiLoading = false
      this.result = result.text || fallbackKB
      this.resultTags = this._extractTags(text)
      // 根据分析建议匹配养生课程 + 生成 AI 定制课程（语音/文字共用）
      this.applyCourseRecommendation(this.result)
    },

    /* ---------- 图片分析 → V 模型（有图必走 4.6v-flash） ---------- */
    async analyzeImage() {
      if (!this.imageUrl || this.aiLoading) return
      this.resultTitle = '图片'
      this.aiLoading = true
      this.aiStage = 'AI 看图中…'
      const system = '你是一位专业的中医健康评估师，擅长从舌象、面色、皮肤、饮食等照片中提取健康线索。请先描述你看到的图片内容，再结合中医理论给出辨证分析与建议。要求：\n1. 先简要描述图片（是舌象 / 面色 / 皮肤 / 食物 / 其他）\n2. 列出你观察到的特征（如舌苔厚薄、舌质颜色、面色明暗、皮肤有无异常等）\n3. 给出可能的健康倾向（中医证型）\n4. 从食疗、穴位、起居、运动（养生功法，如八段锦/太极/瑜伽/冥想/经络拍打）四个维度给出具体建议\n5. 最后温馨提示：AI 分析仅供参考，异常请及时就医\n6. 控制在 350 字以内，排版清晰用 emoji\n7. 直接输出最终分析正文，禁止出现"分析请求""角色""输入""任务""限制"等规划性文字，禁止使用 ** 或 # 等 markdown 标记，不要输出编号提纲'
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
      if (!result.success && result.hint) this.result += '\n\n🔍 失败原因：' + result.hint
      this.resultTags = ['AI 看图', '建议面诊复核']
      // 根据分析建议匹配养生课程 + 生成 AI 定制课程（图片同样支持）
      this.applyCourseRecommendation(this.result)
    },

    /* ---------- 实时人脸 ---------- */
    async toggleCamera() {
      if (this.cameraOn) { this.stopCamera() } else { await this.startCamera() }
    },
    async startCamera() {
      this.cameraError = ''
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        })
        const video = this.$refs.video
        video.srcObject = this.mediaStream
        try { await video.play() } catch (_) { /* 自动播放失败时首帧会稍后到达，不影响 */ }
        this.cameraOn = true
        this.$nextTick(() => this.drawLoop())
      } catch (err) {
        // 按错误类型给出可操作的提示，不再笼统报"不支持"
        const name = (err && err.name) || ''
        if (name === 'NotReadableError' || name === 'TrackStartError') {
          this.cameraError = '摄像头被其他应用占用：请关闭正在使用摄像头的程序（如微信/腾讯会议/相机应用/其他浏览器标签页）后重试。'
        } else if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          this.cameraError = '摄像头权限被拒绝：请点击地址栏左侧的小锁图标 → 网站设置 → 摄像头改为「允许」，然后刷新页面。'
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          this.cameraError = '未检测到摄像头设备：请确认摄像头已连接，或在 Windows 设置 → 隐私 → 摄像头中开启访问权限。'
        } else if (name === 'OverconstrainedError') {
          // 参数约束过严导致无匹配设备：回退到最简参数再试一次
          try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            const video = this.$refs.video
            video.srcObject = this.mediaStream
            try { await video.play() } catch (_) { /* noop */ }
            this.cameraOn = true
            this.$nextTick(() => this.drawLoop())
            return
          } catch (e2) {
            this.cameraError = '无法访问摄像头：' + (e2 && e2.message)
          }
        } else {
          this.cameraError = '无法访问摄像头：' + ((err && err.message) || '未知错误')
        }
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
      const system = '你是一位结合现代视觉与中医面诊理论的资深健康评估师。用户刚刚上传了一张实时抓拍的人像照片（可能是面色、面部表情或皮肤状态）。请结合图片内容给出详尽、专业的中医面诊分析。\n重要：直接输出最终分析结果，禁止输出"需求分析/输入/任务/输出限制"等规划文本，禁止复述要求，不要展示你的推理步骤。\n输出结构（总字数 600-900 字，排版清晰、多用 emoji 和换行）：\n1. 🔍【面部特征观察】详细描述你看到的面部特征：面色明暗与色调、光泽度、精神状态、眼周状态（黑眼圈/眼袋/浮肿）、皮肤情况（干燥/油腻/痘印）、口唇色泽等，逐项展开\n2. 🩺【中医面诊分析】结合中医面诊理论分析可能的脏腑倾向（如面白→气虚血虚、面红→实热阴虚火旺、面黄→脾虚湿困、面色晦暗→气滞血瘀、眼周暗沉→肾气不足等），说明判断依据\n3. 🥗【饮食调养】给出 3-4 条具体的饮食建议（推荐食材、食疗方、忌口）\n4. 🛌【作息起居】给出 3-4 条作息与生活习惯建议（睡眠时间、运动方式、情志调节）\n5. 🧘【运动功法】推荐 1-2 种适合的养生功法（如八段锦、太极、冥想、瑜伽、经络拍打等），说明为什么适合\n6. ⚠️【温馨提示】AI 分析仅供参考，不能替代专业诊疗，如有持续不适请及时就医'
      const result = await callAI({
        messages: [
          { role: 'user', content: [
            { type: 'text', text: '请帮我详细分析这张抓拍人像的面色与健康线索，并给出完整的调养方案' },
            { type: 'image_url', image_url: { url: faceB64 } }
          ] }
        ],
        system,
        imageUrl: faceB64,
        maxTokens: 2600,
        onStage: (s) => { this.aiStage = s },
        fallback: '人脸抓拍分析暂时失败。你可以先做个简单的自我观察：\n· 看看自己的面色是偏红润、偏白、偏黄还是偏暗\n· 观察眼周是否有黑眼圈、眼袋\n· 感受近期是否容易疲劳、焦虑或失眠\n\n把这些描述写在「文字」页，我来帮你进一步分析～'
      })
      this.aiLoading = false
      this.result = result.text || '人脸抓拍分析暂时失败，请稍后再试。'
      this.resultTags = ['AI 面相', '建议面诊复核']
      // 根据分析建议匹配养生课程 + 生成 AI 定制课程
      this.applyCourseRecommendation(this.result)
    },

    /* 分析完成后统一的课程推荐：语音 / 文字 / 图片 / 人脸四种方式共用 */
    applyCourseRecommendation(analysisText) {
      if (!analysisText) return
      this.recommendCourses = matchCoursesByText(analysisText, 3)
      this.aiCustomCourse = null
      this.aiCourseAdded = false
      this.aiCourseLoading = true
      this.generateAiCourse(analysisText)
        .then((c) => { this.aiCustomCourse = c })
        .finally(() => { this.aiCourseLoading = false })
    },
    /* 跳转课程页并打开对应课程视频 */
    gotoCourse(c) {
      try { localStorage.setItem(COURSE_JUMP_KEY, String(c.id)) } catch (_) { /* noop */ }
      this.$emit('nav', 'courses')
    },
    /* B站搜索与本次分析相关的更多视频 */
    bilibiliSearchUrl() {
      const kw = (this.recommendCourses[0]?.hitKeys?.[0]) || '中医面诊调养'
      return 'https://search.bilibili.com/all?keyword=' + encodeURIComponent(kw + ' 养生跟练')
    },

    /* ---------- AI 定制课程：基于分析结果生成课程并绑定真实B站视频，展示后由用户自主添加 ---------- */
    /* B站搜索真实视频（经 devServer 代理 /bili-search，服务端完成 Wbi 签名） */
    async _biliSearch(kw) {
      try {
        const res = await fetch('/bili-search?kw=' + encodeURIComponent(kw))
        const j = await res.json()
        if (j.code === 0 && Array.isArray(j.data) && j.data.length) return j.data
      } catch (_) { /* 网络失败返回空，走无视频兜底 */ }
      return []
    },
    _durationToSec(d) {
      const parts = String(d || '').split(':').map(Number)
      if (!parts.length || parts.some(isNaN)) return 600
      return parts.reduce((a, b) => a * 60 + b, 0)
    },
    _autoSections(totalSec) {
      const n = 3
      const per = Math.floor(totalSec / n)
      const arr = []
      for (let i = 0; i < n; i++) {
        arr.push({ name: '第' + (i + 1) + '节 跟练', start: i * per, end: i === n - 1 ? totalSec : (i + 1) * per })
      }
      return arr
    },
    /* 把候选视频列表中第 idx 个绑定到课程上 */
    _bindAiVideo(course, idx) {
      const v = course.matchedVideos && course.matchedVideos[idx]
      if (!v) return
      course.bvid = v.bvid
      course.teacher = v.author || 'B站UP主'
      course.videoSec = this._durationToSec(v.duration)
      course.videoTitle = v.title
      course.sections = this._autoSections(course.videoSec)
      this.aiVidIdx = idx
    },
    /* 卡片上换一个视频 */
    swapAiVideo() {
      const c = this.aiCustomCourse
      if (!c || !c.matchedVideos || c.matchedVideos.length < 2) return
      this._bindAiVideo(c, (this.aiVidIdx + 1) % c.matchedVideos.length)
    },
    /* 对搜索候选排序：优先真正的"跟练/教学"视频，时长 3~45 分钟为佳 */
    _rankVideos(vids) {
      const GOOD = /跟练|教学|教程|口令|完整版|入门|分解|示范/
      const BAD = /讲座|访谈|解说|科普|理论|课程介绍/
      const score = (v) => {
        let s = 0
        const t = String(v.title || '')
        if (GOOD.test(t)) s += 3
        if (BAD.test(t)) s -= 3
        const sec = this._durationToSec(v.duration)
        if (sec >= 180 && sec <= 2700) s += 2 // 3~45 分钟适合跟练
        else if (sec < 90 || sec > 5400) s -= 2 // 太短/太长不合适
        return s
      }
      return vids.slice().sort((a, b) => score(b) - score(a))
    },
    async generateAiCourse(analysisText) {
      if (!analysisText || analysisText.length < 30) return null
      try {
        const result = await callAI({
          messages: [{ role: 'user', content: '基于以下健康分析结果，设计一门最适合该用户的养生跟练课程：\n\n' + analysisText.slice(0, 1500) + '\n\n严格输出JSON对象（禁止输出markdown代码块、禁止任何解释文字）：{"title":"课程名(12字内)","cat":"分类","level":"难度","emoji":"一个emoji","desc":"课程介绍60-90字，说明练习内容、功效与适合人群","searchKw":"哔哩哔哩搜索关键词(6-12字)"}' }],
          system: '你是养生课程策划师。cat 只能是：八段锦/太极/瑜伽/冥想/营养/拍打。level 只能是：入门/进阶。只输出 JSON 对象本身。',
          maxTokens: 500
        })
        const text = result.text || ''
        const m = text.match(/\{[\s\S]*\}/)
        if (!m) return null
        const o = JSON.parse(m[0])
        if (!o || !o.title || !o.desc) return null
        if (!['八段锦', '太极', '瑜伽', '冥想', '营养', '拍打'].includes(o.cat)) o.cat = '营养'
        if (o.level !== '进阶') o.level = '入门'
        const course = {
          title: String(o.title).slice(0, 24),
          cat: o.cat,
          level: o.level,
          emoji: String(o.emoji || '✨').slice(0, 4),
          desc: String(o.desc).slice(0, 160),
          searchKw: String(o.searchKw || o.title).slice(0, 24),
          bvid: '',
          videoSec: 600,
          sections: [{ name: '完整学习', start: 0, end: 600 }]
        }
        // 绑定真实B站视频：搜索词强制带"跟练"后缀，候选按跟练适配度排序，用户可"换一个"
        this.aiVidIdx = 0
        const kw = (course.searchKw || course.title)
        let vids = await this._biliSearch(kw + ' 跟练')
        if (!vids.length) vids = await this._biliSearch(kw) // 后缀搜索无结果时放宽重试
        if (vids.length) {
          course.matchedVideos = this._rankVideos(vids).slice(0, 6)
          this._bindAiVideo(course, 0)
        }
        return course
      } catch (_) {
        return null
      }
    },

    /* 用户自主添加：把 AI 定制课程存入养生课程库（课程页置顶展示，带"自主添加"标记） */
    addAiCourse() {
      const c = this.aiCustomCourse
      if (!c || this.aiCourseAdded) return
      const ok = saveAiCourse(c)
      if (!ok) {
        // 保存失败（存储异常）：明确告知，避免“假添加”
        alert('未能添加到课程库：浏览器存储异常，请检查是否开启了无痕模式或存储限制。')
        return
      }
      // 读回验证：确认数据真的写入了（防止存储异常导致“假添加”）
      const back = loadAiCourses().some((x) => x && x.title === c.title)
      if (!back) {
        alert('保存后读回验证失败：浏览器存储异常，请检查是否开启了无痕模式或存储限制。')
        return
      }
      this.aiCourseAdded = true
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
/* ===== 推荐课程 ===== */
.recommend {
  margin-top: 18px;
  background: #f4faf6;
  border: 1px solid #dcebe2;
  border-radius: 12px;
  padding: 16px;
}
.rec-head {
  font-size: 15px;
  font-weight: 600;
  color: #2f5d50;
  margin-bottom: 12px;
}
.rec-loading {
  font-size: 13px;
  color: #4a7a68;
  background: #eaf4ef;
  border: 1px dashed #9dc4b2;
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 12px;
}
.rec-ai-tip {
  background: #eaf4ef;
  border: 1px dashed #9dc4b2;
  color: #3c6656;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 12px;
  line-height: 1.6;
}
/* AI 定制课程卡片 */
.ai-rec-card {
  border: 1px solid #9dc4b2;
  background: linear-gradient(135deg, #ffffff, #f0f8f3);
}
.ai-badge {
  margin-left: 8px;
  font-size: 10px;
  font-weight: 600;
  color: #3c6656;
  background: #dff0e7;
  border: 1px solid #9dc4b2;
  border-radius: 8px;
  padding: 2px 7px;
  vertical-align: 2px;
}
.rec-desc {
  font-size: 12px;
  color: #6d8378;
  line-height: 1.6;
  margin-top: 4px;
}
.rec-added {
  font-size: 12px;
  color: #3c6656;
  background: #dff0e7;
  border-radius: 14px;
  padding: 6px 12px;
  text-align: center;
}
.rec-video {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  background: #f0f8f3;
  border-radius: 8px;
  padding: 6px 10px;
}
.rec-video.none {
  color: #8a9a92;
  font-size: 12px;
}
.rec-video-txt {
  font-size: 12px;
  color: #4a6a5e;
  line-height: 1.5;
  flex: 1;
  min-width: 0;
}
.rec-swap {
  flex-shrink: 0;
  font-size: 11px;
  color: #4a7a68;
  background: #fff;
  border: 1px solid #cfe0d6;
  border-radius: 10px;
  padding: 3px 8px;
  cursor: pointer;
}
.rec-swap:hover {
  border-color: #4a7a68;
}
.rec-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rec-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid #e3efe8;
  border-radius: 10px;
  padding: 12px 14px;
}
.rec-emoji {
  font-size: 30px;
  flex-shrink: 0;
}
.rec-info {
  flex: 1;
  min-width: 0;
}
.rec-title {
  font-size: 14px;
  font-weight: 600;
  color: #2f5d50;
}
.rec-meta {
  font-size: 12px;
  color: #8a9a92;
  margin-top: 3px;
}
.rec-match {
  display: inline-block;
  font-size: 11px;
  color: #d97b2b;
  background: #fdf1e3;
  border-radius: 10px;
  padding: 2px 8px;
  margin-top: 5px;
}
.rec-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}
.rec-btn {
  display: inline-block;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 14px;
  border: 1px solid #cfe0d6;
  background: #fff;
  color: #4a6a5e;
  cursor: pointer;
  text-decoration: none;
  text-align: center;
  transition: all 0.2s;
}
.rec-btn:hover {
  border-color: #4a7a68;
  color: #2f5d50;
}
.rec-btn.primary {
  background: #4a7a68;
  border-color: #4a7a68;
  color: #fff;
}
.rec-btn.primary:hover {
  background: #3c6656;
}
.rec-more {
  display: inline-block;
  margin-top: 12px;
  font-size: 13px;
  color: #4a7a68;
  text-decoration: none;
}
.rec-more:hover {
  text-decoration: underline;
}
@media (max-width: 640px) {
  .rec-card { flex-wrap: wrap; }
  .rec-actions { flex-direction: row; width: 100%; }
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
