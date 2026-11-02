// 官方地图 POI（兴趣点）数据接入服务
// ------------------------------------------------------------
// 支持在无后端的纯前端应用里调用地图厂商官方检索接口：
//   1. 高德地图 · 搜索服务 Place API v3 —— 支持 JSONP，浏览器可直连（推荐）
//   2. 百度地图 · 地点检索 API v2 —— 不支持 CORS/JSONP，走本地反向代理 /bapi
//      （开发模式 devServer 已配置；生产部署时用 nginx 配同样的代理即可）
//
// Key 均需在对应开放平台免费申请：
//   百度：lbsyun.baidu.com → 控制台 → 创建应用 → 类型「服务端」→ 勾选「地点检索」
//   高德：console.amap.com  → 应用管理 → 创建 Key → 服务平台选「Web服务」
// ------------------------------------------------------------

import { bd09ToGcj02 } from '../utils/geo.js'

// 养生行业检索关键词矩阵：逐个关键词搜索再合并去重，才能覆盖「所有」门店
export const POI_KEYWORDS = [
  '养生', '足疗', '按摩', '推拿', '艾灸', 'SPA',
  '汗蒸', '采耳', '头疗', '足道', '洗浴', '经络', '理疗', '中医养生'
]

let jsonpSeq = 0

/** 通用 JSONP 请求（script 标签方式，绕过 CORS 限制） */
function jsonp(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const cb = '__yyx_poi_cb_' + Date.now().toString(36) + '_' + (jsonpSeq++)
    const script = document.createElement('script')
    let done = false
    const cleanup = () => {
      try { delete window[cb] } catch (e) { window[cb] = undefined }
      if (script.parentNode) script.parentNode.removeChild(script)
    }
    const timer = setTimeout(() => {
      if (!done) { done = true; cleanup(); reject(new Error('请求超时（网络异常或 Key 无效）')) }
    }, timeout)
    window[cb] = (data) => {
      done = true
      clearTimeout(timer)
      cleanup()
      resolve(data)
    }
    script.onerror = () => {
      if (!done) { done = true; clearTimeout(timer); cleanup(); reject(new Error('网络请求失败')) }
    }
    script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + cb
    document.head.appendChild(script)
  })
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 电话字段清洗：空值/打码号码返回 ''（后续显示「见门店页」） */
function normTel(t) {
  if (!t) return ''
  if (Array.isArray(t)) t = t[0]
  t = String(t).trim()
  if (!t || t === '[]' || /\*{3,}/.test(t)) return ''
  return t.split(/[;；,，/]/)[0].trim()
}

/** 去重键 */
function dedupeKey(name, addr) {
  return String(name).replace(/\s/g, '') + '|' + String(addr || '').replace(/\s/g, '')
}

const BAIDU_ERR = {
  1: '服务内部错误',
  2: '请求参数非法（检查城市名）',
  3: 'AK 校验失败：请确认 Key 类型为「服务端」且已开启地点检索服务',
  4: '配额超限：当日查询量已达上限，请明天再试或申请提额',
  200: 'AK 有误（APP 不存在），请检查 AK 是否复制完整',
  210: 'AK 校验失败：请把应用 IP 白名单设为 0.0.0.0/0',
  201: '应用被禁用',
  240: '应用被禁用',
  253: 'AK 被封禁'
}

/**
 * 百度接口请求：百度地点检索 API 既不支持 JSONP 也不带 CORS 头，
 * 浏览器无法直连。按优先级依次尝试：
 *   1) 本地反向代理 /bapi（vue.config.js devServer 已配置，生产用 nginx 同样配置）
 *   2) 公共 CORS 代理兜底
 */
async function baiduFetch(url) {
  // 1) 本地反向代理
  try {
    const r = await fetch(url.replace('https://api.map.baidu.com', '/bapi'), {
      headers: { Accept: 'application/json' }
    })
    if (r.ok) return await r.json()
  } catch (e) { /* 继续尝试下一种方式 */ }
  // 2) 公共 CORS 代理兜底（速度较慢）
  try {
    const r = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(url))
    if (r.ok) return await r.json()
  } catch (e) { /* 继续抛错 */ }
  throw new Error(
    '百度接口无法从浏览器直连（官方未开放 CORS/JSONP）。建议改用「高德」数据源（支持浏览器直连）；' +
    '或在部署时为 api.map.baidu.com 配置反向代理（路径 /bapi）'
  )
}

const AMAP_ERR = {
  10001: 'Key 不正确，或类型不符（高德需申请「Web服务」类型 Key）',
  10002: '服务不可用',
  10003: '每日调用量超配额',
  10004: '账户余额不足',
  10005: 'QPS 超限，请稍后重试',
  10007: '数字签名/白名单校验未通过（可在控制台关闭数字签名校验）',
  10009: 'Key 被禁用',
  10010: '权限不足：请给 Key 勾选「搜索」API 权限',
  10011: '请求时段内配额超限',
  10044: '日调用量超配额'
}

/**
 * 百度地点检索：拉取一个城市「所有」养生类门店
 * @returns 统一门店数组 [{id,name,city,addr,phone,lng,lat,cat,hours}]
 */
export async function searchBaiduCity(key, city, opts = {}) {
  const keywords = opts.keywords || POI_KEYWORDS
  const out = []
  const seen = new Set()
  let firstErr = null

  for (let k = 0; k < keywords.length; k++) {
    const kw = keywords[k]
    let pageNum = 0
    try {
      // 百度对每个「关键词+区域」最多返回 400 条（20 页 × 20 条）
      while (pageNum < 20) {
        const url =
          'https://api.map.baidu.com/place/v2/search' +
          '?query=' + encodeURIComponent(kw) +
          '&region=' + encodeURIComponent(city) +
          '&output=json&page_size=20&page_num=' + pageNum +
          '&scope=1&ak=' + encodeURIComponent(key)
        const data = await baiduFetch(url)
        if (data.status !== 0) {
          firstErr = new Error('百度接口：' + (BAIDU_ERR[data.status] || '错误码 ' + data.status + (data.message ? ' ' + data.message : '')))
          break
        }
        const list = data.results || []
        list.forEach((r) => {
          if (!r.name || !r.location) return
          const addr = r.address || r.area || '地址见地图标记'
          const dk = dedupeKey(r.name, addr)
          if (seen.has(dk)) return
          seen.add(dk)
          out.push({
            id: 'bd_' + (r.uid || seen.size),
            name: r.name,
            city: r.city || city,
            addr,
            phone: normTel(r.telephone),
            lng: r.location.lng,
            lat: r.location.lat,
            bd09: true,
            cat: kw,
            hours: '以门店公告为准',
            source: 'baidu'
          })
        })
        const total = Number(data.total || 0)
        if (!list.length || list.length < 20 || (pageNum + 1) * 20 >= total) break
        pageNum++
        await sleep(120) // 控制频率，避免触发 QPS 限制
      }
    } catch (e) {
      firstErr = e
      break
    }
    opts.onProgress && opts.onProgress(k + 1, keywords.length, out.length)
    if (firstErr) break
  }

  if (!out.length && firstErr) throw firstErr
  // BD-09 -> GCJ-02，与高德瓦片坐标系对齐
  return out.map((s) => {
    const g = bd09ToGcj02(s.lng, s.lat)
    const rest = { ...s, lng: g.lng, lat: g.lat }
    delete rest.bd09
    return rest
  })
}

/**
 * 高德搜索服务（Place API v3 文本搜索）：拉取一个城市「所有」养生类门店
 * @returns 统一门店数组（高德本身就是 GCJ-02 坐标，无需转换）
 */
export async function searchAmapCity(key, city, opts = {}) {
  const keywords = opts.keywords || POI_KEYWORDS
  const out = []
  const seen = new Set()
  let firstErr = null

  for (let k = 0; k < keywords.length; k++) {
    const kw = keywords[k]
    let page = 1
    try {
      // 高德文本搜索单页最多 25 条，最多取 40 页（1000 条/关键词/城市）
      while (page <= 40) {
        const url =
          'https://restapi.amap.com/v3/place/text' +
          '?keywords=' + encodeURIComponent(kw) +
          '&city=' + encodeURIComponent(city) +
          '&citylimit=true&offset=25&page=' + page +
          '&key=' + encodeURIComponent(key)
        const data = await jsonp(url)
        if (String(data.status) !== '1') {
          firstErr = new Error('高德接口：' + (AMAP_ERR[data.infocode] || data.info || '错误码 ' + data.infocode))
          break
        }
        const pois = data.pois || []
        pois.forEach((p) => {
          if (!p.name || !p.location) return
          const pair = String(p.location).split(',')
          const lng = Number(pair[0])
          const lat = Number(pair[1])
          if (isNaN(lng) || isNaN(lat)) return
          const addr = p.address && p.address !== '[]' ? p.address : (p.adname || '地址见地图标记')
          const dk = dedupeKey(p.name, addr)
          if (seen.has(dk)) return
          seen.add(dk)
          out.push({
            id: 'am_' + (p.id || seen.size),
            name: p.name,
            city: p.cityname || city,
            addr,
            phone: normTel(p.tel),
            lng,
            lat,
            cat: kw,
            hours: '以门店公告为准',
            source: 'amap'
          })
        })
        const count = Number(data.count || 0)
        if (!pois.length || page * 25 >= count) break
        page++
        await sleep(120)
      }
    } catch (e) {
      firstErr = e
      break
    }
    opts.onProgress && opts.onProgress(k + 1, keywords.length, out.length)
    if (firstErr) break
  }

  if (!out.length && firstErr) throw firstErr
  return out
}
