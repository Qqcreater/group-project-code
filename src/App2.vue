<template>
  <div class="app-shell">
    <!-- 侧边导航 -->
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-logo">養</div>
        <div class="brand-text">
          <h1>颐养轩</h1>
          <span>智慧养生平台</span>
        </div>
      </div>
      <nav class="nav">
        <button
          v-for="m in modules"
          :key="m.key"
          class="nav-item"
          :class="{ active: current === m.key }"
          @click="current = m.key"
        >
          <span class="nav-icon">{{ m.icon }}</span>
          <span class="nav-label">{{ m.name }}</span>
        </button>
      </nav>
      <div class="sidebar-foot">
        <div class="user-chip">
          <span class="user-avatar">🧑‍⚕️</span>
          <div>
            <div class="user-name">张仲景</div>
            <div class="user-sub">VIP 会员</div>
          </div>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main">
      <header class="topbar">
        <div class="topbar-brand">養</div>
        <div class="topbar-title">
          <span class="crumb">养生平台</span>
          <span class="crumb-sep">/</span>
          <span class="crumb current">{{ activeModule.name }}</span>
        </div>
        <div class="topbar-actions">
          <div class="search-box">
            <span>🔍</span>
            <input type="text" placeholder="搜索养生内容…" />
          </div>
          <div class="bell">🔔</div>
        </div>
      </header>

      <section class="content">
        <keep-alive>
          <component :is="activeComponent" />
        </keep-alive>
      </section>
    </main>

    <!-- 手机底部导航 -->
    <nav class="mobile-nav">
      <button
        v-for="m in modules"
        :key="m.key"
        class="mnav-item"
        :class="{ active: current === m.key }"
        @click="current = m.key"
      >
        <span class="mnav-icon">{{ m.icon }}</span>
        <span class="mnav-label">{{ m.name }}</span>
      </button>
    </nav>

    <!-- 全局浮动数字人助手 -->
    <DigitalHuman />
  </div>
</template>

<script>
import HealthSelfTest from './components/HealthSelfTest.vue'
import MedicinalCuisine from './components/MedicinalCuisine.vue'
import HealthCourses from './components/HealthCourses.vue'
import StoreBooking from './components/StoreBooking.vue'
import Community from './components/Community.vue'
import DigitalHuman from './components/DigitalHuman.vue'
import AiAssistant from './components/AiAssistant.vue'

export default {
  name: 'App',
  components: {
    HealthSelfTest,
    MedicinalCuisine,
    HealthCourses,
    StoreBooking,
    Community,
    DigitalHuman,
    AiAssistant
  },
  data() {
    return {
      current: 'self',
      modules: [
        { key: 'self', name: '健康自测', icon: '🩺', comp: 'HealthSelfTest' },
        { key: 'cuisine', name: '食疗药膳', icon: '🍲', comp: 'MedicinalCuisine' },
        { key: 'courses', name: '养生课程', icon: '🧘', comp: 'HealthCourses' },
        { key: 'booking', name: '门店预约', icon: '📍', comp: 'StoreBooking' },
        { key: 'community', name: '互动社区', icon: '💬', comp: 'Community' },
        { key: 'ai', name: 'AI 助手', icon: '✨', comp: 'AiAssistant' }
      ]
    }
  },
  computed: {
    activeModule() {
      return this.modules.find((m) => m.key === this.current) || this.modules[0]
    },
    activeComponent() {
      return this.activeModule.comp
    }
  }
}
</script>

<style>
* {
  box-sizing: border-box;
}
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  -webkit-tap-highlight-color: transparent;
}
#app {
  min-height: 100vh;
}
@supports (height: 100dvh) {
  #app {
    min-height: 100dvh;
  }
}
button {
  font-family: inherit;
  touch-action: manipulation;
}
</style>

<style scoped>
.app-shell {
  display: flex;
  height: 100vh;
  background: #f5f7f4;
  font-family: 'PingFang SC', 'Microsoft YaHei', Avenir, Helvetica, Arial, sans-serif;
  color: #2c3e50;
}

/* 侧边栏 */
.sidebar {
  width: 232px;
  background: linear-gradient(180deg, #2f5d50 0%, #234740 100%);
  color: #eaf3ee;
  display: flex;
  flex-direction: column;
  padding: 22px 16px;
  flex-shrink: 0;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}
.brand-logo {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #7fc8a9;
  color: #1f3d34;
  font-size: 24px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand-text h1 {
  margin: 0;
  font-size: 19px;
  letter-spacing: 2px;
}
.brand-text span {
  font-size: 12px;
  color: #a9c9bd;
}
.nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: none;
  background: transparent;
  color: #cfe4da;
  font-size: 15px;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
.nav-item.active {
  background: #7fc8a9;
  color: #1f3d34;
  font-weight: 600;
}
.nav-icon {
  font-size: 18px;
}
.sidebar-foot {
  margin-top: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding-top: 14px;
}
.user-chip {
  display: flex;
  align-items: center;
  gap: 10px;
}
.user-avatar {
  font-size: 26px;
}
.user-name {
  font-size: 14px;
}
.user-sub {
  font-size: 11px;
  color: #a9c9bd;
}

/* 主区域 */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.topbar {
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #e6ebe7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  flex-shrink: 0;
}
.topbar-title {
  font-size: 15px;
}
.crumb {
  color: #8a9b93;
}
.crumb-sep {
  margin: 0 8px;
  color: #c2cfc9;
}
.crumb.current {
  color: #2f5d50;
  font-weight: 600;
}
.topbar-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f1f4f1;
  border-radius: 20px;
  padding: 8px 14px;
}
.search-box input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
  width: 160px;
}
.bell {
  font-size: 18px;
  cursor: pointer;
}
.content {
  flex: 1;
  overflow-y: auto;
  padding: 26px 30px 40px;
}

/* 手机顶部品牌标识（仅移动端显示） */
.topbar-brand {
  display: none;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: #7fc8a9;
  color: #1f3d34;
  font-size: 18px;
  font-weight: 700;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 手机底部导航（仅移动端显示） */
.mobile-nav {
  display: none;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  background: #fff;
  border-top: 1px solid #e6ebe7;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.06);
  padding: 5px 2px calc(5px + env(safe-area-inset-bottom));
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.mnav-item {
  flex: 1;
  min-width: 46px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 5px 2px;
  border: none;
  background: transparent;
  color: #8a9b93;
  border-radius: 10px;
  cursor: pointer;
}
.mnav-icon {
  font-size: 20px;
  line-height: 1;
}
.mnav-label {
  font-size: 10px;
  white-space: nowrap;
}
.mnav-item.active {
  color: #2f5d50;
  font-weight: 600;
  background: #eef6f1;
}

/* ========== 手机适配 ========== */
@media (max-width: 768px) {
  .app-shell {
    height: auto;
    min-height: 100vh;
  }
  @supports (height: 100dvh) {
    .app-shell {
      min-height: 100dvh;
    }
  }
  .sidebar {
    display: none;
  }
  .topbar {
    height: 54px;
    padding: 0 12px;
  }
  .topbar-brand {
    display: flex;
    margin-right: 10px;
  }
  .search-box {
    display: none;
  }
  .bell {
    font-size: 20px;
  }
  .content {
    overflow-y: visible;
    padding: 14px 12px calc(84px + env(safe-area-inset-bottom));
  }
  .mobile-nav {
    display: flex;
    gap: 2px;
  }
}
</style>
