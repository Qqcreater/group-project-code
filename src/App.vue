<template>
  <!-- 登录门控：未配置 API Key 时显示登录页 -->
  <Login v-if="!loggedIn" @login="loggedIn = true" />

  <div v-else class="app-shell">
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
          @click="onNav(m)"
        >
          <span class="nav-icon">{{ m.icon }}</span>
          <span class="nav-label">{{ m.name }}</span>
        </button>
      </nav>
      <div class="sidebar-foot">
        <div class="user-chip" title="点击打开设置" @click="openSettings">
          <span class="user-avatar">🧑‍⚕️</span>
          <div>
            <div class="user-name">{{ username }}</div>
            <div class="user-sub">{{ hasApiKey() ? '已配置 AI Key' : '未配置 AI Key' }}</div>
          </div>
          <span class="user-arrow">›</span>
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
          <component :is="activeComponent" @nav="current = $event" />
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
        @click="onNav(m)"
      >
        <span class="mnav-icon">{{ m.icon }}</span>
        <span class="mnav-label">{{ m.name }}</span>
      </button>
    </nav>

    <!-- 全局浮动数字人助手 -->
    <DigitalHuman />

    <!-- 用户设置弹窗 -->
    <div v-if="showSettings" class="modal-mask" @click.self="closeSettings">
      <div class="set-modal">
        <div class="set-head">
          <h3>账号设置</h3>
          <button class="set-close" @click="closeSettings">✕</button>
        </div>
        <div class="set-tabs">
          <button class="set-tab" :class="{ active: setTab === 'apikey' }" @click="setTab = 'apikey'">🔑 API Key</button>
          <button class="set-tab" :class="{ active: setTab === 'pwd' }" @click="setTab = 'pwd'">🔒 修改密码</button>
        </div>

        <div v-if="setTab === 'apikey'" class="set-body">
          <label>DeepSeek API Key</label>
          <input
            v-model.trim="apiKeyInput"
            type="text"
            placeholder="sk-…"
            autocomplete="off"
            spellcheck="false"
          />
          <p class="set-hint">Key 仅保存在本机浏览器，按用户隔离存储。可在 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener">DeepSeek 开放平台</a> 免费获取。</p>
          <p v-if="apiKeySaved" class="set-ok">✅ 保存成功，AI 能力已可用</p>
          <div class="set-foot">
            <button class="set-btn primary" @click="saveApiKey">保存</button>
          </div>
        </div>

        <div v-else class="set-body">
          <label>原密码</label>
          <input v-model="oldPwd" type="password" placeholder="请输入原密码" />
          <label>新密码</label>
          <input v-model="newPwd" type="password" placeholder="至少 6 位" />
          <label>确认新密码</label>
          <input v-model="newPwd2" type="password" placeholder="再次输入新密码" />
          <p v-if="pwdMsg" :class="pwdOk ? 'set-ok' : 'set-err'">{{ pwdMsg }}</p>
          <div class="set-foot">
            <button class="set-btn primary" @click="doChangePwd">修改密码</button>
          </div>
        </div>

        <div class="set-logout">
          <button class="logout-btn" @click="logout">退出登录</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import HealthSelfTest from './components/HealthSelfTest.vue'
import MedicinalCuisine from './components/MedicinalCuisine.vue'
import HealthCourses from './components/HealthCourses.vue'
import StoreBooking from './components/StoreBooking.vue'
import Community from './components/Community.vue'
import DigitalHuman from './components/DigitalHuman.vue'
import Login from './components/Login.vue'
import Home from './components/Home.vue'
import { currentUser, logout as userLogout, getApiKey, setApiKey, changePassword } from './utils/userService'

export default {
  name: 'App',
  components: {
    HealthSelfTest,
    MedicinalCuisine,
    HealthCourses,
    StoreBooking,
    Community,
    DigitalHuman,
    Login,
    Home
  },
  data() {
    return {
      loggedIn: !!currentUser(),
      username: currentUser() || '',
      current: 'home',
      showSettings: false,
      // 设置弹窗数据
      setTab: 'apikey', // 'apikey' | 'pwd'
      apiKeyInput: '',
      apiKeySaved: false,
      oldPwd: '',
      newPwd: '',
      newPwd2: '',
      pwdMsg: '',
      pwdOk: false,
      modules: [
        { key: 'home', name: '首页', icon: '🏠', comp: 'Home' },
        { key: 'self', name: '健康自测', icon: '🩺', comp: 'HealthSelfTest' },
        { key: 'cuisine', name: '食疗药膳', icon: '🍲', comp: 'MedicinalCuisine' },
        { key: 'courses', name: '养生课程', icon: '🧘', comp: 'HealthCourses' },
        { key: 'booking', name: '门店预约', icon: '📍', comp: 'StoreBooking' },
        { key: 'community', name: '互动社区', icon: '💬', comp: 'Community' },
        { key: 'ai', name: '数字人小颐', icon: '🧑‍⚕️', comp: null }
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
  },
  methods: {
    onNav(m) {
      // 「数字人小颐」不切页面，直接唤起右下角数字人工作台对话
      if (m.key === 'ai') {
        window.dispatchEvent(new CustomEvent('zy-open-xiaoyi'))
        return
      }
      this.current = m.key
    },
    hasApiKey() {
      return !!getApiKey()
    },
    openSettings() {
      this.apiKeyInput = getApiKey() || ''
      this.apiKeySaved = false
      this.oldPwd = ''
      this.newPwd = ''
      this.newPwd2 = ''
      this.pwdMsg = ''
      this.pwdOk = false
      this.setTab = 'apikey'
      this.showSettings = true
    },
    closeSettings() {
      this.showSettings = false
    },
    saveApiKey() {
      this.apiKeySaved = false
      if (!this.apiKeyInput) {
        // 允许清空
        setApiKey('')
        this.apiKeySaved = true
        return
      }
      if (!/^sk-/.test(this.apiKeyInput)) {
        alert('⚠️ Key 格式不对，应以 sk- 开头')
        return
      }
      setApiKey(this.apiKeyInput)
      this.apiKeySaved = true
    },
    doChangePwd() {
      this.pwdMsg = ''
      this.pwdOk = false
      if (!this.oldPwd || !this.newPwd || !this.newPwd2) {
        this.pwdMsg = '请填写完整信息'
        return
      }
      if (this.newPwd !== this.newPwd2) {
        this.pwdMsg = '两次输入的新密码不一致'
        return
      }
      const r = changePassword(this.username, this.oldPwd, this.newPwd)
      this.pwdMsg = r.msg
      this.pwdOk = r.ok
      if (r.ok) {
        this.oldPwd = ''
        this.newPwd = ''
        this.newPwd2 = ''
      }
    },
    logout() {
      if (confirm('确定退出登录？')) {
        userLogout()
        this.loggedIn = false
        this.showSettings = false
      }
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
  cursor: pointer;
  border-radius: 10px;
  padding: 6px;
  margin: -6px;
  transition: background 0.2s;
}
.user-chip:hover {
  background: rgba(255, 255, 255, 0.08);
}
.user-arrow {
  margin-left: auto;
  font-size: 20px;
  color: #a9c9bd;
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

/* ===== 用户设置弹窗 ===== */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 30, 24, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: 16px;
}
.set-modal {
  background: #fff;
  border-radius: 18px;
  width: 420px;
  max-width: 100%;
  padding: 22px 24px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.25);
}
.set-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.set-head h3 {
  margin: 0;
  color: #2f5d50;
  font-size: 18px;
}
.set-close {
  border: none;
  background: #e3ece7;
  color: #5a6b62;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
}
.set-close:hover {
  background: #d3e0d9;
}
.set-tabs {
  display: flex;
  background: #eef3f0;
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 18px;
}
.set-tab {
  flex: 1;
  border: none;
  background: transparent;
  padding: 8px 0;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 600;
  color: #6b7c73;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.set-tab.active {
  background: #fff;
  color: #2f5d50;
  box-shadow: 0 2px 8px rgba(47, 93, 80, 0.12);
}
.set-body label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #2f5d50;
  margin: 12px 0 6px;
}
.set-body input {
  width: 100%;
  box-sizing: border-box;
  border: 1.5px solid #d7e3dc;
  border-radius: 9px;
  background: #f8fbf9;
  padding: 9px 12px;
  font-size: 13.5px;
  color: #2c3e50;
  outline: none;
  transition: border-color 0.2s;
}
.set-body input:focus {
  border-color: #7fc8a9;
}
.set-hint {
  font-size: 12px;
  color: #8a9b93;
  line-height: 1.6;
  margin: 10px 0 0;
}
.set-hint a {
  color: #2f5d50;
  text-decoration: none;
  font-weight: 600;
}
.set-hint a:hover {
  text-decoration: underline;
}
.set-ok {
  margin: 12px 0 0;
  font-size: 13px;
  color: #2f6d4a;
  background: #eef7f1;
  border: 1px solid #b7dcc9;
  border-radius: 8px;
  padding: 8px 12px;
}
.set-err {
  margin: 12px 0 0;
  font-size: 13px;
  color: #c0564f;
  background: #fdf1f0;
  border: 1px solid #f3d4d1;
  border-radius: 8px;
  padding: 8px 12px;
}
.set-foot {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.set-btn {
  padding: 9px 22px;
  border: 1px solid #2f5d50;
  background: #fff;
  color: #2f5d50;
  border-radius: 9px;
  cursor: pointer;
  font-size: 13.5px;
  font-weight: 600;
}
.set-btn.primary {
  background: #2f5d50;
  color: #fff;
}
.set-btn.primary:hover {
  opacity: 0.92;
}
.set-logout {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #eef2ef;
  text-align: center;
}
.logout-btn {
  border: none;
  background: transparent;
  color: #c0564f;
  font-size: 14px;
  cursor: pointer;
  font-weight: 600;
}
.logout-btn:hover {
  text-decoration: underline;
}
</style>
