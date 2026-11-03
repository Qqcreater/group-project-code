<template>
  <div class="login-wrap">
    <!-- 背景装饰 -->
    <div class="login-deco deco-1">🌿</div>
    <div class="login-deco deco-2">🍃</div>

    <div class="login-card">
      <div class="login-logo">養</div>
      <h1 class="login-title">颐养轩</h1>
      <p class="login-sub">智慧养生平台</p>

      <!-- 登录/注册切换 -->
      <div class="login-tabs">
        <button
          class="tab"
          :class="{ active: mode === 'login' }"
          @click="mode = 'login'"
        >登录</button>
        <button
          class="tab"
          :class="{ active: mode === 'register' }"
          @click="mode = 'register'"
        >注册</button>
      </div>

      <template v-if="mode === 'login'">
        <label class="login-label" for="userInput">用户名</label>
        <div class="login-input-row">
          <input
            id="userInput"
            v-model.trim="username"
            type="text"
            placeholder="请输入用户名"
            autocomplete="username"
            @keyup.enter="doLogin"
          />
        </div>

        <label class="login-label" for="pwdInput">密码</label>
        <div class="login-input-row">
          <input
            id="pwdInput"
            v-model="password"
            :type="showPwd ? 'text' : 'password'"
            placeholder="请输入密码"
            autocomplete="current-password"
            @keyup.enter="doLogin"
          />
          <button
            type="button"
            class="login-eye"
            :title="showPwd ? '隐藏' : '显示'"
            @click="showPwd = !showPwd"
          >{{ showPwd ? '🙈' : '👁️' }}</button>
        </div>

        <button class="login-btn" :disabled="loading || !username || !password" @click="doLogin">
          {{ loading ? '登录中…' : '登 录' }}
        </button>
      </template>

      <template v-else>
        <label class="login-label" for="regUser">用户名</label>
        <div class="login-input-row">
          <input
            id="regUser"
            v-model.trim="regUsername"
            type="text"
            placeholder="2-20位，中英文/数字/下划线"
            autocomplete="username"
            @keyup.enter="doRegister"
          />
        </div>

        <label class="login-label" for="regPwd">密码</label>
        <div class="login-input-row">
          <input
            id="regPwd"
            v-model="regPassword"
            :type="showPwd ? 'text' : 'password'"
            placeholder="至少 6 位"
            autocomplete="new-password"
            @keyup.enter="doRegister"
          />
          <button
            type="button"
            class="login-eye"
            :title="showPwd ? '隐藏' : '显示'"
            @click="showPwd = !showPwd"
          >{{ showPwd ? '🙈' : '👁️' }}</button>
        </div>

        <label class="login-label" for="regPwd2">确认密码</label>
        <div class="login-input-row">
          <input
            id="regPwd2"
            v-model="regPassword2"
            :type="showPwd ? 'text' : 'password'"
            placeholder="再次输入密码"
            autocomplete="new-password"
            @keyup.enter="doRegister"
          />
        </div>

        <button class="login-btn" :disabled="loading" @click="doRegister">
          {{ loading ? '注册中…' : '注 册' }}
        </button>
      </template>

      <p v-if="error" class="login-err">{{ error }}</p>
      <p v-if="success" class="login-success">{{ success }}</p>

      <div class="login-tip">
        账号数据保存在本机浏览器，不会上传服务器。登录后可在头像处配置 DeepSeek API Key 以使用 AI 能力。
      </div>
    </div>
  </div>
</template>

<script>
import { login, register } from '@/utils/userService'

export default {
  name: 'LoginPage',
  data() {
    return {
      mode: 'login', // 'login' | 'register'
      // 登录
      username: '',
      password: '',
      // 注册
      regUsername: '',
      regPassword: '',
      regPassword2: '',
      showPwd: false,
      loading: false,
      error: '',
      success: ''
    }
  },
  watch: {
    mode() {
      this.error = ''
      this.success = ''
    }
  },
  methods: {
    doLogin() {
      if (this.loading || !this.username || !this.password) return
      this.loading = true
      this.error = ''
      this.success = ''
      // 模拟异步，给 loading 反馈
      setTimeout(() => {
        const r = login(this.username, this.password)
        this.loading = false
        if (!r.ok) {
          this.error = r.msg
          return
        }
        this.success = r.msg
        setTimeout(() => this.$emit('login'), 400)
      }, 300)
    },
    doRegister() {
      if (this.loading) return
      this.error = ''
      this.success = ''
      if (this.regPassword !== this.regPassword2) {
        this.error = '两次输入的密码不一致'
        return
      }
      this.loading = true
      setTimeout(() => {
        const r = register(this.regUsername, this.regPassword)
        this.loading = false
        if (!r.ok) {
          this.error = r.msg
          return
        }
        this.success = r.msg
        // 注册成功切回登录并预填用户名
        setTimeout(() => {
          this.username = this.regUsername
          this.password = ''
          this.regUsername = ''
          this.regPassword = ''
          this.regPassword2 = ''
          this.mode = 'login'
        }, 800)
      }, 300)
    }
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(150deg, #2f5d50 0%, #234740 55%, #1c3a33 100%);
  font-family: 'PingFang SC', 'Microsoft YaHei', Avenir, Helvetica, Arial, sans-serif;
  position: relative;
  overflow: hidden;
  padding: 20px;
}
.login-deco {
  position: absolute;
  font-size: 120px;
  opacity: 0.08;
  user-select: none;
  pointer-events: none;
}
.deco-1 { top: 6%; left: 8%; }
.deco-2 { bottom: 8%; right: 10%; font-size: 160px; }

.login-card {
  width: 380px;
  max-width: 94vw;
  background: #fff;
  border-radius: 18px;
  padding: 38px 34px 28px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
  text-align: center;
  position: relative;
  z-index: 1;
}
.login-logo {
  width: 58px;
  height: 58px;
  margin: 0 auto 14px;
  border-radius: 15px;
  background: #7fc8a9;
  color: #1f3d34;
  font-size: 30px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-title {
  margin: 0;
  font-size: 24px;
  letter-spacing: 3px;
  color: #2f5d50;
}
.login-sub {
  margin: 6px 0 22px;
  font-size: 13px;
  color: #8a9b93;
}
/* 登录/注册切换 */
.login-tabs {
  display: flex;
  background: #eef3f0;
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 22px;
}
.login-tabs .tab {
  flex: 1;
  border: none;
  background: transparent;
  padding: 9px 0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #6b7c73;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.login-tabs .tab.active {
  background: #fff;
  color: #2f5d50;
  box-shadow: 0 2px 8px rgba(47, 93, 80, 0.12);
}
.login-label {
  display: block;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: #2f5d50;
  margin-bottom: 8px;
}
.login-input-row {
  display: flex;
  align-items: center;
  border: 1.5px solid #d7e3dc;
  border-radius: 10px;
  padding: 0 6px 0 12px;
  transition: border-color 0.2s;
  background: #f8fbf9;
}
.login-input-row:focus-within {
  border-color: #7fc8a9;
}
.login-input-row input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  padding: 12px 0;
  color: #2c3e50;
  min-width: 0;
  letter-spacing: 0.5px;
}
.login-eye {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  padding: 6px;
  opacity: 0.65;
}
.login-eye:hover { opacity: 1; }
.login-btn {
  width: 100%;
  margin-top: 18px;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #35705f, #2f5d50);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 4px;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}
.login-btn:hover:not(:disabled) { opacity: 0.92; }
.login-btn:active:not(:disabled) { transform: scale(0.985); }
.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.login-err {
  margin: 14px 0 0;
  font-size: 13px;
  color: #c0564f;
  background: #fdf1f0;
  border: 1px solid #f3d4d1;
  border-radius: 8px;
  padding: 9px 12px;
  text-align: left;
  line-height: 1.55;
}
.login-success {
  margin: 14px 0 0;
  font-size: 13px;
  color: #2f6d4a;
  background: #eef7f1;
  border: 1px solid #b7dcc9;
  border-radius: 8px;
  padding: 9px 12px;
  text-align: left;
  line-height: 1.55;
}
.login-tip {
  margin-top: 20px;
  font-size: 11.5px;
  color: #9aaba2;
  line-height: 1.7;
  border-top: 1px dashed #e2ebe6;
  padding-top: 14px;
  text-align: left;
}
.login-tip a {
  color: #35705f;
  text-decoration: none;
  font-weight: 600;
}
.login-tip a:hover { text-decoration: underline; }

@media (max-width: 480px) {
  .login-card { padding: 30px 22px 22px; }
}
</style>
