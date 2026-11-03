/* 本地用户账号系统（纯前端，数据存 localStorage）
 * 账号结构：{ username, password(明文), apiKey, createdAt }
 * 会话：当前登录用户名存 localStorage('zy_current_user')
 * 每个用户的 API Key 单独存储：'zy_key_<username>'
 */

const USERS_KEY = 'zy_users'
const SESSION_KEY = 'zy_current_user'

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
  } catch (_) { return [] }
}
function saveUsers(list) {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(list)) } catch (_) { /* noop */ }
}

/* 简单哈希（非安全用途，仅避免 localStorage 明文显示密码） */
function simpleHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return h.toString(36)
}

/* 注册：返回 { ok, msg } */
export function register(username, password) {
  username = String(username || '').trim()
  password = String(password || '')
  if (username.length < 2) return { ok: false, msg: '用户名至少 2 个字符' }
  if (username.length > 20) return { ok: false, msg: '用户名最多 20 个字符' }
  if (!/^[A-Za-z0-9_\u4e00-\u9fa5]+$/.test(username)) {
    return { ok: false, msg: '用户名只能包含中英文、数字、下划线' }
  }
  if (password.length < 6) return { ok: false, msg: '密码至少 6 位' }
  if (password.length > 32) return { ok: false, msg: '密码最多 32 位' }

  const users = loadUsers()
  if (users.find((u) => u.username === username)) {
    return { ok: false, msg: '该用户名已被注册' }
  }
  users.push({
    username,
    password: simpleHash(password),
    apiKey: '',
    createdAt: Date.now()
  })
  saveUsers(users)
  return { ok: true, msg: '注册成功，请登录' }
}

/* 登录：返回 { ok, msg } */
export function login(username, password) {
  username = String(username || '').trim()
  password = String(password || '')
  if (!username || !password) return { ok: false, msg: '请输入用户名和密码' }
  const users = loadUsers()
  const u = users.find((x) => x.username === username)
  if (!u) return { ok: false, msg: '用户名不存在' }
  if (u.password !== simpleHash(password)) return { ok: false, msg: '密码错误' }
  localStorage.setItem(SESSION_KEY, username)
  return { ok: true, msg: '登录成功' }
}

/* 退出登录 */
export function logout() {
  try { localStorage.removeItem(SESSION_KEY) } catch (_) { /* noop */ }
}

/* 当前登录用户名 */
export function currentUser() {
  try { return localStorage.getItem(SESSION_KEY) || '' } catch (_) { return '' }
}

/* 获取当前用户信息 */
export function getCurrentUserInfo() {
  const name = currentUser()
  if (!name) return null
  const users = loadUsers()
  return users.find((u) => u.username === name) || null
}

/* 修改密码 */
export function changePassword(username, oldPwd, newPwd) {
  const users = loadUsers()
  const u = users.find((x) => x.username === username)
  if (!u) return { ok: false, msg: '用户不存在' }
  if (u.password !== simpleHash(oldPwd)) return { ok: false, msg: '原密码错误' }
  if (newPwd.length < 6) return { ok: false, msg: '新密码至少 6 位' }
  u.password = simpleHash(newPwd)
  saveUsers(users)
  return { ok: true, msg: '密码修改成功' }
}

/* 当前用户的 API Key 存取（按用户隔离） */
function userKeyStore(username) {
  return 'zy_key_' + username
}
export function getApiKey() {
  const name = currentUser()
  if (!name) return ''
  try { return localStorage.getItem(userKeyStore(name)) || '' } catch (_) { return '' }
}
export function setApiKey(key) {
  const name = currentUser()
  if (!name) return
  try { localStorage.setItem(userKeyStore(name), String(key || '').trim()) } catch (_) { /* noop */ }
}
export function clearApiKey() {
  const name = currentUser()
  if (!name) return
  try { localStorage.removeItem(userKeyStore(name)) } catch (_) { /* noop */ }
}
