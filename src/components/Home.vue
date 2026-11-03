<template>
  <div class="module home">
    <!-- 欢迎 Banner -->
    <div class="hero">
      <div class="hero-text">
        <div class="hero-greet">{{ greeting }}，{{ userName }} 👋</div>
        <h1 class="hero-title">颐养轩 · 智慧养生</h1>
        <p class="hero-sub">AI 中医养生顾问 · 食疗药膳 · 跟练课程 · 体质自测</p>
        <div class="hero-actions">
          <button class="hero-btn primary" @click="goto('courses')">🧘 今日跟练</button>
          <button class="hero-btn" @click="openXiaoyi">🧑‍⚕️ 问问小颐</button>
        </div>
      </div>
      <div class="hero-illust">
        <div class="hero-circle"></div>
        <div class="hero-emoji">🌿</div>
      </div>
    </div>

    <!-- 快捷功能入口 -->
    <div class="section">
      <div class="sec-head">
        <h3>核心功能</h3>
        <span class="sec-sub">一站式养生体验</span>
      </div>
      <div class="quick-grid">
        <button
          v-for="m in quickModules"
          :key="m.key"
          class="quick-card"
          @click="onQuick(m)"
        >
          <span class="quick-ico" :style="{ background: m.bg }">{{ m.icon }}</span>
          <span class="quick-name">{{ m.name }}</span>
          <span class="quick-desc">{{ m.desc }}</span>
        </button>
      </div>
    </div>

    <!-- 今日推荐课程 -->
    <div class="section">
      <div class="sec-head">
        <h3>📺 今日推荐课程</h3>
        <button class="sec-link" @click="goto('courses')">全部课程 →</button>
      </div>
      <div class="rec-courses">
        <div
          v-for="c in recommendCourses"
          :key="c.id"
          class="rec-card"
          @click="goto('courses')"
        >
          <div class="rec-cover">{{ c.emoji }}</div>
          <div class="rec-info">
            <div class="rec-title">{{ c.title }}</div>
            <div class="rec-meta">
              <span>{{ c.cat }}</span>
              <span>·</span>
              <span>{{ c.level }}</span>
              <span>·</span>
              <span>{{ c.videoSec > 0 ? Math.round(c.videoSec / 60) + '分钟' : '' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 养生小贴士 -->
    <div class="section">
      <div class="sec-head">
        <h3>💡 今日养生小贴士</h3>
      </div>
      <div class="tips">
        <div
          v-for="(t, i) in tips"
          :key="i"
          class="tip"
        >
          <span class="tip-ico">{{ t.icon }}</span>
          <div class="tip-text">
            <div class="tip-title">{{ t.title }}</div>
            <div class="tip-desc">{{ t.desc }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷咨询数字人 -->
    <div class="xiaoyi-card" @click="openXiaoyi">
      <div class="xy-left">
        <div class="xy-avatar">🧑‍⚕️</div>
        <div>
          <div class="xy-name">小颐 · 养生顾问</div>
          <div class="xy-sub">失眠 / 饮食 / 体质 / 食疗，24小时在线</div>
        </div>
      </div>
      <span class="xy-go">开始对话 →</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HomePage',
  data() {
    return {
      quickModules: [
        { key: 'self', name: '健康自测', icon: '🩺', desc: '体质/舌象/脉象', bg: '#e3f1ea' },
        { key: 'cuisine', name: '食疗药膳', icon: '🍲', desc: '对症食补', bg: '#fdf0e6' },
        { key: 'courses', name: '养生课程', icon: '🧘', desc: '跟练教学', bg: '#eaf2fb' },
        { key: 'booking', name: '门店预约', icon: '📍', desc: '线下就诊', bg: '#f3ecfb' },
        { key: 'community', name: '互动社区', icon: '💬', desc: '养生交流', bg: '#ecf7f0' },
        { key: 'ai', name: '数字人小颐', icon: '🧑‍⚕️', desc: 'AI 顾问', bg: '#fdf1f0' }
      ],
      // 内置推荐课程（与 HealthCourses 保持一致，避免跨组件耦合）
      recommendCourses: [
        { id: 1, emoji: '🧎', title: '八段锦入门十二式', cat: '八段锦', level: '入门', videoSec: 736 },
        { id: 4, emoji: '🧘‍♀️', title: '办公室肩颈舒缓瑜伽', cat: '瑜伽', level: '入门', videoSec: 872 },
        { id: 3, emoji: '🌙', title: '睡前正念冥想引导', cat: '冥想', level: '入门', videoSec: 1848 }
      ],
      tips: [
        { icon: '🌅', title: '晨起一杯温水', desc: '清晨空腹喝 200ml 温水，唤醒脾胃，促进代谢' },
        { icon: '🍵', title: '午后轻茶饮', desc: '下午 3 点一杯绿茶或枸杞茶，提神明目不影响睡眠' },
        { icon: '🌙', title: '睡前不看手机', desc: '睡前 1 小时远离蓝光，用热水泡脚 15 分钟助眠' }
      ]
    }
  },
  computed: {
    greeting() {
      const h = new Date().getHours()
      if (h < 6) return '夜深了'
      if (h < 11) return '早上好'
      if (h < 14) return '中午好'
      if (h < 18) return '下午好'
      return '晚上好'
    },
    userName() {
      return '养生达人'
    }
  },
  methods: {
    goto(key) {
      // 通知父组件切换模块
      this.$emit('nav', key)
    },
    onQuick(m) {
      this.goto(m.key)
    },
    openXiaoyi() {
      window.dispatchEvent(new CustomEvent('zy-open-xiaoyi'))
    }
  }
}
</script>

<style scoped>
.home {
  font-family: 'PingFang SC', 'Microsoft YaHei', Avenir, Helvetica, Arial, sans-serif;
}

/* Hero Banner */
.hero {
  position: relative;
  background: linear-gradient(135deg, #2f5d50 0%, #35705f 60%, #468575 100%);
  border-radius: 18px;
  padding: 36px 32px;
  color: #fff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 180px;
  margin-bottom: 26px;
}
.hero-text {
  flex: 1;
  min-width: 0;
  z-index: 2;
}
.hero-greet {
  font-size: 15px;
  opacity: 0.85;
  margin-bottom: 6px;
}
.hero-title {
  margin: 0 0 10px;
  font-size: 30px;
  letter-spacing: 2px;
  font-weight: 700;
}
.hero-sub {
  margin: 0 0 22px;
  font-size: 14px;
  opacity: 0.85;
}
.hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.hero-btn {
  padding: 11px 24px;
  border: 1.5px solid rgba(255, 255, 255, 0.5);
  background: transparent;
  color: #fff;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.hero-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}
.hero-btn.primary {
  background: #fff;
  color: #2f5d50;
  border-color: #fff;
}
.hero-btn.primary:hover {
  background: #f0f7f3;
}
.hero-illust {
  position: relative;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  z-index: 1;
}
.hero-circle {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  animation: hero-pulse 3s ease-in-out infinite;
}
.hero-emoji {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60px;
  opacity: 0.9;
}
@keyframes hero-pulse {
  0%, 100% { transform: scale(1); opacity: 0.12; }
  50% { transform: scale(1.15); opacity: 0.08; }
}

/* Section 通用 */
.section {
  margin-bottom: 26px;
}
.sec-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.sec-head h3 {
  margin: 0;
  font-size: 17px;
  color: #2f5d50;
  font-weight: 700;
}
.sec-sub {
  font-size: 12px;
  color: #8a9b93;
}
.sec-link {
  border: none;
  background: transparent;
  color: #2f5d50;
  font-size: 13px;
  cursor: pointer;
  font-weight: 600;
}
.sec-link:hover {
  text-decoration: underline;
}

/* 快捷入口网格 */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.quick-card {
  background: #fff;
  border: none;
  border-radius: 14px;
  padding: 20px 14px;
  cursor: pointer;
  text-align: center;
  box-shadow: 0 4px 16px rgba(47, 93, 80, 0.06);
  transition: transform 0.15s, box-shadow 0.15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-family: inherit;
}
.quick-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 22px rgba(47, 93, 80, 0.14);
}
.quick-ico {
  width: 48px;
  height: 48px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-bottom: 4px;
}
.quick-name {
  font-size: 14px;
  font-weight: 600;
  color: #2f5d50;
}
.quick-desc {
  font-size: 11.5px;
  color: #8a9b93;
}

/* 推荐课程 */
.rec-courses {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.rec-card {
  background: #fff;
  border-radius: 14px;
  padding: 14px;
  display: flex;
  gap: 12px;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(47, 93, 80, 0.06);
  transition: transform 0.15s;
}
.rec-card:hover {
  transform: translateY(-2px);
}
.rec-cover {
  width: 54px;
  height: 54px;
  border-radius: 12px;
  background: #eef6f1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rec-meta {
  font-size: 12px;
  color: #8a9b93;
  margin-top: 4px;
  display: flex;
  gap: 4px;
}

/* 小贴士 */
.tips {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.tip {
  background: #fff;
  border-radius: 14px;
  padding: 18px;
  display: flex;
  gap: 12px;
  box-shadow: 0 4px 16px rgba(47, 93, 80, 0.06);
}
.tip-ico {
  font-size: 28px;
  flex-shrink: 0;
}
.tip-text {
  flex: 1;
  min-width: 0;
}
.tip-title {
  font-size: 14px;
  font-weight: 600;
  color: #2f5d50;
  margin-bottom: 4px;
}
.tip-desc {
  font-size: 12.5px;
  color: #6b7c73;
  line-height: 1.6;
}

/* 数字人快捷卡 */
.xiaoyi-card {
  background: linear-gradient(135deg, #e3f1ea, #f4faf6);
  border: 1.5px solid #b7dcc9;
  border-radius: 16px;
  padding: 20px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.15s;
}
.xiaoyi-card:hover {
  box-shadow: 0 8px 22px rgba(47, 93, 80, 0.15);
  transform: translateY(-2px);
}
.xy-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.xy-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  box-shadow: 0 2px 8px rgba(47, 93, 80, 0.12);
}
.xy-name {
  font-size: 16px;
  font-weight: 700;
  color: #2f5d50;
}
.xy-sub {
  font-size: 12.5px;
  color: #6b7c73;
  margin-top: 3px;
}
.xy-go {
  font-size: 14px;
  font-weight: 600;
  color: #2f5d50;
  flex-shrink: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
    padding: 26px 20px;
    min-height: auto;
  }
  .hero-title {
    font-size: 24px;
  }
  .hero-illust {
    display: none;
  }
  .quick-grid,
  .rec-courses,
  .tips {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 480px) {
  .quick-grid,
  .rec-courses,
  .tips {
    grid-template-columns: 1fr;
  }
}
</style>
