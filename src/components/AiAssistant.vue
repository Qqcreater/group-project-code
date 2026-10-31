<template>
  <div class="module">
    <div class="module-head">
      <h2>✨ AI 养生助手</h2>
      <p>随时提问，获取个性化养生建议。</p>
    </div>

    <div class="chat">
      <div class="chat-toolbar">
        <button class="clear-btn" @click="clearChat" title="清空对话记录">🗑 清空对话</button>
      </div>
      <div class="messages" ref="box">
        <div
          v-for="(m, i) in messages"
          :key="i"
          class="msg"
          :class="m.role"
        >
          <span class="msg-avatar">{{ m.role === 'user' ? '🧑' : '🤖' }}</span>
          <div class="bubble">
            <img v-if="m.image" :src="m.image" class="msg-img" alt="用户上传" />
            {{ m.text }}
          </div>
        </div>
        <div v-if="loading" class="msg ai">
          <span class="msg-avatar">🤖</span>
          <div class="bubble thinking">🤔 小颐正在思考… {{ aiStage }}</div>
        </div>
      </div>

      <!-- 图片预览 -->
      <div v-if="pendingImage" class="pending-row">
        <img :src="pendingImage" class="pending-thumb" alt="待发送图片" />
        <span class="pending-name">{{ pendingFileName }}</span>
        <button class="pending-clear" @click="clearImg">✕</button>
      </div>

      <div class="quick">
        <button
          v-for="q in quick"
          :key="q"
          class="quick-btn"
          @click="send(q)"
        >
          {{ q }}
        </button>
      </div>

      <div class="input-row">
        <input type="file" accept="image/*" class="hidden-file" ref="fileInput" @change="onImg" />
        <button class="pic-btn" :disabled="loading" title="上传图片给 AI 分析" @click="$refs.fileInput.click()">🖼️</button>
        <input
          v-model="input"
          type="text"
          :placeholder="pendingImage ? '已选图片，加个描述后发送' : '输入你的问题，如：熬夜后如何恢复？'"
          @keyup.enter="send()"
        />
        <button class="btn primary" :disabled="(!input.trim() && !pendingImage) || loading" @click="send()">发送</button>
      </div>
    </div>
  </div>
</template>

<script>
import { callAI, compressImage } from '@/utils/aiService'

export default {
  name: 'AiAssistant',
  data() {
    return {
      input: '',
      loading: false,
      aiStage: '',
      pendingImage: '',
      pendingFileName: '',
      quick: ['失眠怎么办？', '熬夜后如何恢复？', '怎么养脾胃？', '适合的运动？'],
      messages: [
        { role: 'ai', text: '你好，我是 AI 养生助手。关于睡眠、饮食、运动或调理的问题都可以问我～\n📷 支持上传舌苔、皮肤、食物等图片让我帮你分析！' }
      ]
    }
  },
  computed: {
    box() {
      return this.$refs.box
    }
  },
  created() {
    // 恢复历史聊天记录（只存文字，图片不持久化）
    try {
      const saved = localStorage.getItem('zy_ai_chat')
      if (saved) {
        const arr = JSON.parse(saved)
        if (Array.isArray(arr) && arr.length) this.messages = arr
      }
    } catch (_) { /* noop */ }
  },
  methods: {
    /* 持久化：只存文字，最多 50 条 */
    saveChat() {
      try {
        const plain = this.messages.slice(-50).map(m => ({ role: m.role, text: m.text || '' }))
        localStorage.setItem('zy_ai_chat', JSON.stringify(plain))
      } catch (_) { /* 存储满忽略 */ }
    },
    clearChat() {
      this.messages = [
        { role: 'ai', text: '对话已清空～有什么养生问题随时问我 🌿' }
      ]
      try { localStorage.removeItem('zy_ai_chat') } catch (_) { /* noop */ }
    },
    async send(text) {
      const content = (text !== undefined ? text : this.input).trim()
      if (!content && !this.pendingImage) return
      if (this.loading) return

      const image = this.pendingImage || ''
      const userText = content || (image ? '帮我看看这张图片里有什么？' : '')
      this.messages.push({ role: 'user', text: userText, image })
      this.saveChat()
      this.input = ''
      this.pendingImage = ''
      this.pendingFileName = ''
      this.scroll()

      // 构建 history（aiService 约定：content 为 string，历史图片走 image 字段，role 需为 user/assistant）
      const history = this.messages.slice(-10).map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text || '',
        image: m.image || ''
      }))

      this.loading = true
      this.aiStage = '直连中…'
      const result = await callAI({
        messages: history,
        system: '你是「小颐」，一位专业的中医养生顾问。请用亲切温和的语气回答用户的养生健康问题。要求：\n1. 结合中医理论与现代健康知识\n2. 回答简洁实用，用 emoji 和换行让排版清晰\n3. 包含食疗建议、穴位按摩、起居调养、运动建议等\n4. 回答控制在250字以内\n5. 如果用户上传了图片，先简要描述你看到的内容，再给出建议\n6. 提到具体穴位时请标注大致位置',
        imageUrl: image,
        onStage: (s) => { this.aiStage = s },
        fallback: '抱歉呀～大模型暂时没响应，你可以试试问我关于失眠、脾胃、运动、饮食或熬夜恢复的问题，也可以前往「健康自测」做初步评估。'
      })
      this.loading = false
      this.messages.push({ role: 'ai', text: result.text || (result.hint || '抱歉，我暂时没回答上来 😢') })
      this.saveChat()
      this.scroll()
    },
    async onImg(e) {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      if (!file.type.startsWith('image/')) { alert('只能上传图片哦～'); return }
      try {
        this.pendingImage = await compressImage(file)
        this.pendingFileName = file.name
        e.target.value = ''
      } catch (err) { alert('图片读取失败，请换一张试试') }
    },
    clearImg() {
      this.pendingImage = ''
      this.pendingFileName = ''
      if (this.$refs.fileInput) this.$refs.fileInput.value = ''
    },
    scroll() {
      this.$nextTick(() => {
        if (this.box) this.box.scrollTop = this.box.scrollHeight
      })
    }
  }
}
</script>

<style scoped>
.module-head h2 { margin: 0 0 6px; color: #2f5d50; }
.module-head p { margin: 0 0 18px; color: #7a8a82; font-size: 14px; }
.chat {
  background: #fff; border-radius: 14px; padding: 18px;
  box-shadow: 0 4px 18px rgba(47, 93, 80, 0.06);
  display: flex; flex-direction: column; height: 560px;
}
.chat-toolbar { display: flex; justify-content: flex-end; margin-bottom: 10px; }
.clear-btn {
  border: 1px solid #e0d4d4; background: #fdf7f7; color: #b05a5a;
  font-size: 12px; padding: 5px 12px; border-radius: 14px; cursor: pointer;
}
.clear-btn:hover { background: #f9ecec; border-color: #d9b8b8; }
.messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; padding-right: 6px; }
.msg { display: flex; gap: 10px; max-width: 80%; }
.msg.user { align-self: flex-end; flex-direction: row-reverse; }
.msg-avatar { font-size: 26px; flex-shrink: 0; }
.bubble { padding: 11px 15px; border-radius: 14px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
.msg.ai .bubble { background: #eef6f1; color: #3c4a44; border-top-left-radius: 4px; }
.msg.user .bubble { background: #2f5d50; color: #fff; border-top-right-radius: 4px; }
.bubble.thinking { opacity: 0.75; }
.msg-img { display: block; max-width: 100%; max-height: 160px; border-radius: 8px; margin-bottom: 6px; }

.hidden-file { display: none; }
.pic-btn {
  width: 40px; height: 40px; border: none; background: transparent;
  font-size: 22px; cursor: pointer; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.pic-btn:hover:not(:disabled) { background: #eef6f1; }
.pic-btn:disabled { opacity: .5; cursor: not-allowed; }

.pending-row {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 10px; margin: 8px 0 0; background: #f1f8f4;
  border: 1px dashed #bfe0cf; border-radius: 10px;
}
.pending-thumb { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; }
.pending-name { flex: 1; font-size: 12px; color: #3a6a58; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pending-clear {
  width: 22px; height: 22px; border-radius: 50%; border: none;
  background: #c94b4b; color: #fff; font-size: 12px;
  cursor: pointer; flex-shrink: 0;
}
.pending-clear:hover { background: #a33a3a; }

.quick { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
.quick-btn {
  padding: 7px 14px; border: 1px solid #d8e3dd; background: #f7faf8;
  border-radius: 16px; cursor: pointer; font-size: 13px; color: #2f5d50;
}
.quick-btn:hover { background: #eef6f1; }
.input-row { display: flex; gap: 10px; }
.input-row input {
  flex: 1; border: 1px solid #dce5e0; border-radius: 10px;
  padding: 11px 14px; font-size: 14px; outline: none;
}
.input-row input:focus { border-color: #7fc8a9; }
.btn { padding: 11px 22px; border: none; border-radius: 10px; cursor: pointer; font-size: 14px; }
.btn.primary { background: #2f5d50; color: #fff; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 640px) {
  .chat { height: 62vh; min-height: 380px; padding: 12px; }
  .msg { max-width: 88%; }
  .input-row input { padding: 10px 12px; }
  .btn { padding: 10px 16px; }
}
</style>
