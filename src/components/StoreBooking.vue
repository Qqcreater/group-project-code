<template>
  <div class="module">
    <div class="module-head">
      <h2>📍 线下门店预约</h2>
      <p>
        已收录全国 <b>{{ allStores.length }}</b> 家真实门店：官方核验 <b>{{ builtinCount }}</b> 家 +
        百度/高德地图官方 POI <b>{{ liveStores.length }}</b> 家（名称/地址/坐标/电话均来自商户公开登记信息）。
        <span class="real-badge">✓ 真实门店</span>
      </p>
      <p class="src-note">
        地图使用高德真实瓦片（GCJ-02 坐标系），标记不偏移；未公开登记电话的门店标注「暂无门店电话」，可按地址到店咨询。
      </p>
    </div>

    <!-- 官方数据源接入面板 -->
    <div class="ds-panel">
      <div class="ds-head" @click="dsOpen = !dsOpen">
        <h3>🔌 官方数据源接入（拉取所有真实养生门店）</h3>
        <span class="ds-toggle">{{ dsOpen ? '收起 ▲' : '展开 ▼' }}</span>
      </div>

      <div v-show="dsOpen" class="ds-body">
        <p class="ds-why">
          要获取「所有」真实门店（含电话），需接入地图厂商官方 POI 数据接口，需要一把免费的 Key（约 2 分钟申请）。
          填入 Key 后即可把任意城市的养生门店<b>全部</b>拉取到本页：足疗 / 推拿 / 艾灸 / SPA / 汗蒸 / 采耳…14 组关键词一次搜全。
          <b>推荐用高德 Key（浏览器可直连）</b>；百度 Key 需配合本地代理（开发模式已内置）。
        </p>

        <div class="ds-row">
          <label class="ds-field">
            <span>数据源</span>
            <select v-model="apiCfg.provider">
              <option value="amap">高德地图 · 搜索服务（推荐·直连）</option>
              <option value="baidu">百度地图 · 地点检索（需代理）</option>
            </select>
          </label>
          <label class="ds-field">
            <span>城市</span>
            <input v-model.trim="apiCfg.city" placeholder="如：上海 / 成都 / 西安" />
          </label>
          <label class="ds-field grow">
            <span>API Key</span>
            <input
              v-model.trim="apiCfg.key"
              :type="showKey ? 'text' : 'password'"
              placeholder="粘贴免费申请的 Key / AK"
            />
          </label>
          <button class="ds-eye" @click="showKey = !showKey">{{ showKey ? '隐藏' : '显示' }}</button>
        </div>

        <div class="ds-cities">
          <span class="ds-lbl">快速选城：</span>
          <button
            v-for="c in presetCities"
            :key="c"
            class="ds-chip"
            :class="{ active: apiCfg.city === c }"
            @click="apiCfg.city = c"
          >
            {{ c }}
          </button>
        </div>

        <p class="ds-guide" v-if="apiCfg.provider === 'baidu'">
          📖 百度 Key 申请：打开 <a href="https://lbsyun.baidu.com/apiconsole/key" target="_blank" rel="noopener">lbsyun.baidu.com 控制台</a>
          → 创建应用 → 应用类型选「<b>服务端</b>」→ 勾选「<b>地点检索</b>」→ IP 白名单填
          <code>0.0.0.0/0</code> → 复制 AK 填入上面。注：百度接口官方未开放浏览器直连，
          本页会自动走 <code>/bapi</code> 本地代理（开发模式已配置；生产部署需用 nginx 配同样的代理）
        </p>
        <p class="ds-guide" v-else>
          📖 高德 Key 申请：打开 <a href="https://console.amap.com/dev/key/app" target="_blank" rel="noopener">console.amap.com</a>
          → 创建新应用 → 添加 Key，服务平台选「<b>Web服务</b>」→ 复制 Key 填入上面输入框
        </p>

        <div class="ds-run">
          <button
            class="btn primary"
            :disabled="apiRunning || !apiCfg.key || !apiCfg.city"
            @click="runFetch"
          >
            {{ apiRunning ? '⏳ 拉取中…（' + apiDoneKw + '/' + kwTotal + ' 组关键词）' : '🚀 拉取该城市全部门店' }}
          </button>
          <span v-if="apiRunning" class="ds-live">已找到 {{ liveCount }} 家…</span>
        </div>

        <p v-if="apiMsg" class="ds-msg" :class="{ err: apiErr }">{{ apiMsg }}</p>
        <p v-if="liveStores.length && !apiRunning" class="ds-msg ok">
          ✅ 已接入 {{ liveCities.join('、') }} 官方 POI 共 {{ liveStores.length }} 家真实门店，已全部上图并进入预约列表
        </p>
      </div>
    </div>

    <!-- 城市筛选（默认折叠只显示一行，避免挡住地图） -->
    <div class="city-bar">
      <button
        class="city-chip near"
        :class="{ active: city === '附近' }"
        @click="showNearby"
      >
        📍 附近<span v-if="myLoc" class="chip-num">{{ countOf('附近') }}</span>
      </button>
      <select v-if="city === '附近'" v-model.number="nearbyKm" class="nearby-km">
        <option :value="5">5km 内</option>
        <option :value="10">10km 内</option>
        <option :value="20">20km 内</option>
        <option :value="50">50km 内</option>
        <option :value="100">100km 内</option>
      </select>
      <button
        v-for="c in visibleCityChips"
        :key="c"
        class="city-chip"
        :class="{ active: city === c }"
        @click="switchCity(c)"
      >
        {{ c }}<span v-if="c !== '全部'" class="chip-num">{{ countOf(c) }}</span>
      </button>
      <button v-if="!cityExpanded" class="city-chip expand-btn" @click="cityExpanded = true">
        全部 {{ cities.length - 1 }} 城 ▼
      </button>
      <button v-else class="city-chip expand-btn" @click="cityExpanded = false">收起 ▲</button>
    </div>

    <!-- 真实地图 -->
    <div class="map-wrap" :class="{ fullscreen: mapFullscreen }">
      <div ref="mapEl" class="map" :class="{ picking: pickMode }"></div>

      <div class="map-tools">
        <button class="tool" :class="{ on: locating }" @click="locateMe()" :disabled="locating">
          <span class="ico">📡</span>{{ locating ? '定位中…' : '我的位置' }}
        </button>
        <button class="tool" :class="{ on: pickMode }" @click="pickMode = !pickMode">
          <span class="ico">📌</span>{{ pickMode ? '点击地图选点中…' : '手动选点' }}
        </button>
        <button class="tool" @click="fitAll"><span class="ico">🧭</span>全览</button>
        <button class="tool" @click="toggleLayer">
          <span class="ico">🗺️</span>{{ satellite ? '卫星图' : '标准图' }}
        </button>
      </div>

      <!-- 右下角：全屏/退出全屏 -->
      <button class="fullscreen-btn" @click="toggleFullscreen">
        {{ mapFullscreen ? '✕ 退出全屏' : '⛶ 全屏' }}
      </button>

      <div class="map-hint">
        <span v-if="pickMode" class="msg">📌 请在地图上点击您的实际位置，附近门店将按此点计算</span>
        <span v-else-if="locateMsg" class="msg">{{ locateMsg }}</span>
        <span v-else>可拖动 / 缩放地图，标记过多时会自动聚合，点击聚合圈可展开</span>
      </div>
    </div>

    <div class="layout">
      <!-- 门店列表 -->
      <div class="stores">
        <div class="list-bar">
          <input
            v-model.trim="q"
            class="search"
            placeholder="🔍 搜索门店名 / 地址 / 服务项目…"
            @keyup.enter="doSearch"
          />
          <button class="search-btn" @click="doSearch">搜索</button>
          <span class="list-count">共 {{ filteredStores.length }} 家</span>
        </div>

        <div
          v-for="(s, i) in visibleStores"
          :key="s.id"
          class="store"
          :class="{ active: selected && selected.id === s.id }"
          @click="selectStore(s)"
        >
          <div class="store-top">
            <h3><span class="no">{{ i + 1 }}</span>{{ s.name }}</h3>
            <span class="src-tag" :class="s.source ? 'api' : 'builtin'">
              {{ s.source === 'baidu' ? '百度POI' : s.source === 'amap' ? '高德POI' : '已核验' }}
            </span>
          </div>
          <p class="store-meta">
            <span class="city-tag">{{ s.city }}</span>
            <template v-if="s.rating"> ⭐ {{ s.rating }} </template>
            <template v-if="s.price"> · 💰 人均 ¥{{ s.price }} </template>
            · 🕐 {{ s.hours }}
          </p>
          <p class="store-addr">
            📍 {{ s.addr }}<template v-if="s.realDist != null"> · 距您 {{ s.realDist.toFixed(1) }}km</template>
          </p>
          <div class="store-tags">
            <span v-for="sv in s.services" :key="sv" class="mini-tag">{{ sv }}</span>
          </div>
          <div class="store-actions">
            <button class="mini-btn" @click.stop="navigate(s)">🧭 导航</button>
            <a v-if="isPhone(s.phone)" class="mini-btn" :href="'tel:' + telHref(s.phone)" @click.stop>📞 {{ s.phone }}</a>
            <span v-else class="mini-btn muted">📞 暂无门店电话</span>
          </div>
        </div>

        <button
          v-if="filteredStores.length > limit"
          class="btn more"
          @click="limit += 60"
        >
          加载更多（还有 {{ filteredStores.length - limit }} 家）</button>
        <p v-if="!filteredStores.length" class="none">当前筛选下没有门店，试试切换城市或清空搜索词</p>
      </div>

      <!-- 预约面板 -->
      <div class="booking" v-if="selected">
        <h3>预约「{{ selected.name }}」</h3>
        <p class="bk-addr">
          <span class="city-tag">{{ selected.city }}</span><br />
          📍 {{ selected.addr }}<br />
          🕐 {{ selected.hours }}<template v-if="isPhone(selected.phone)"> · ☎ {{ selected.phone }}</template>
        </p>
        <label class="field">
          <span>您的姓名</span>
          <input type="text" v-model.trim="form.name" placeholder="请输入姓名" />
        </label>
        <label class="field">
          <span>手机号</span>
          <input type="tel" v-model.trim="form.phone" maxlength="11" placeholder="11 位手机号，用于门店联系您" />
        </label>
        <label class="field">
          <span>选择服务</span>
          <select v-model="form.service">
            <option v-for="sv in selected.services" :key="sv" :value="sv">{{ sv }}</option>
          </select>
        </label>
        <label class="field">
          <span>预约日期</span>
          <input type="date" v-model="form.date" :min="today" />
        </label>
        <div class="field">
          <span>时间段</span>
          <div class="slots">
            <button
              v-for="t in selected.slots"
              :key="t"
              class="slot"
              :class="{ active: form.time === t }"
              @click="form.time = t"
            >
              {{ t }}
            </button>
          </div>
        </div>
        <button class="btn primary" :disabled="!canSubmit" @click="submit">提交预约</button>
        <p class="bk-tip">提交后生成预约码，请以门店电话最终确认为准</p>
      </div>
      <div class="booking empty" v-else>
        <p>← 请选择左侧门店开始预约</p>
      </div>
    </div>

    <!-- 我的预约 -->
    <div class="my-booking" v-if="myBookings.length">
      <h3>📋 我的预约</h3>
      <div class="bk-list">
        <div v-for="(b, i) in myBookings" :key="i" class="bk-item">
          <div>
            <strong>{{ b.store }}</strong>
            <span class="bk-code">{{ b.code }}</span>
            <div class="bk-sub">{{ b.name }} · {{ b.phone }}</div>
            <div class="bk-sub">{{ b.service }} · {{ b.date }} {{ b.time }}</div>
          </div>
          <button class="bk-cancel" @click="cancel(i)">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import L from 'leaflet'
import { markRaw } from 'vue'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { wgs84ToGcj02, haversineKm, bdMcToGcj02 } from '../utils/geo.js'
import { searchBaiduCity, searchAmapCity, POI_KEYWORDS } from '../services/poi.js'

// 高德真实瓦片（GCJ-02 坐标系统，与门店坐标一致，标记不偏移）
const AMAP_TILE = {
  road: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
  satellite: 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}'
}

const DEFAULT_SLOTS = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00']
const PRESET_CITIES = [
  '北京', '上海', '广州', '深圳', '成都', '杭州', '武汉', '重庆',
  '西安', '南京', '天津', '苏州', '长沙', '沈阳', '青岛', '郑州',
  '大连', '厦门', '福州', '哈尔滨', '昆明', '佛山', '东莞', '宁波', '济南', '合肥'
]

// 服务项目映射：把检索关键词翻译成预约可选服务
const CAT_SERVICES = {
  '养生': ['养生套餐', '经络调理'],
  '足疗': ['足疗', '足部护理'],
  '按摩': ['全身按摩', '局部放松'],
  '推拿': ['中医推拿', '正骨'],
  '艾灸': ['艾灸', '督灸'],
  'SPA': ['精油SPA', '香薰理疗'],
  '汗蒸': ['汗蒸', '盐蒸'],
  '采耳': ['采耳', '头疗'],
  '头疗': ['头疗', '肩颈放松'],
  '足道': ['足道', '足部按摩'],
  '洗浴': ['洗浴', '搓澡'],
  '经络': ['经络疏通', '经络调理'],
  '理疗': ['理疗', '推拿调理'],
  '中医养生': ['中医调理', '针灸理疗']
}

// 全国真实营业的养生门店（名称/地址/电话/营业时间来自公开地图及官方门店信息，坐标为 GCJ-02）
const STORES = [
  /* ============ 北京 ============ */
  {
    id: 1, city: '北京', name: '国艾堂·艾灸养生会馆（芍药居店）',
    addr: '朝阳区文学馆路芍药居北里315号1层315-2室', rating: 4.6, price: 388, hours: '08:30-21:30',
    phone: '010-84625129', lng: 116.43126, lat: 39.98483,
    services: ['艾灸', '督灸', '拔罐', '经络调理'], slots: ['09:00', '11:00', '13:30', '15:30', '17:30', '19:30']
  },
  {
    id: 2, city: '北京', name: '玄道古法中医推拿正骨养生馆',
    addr: '海淀区蓝靛厂西路11号翰林公馆二楼8221', rating: 4.8, price: 318, hours: '08:00-22:00',
    phone: '13701171907', lng: 116.278564, lat: 39.963403,
    services: ['中医推拿', '正骨', '经络理疗', '拔罐'], slots: ['09:00', '10:30', '13:00', '15:00', '17:00', '19:00', '20:30']
  },
  {
    id: 3, city: '北京', name: '御宸阁·非遗温氏指踵推拿养生店',
    addr: '朝阳区南新园中路106号底商', rating: 4.2, price: 318, hours: '09:00-18:30',
    phone: '18610887727', lng: 116.467474, lat: 39.869092,
    services: ['非遗推拿', '指压推拿', '足部保健'], slots: ['09:30', '11:00', '13:00', '14:30', '16:00', '17:30']
  },
  {
    id: 4, city: '北京', name: '津指康SPA养生会馆（SKP店）',
    addr: '朝阳区建国路89号华贸公寓5号楼底商1层106室', rating: 4.6, price: 287, hours: '11:00-01:00',
    phone: '13121318608', lng: 116.478942, lat: 39.911368,
    services: ['SPA按摩', '推拿', '足疗'], slots: ['12:00', '14:00', '16:00', '18:00', '20:00', '22:00']
  },
  {
    id: 5, city: '北京', name: '颐润堂专业养生（银领国际店）',
    addr: '朝阳区望京南湖西园银领国际123号楼一层', rating: 4.8, price: 219, hours: '10:00-01:00',
    phone: '010-64746618', lng: 116.45727, lat: 39.998357,
    services: ['足疗养生', '经络推拿', '艾灸'], slots: ['11:00', '13:00', '15:00', '17:00', '19:00', '21:00', '23:00']
  },
  {
    id: 6, city: '北京', name: '良子健身·禅境足道·闲庭养生SPA（万丰路店）',
    addr: '丰台区万丰路300号2号楼1层', rating: 4.6, price: 183, hours: '10:30-03:00',
    phone: '010-53322555', lng: 116.293871, lat: 39.869498,
    services: ['禅境足道', '养生SPA', '采耳'], slots: ['11:30', '13:30', '15:30', '17:30', '19:30', '21:30', '23:30']
  },
  {
    id: 7, city: '北京', name: '留指间玉养生馆（亚运村店）',
    addr: '朝阳区亚运村中国化工大厦南1门西50米', rating: 4.3, price: 217, hours: '10:00-21:00',
    phone: '010-84885126', lng: 116.411348, lat: 39.98905,
    services: ['推拿', '足疗', '养生SPA'], slots: ['10:30', '12:30', '14:30', '16:30', '18:30', '20:00']
  },
  {
    id: 8, city: '北京', name: '同仁堂医馆（新源南路店）',
    addr: '朝阳区新源南路1号平安国际金融中心一层底商', rating: null, price: null, hours: '08:30-21:00',
    phone: '010-84442787', lng: 116.4563, lat: 39.9465,
    services: ['中医问诊', '针灸理疗', '内科调理'], slots: ['09:00', '10:30', '13:30', '15:00', '16:30', '18:30']
  },
  /* ============ 上海 ============ */
  {
    id: 9, city: '上海', name: '胡庆余堂国药号（西藏中路店）',
    addr: '黄浦区西藏中路620号', rating: null, price: null, hours: '以门店公告为准',
    phone: '021-63223049', lng: 121.4772, lat: 31.2318,
    services: ['膏方养生', '中药饮片', '代客煎药'], slots: DEFAULT_SLOTS
  },
  {
    id: 10, city: '上海', name: '莱仪堂养生会馆（新闸店）',
    addr: '黄浦区新闸路443号2层', rating: null, price: null, hours: '以门店公告为准',
    phone: '021-63320082', lng: 121.4628, lat: 31.2407,
    services: ['艾灸', '经络调理', '体质调理'], slots: DEFAULT_SLOTS
  },
  {
    id: 11, city: '上海', name: '余天成堂（松江店）',
    addr: '松江区中山中路266-270号2楼', rating: null, price: null, hours: '08:00-20:00',
    phone: '021-57822261', lng: 121.2273, lat: 31.0319,
    services: ['膏方', '中药调理', '参茸滋补'], slots: ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00']
  },
  /* ============ 杭州 ============ */
  {
    id: 12, city: '杭州', name: '胡庆余堂国药号（庆余总店·大井巷）',
    addr: '上城区大井巷95号（清河坊历史街区）', rating: null, price: null, hours: '08:30-17:00',
    phone: '0571-87815209', lng: 120.1663, lat: 30.2426,
    services: ['坐堂中医', '膏方', '中药文化体验'], slots: ['09:00', '10:30', '13:30', '15:00', '16:00']
  },
  /* ============ 广州 ============ */
  {
    id: 13, city: '广州', name: '益身元经络养生馆（汇景新城店）',
    addr: '天河区汇景北路74号汇景新城B2层', rating: null, price: null, hours: '以门店公告为准',
    phone: '020-38980148', lng: 113.36778, lat: 23.149376,
    services: ['经络养生', '推拿', '艾灸'], slots: DEFAULT_SLOTS
  },
  /* ============ 深圳 ============ */
  {
    id: 14, city: '深圳', name: '郑远元·修脚·足道（民治店）',
    addr: '龙华区民治大道128号', rating: null, price: null, hours: '以门店公告为准',
    phone: '0755-28013856', lng: 114.042892, lat: 22.613758,
    services: ['修脚', '足部护理', '足道'], slots: DEFAULT_SLOTS
  },
  {
    id: 15, city: '深圳', name: '玉玄道康养馆（西乡店）',
    addr: '宝安区西乡街道香格丽湾园1-2栋1-103', rating: null, price: null, hours: '09:00-18:00',
    phone: '13539452159', lng: 113.8631, lat: 22.5803,
    services: ['磁疗调理', '艾灸', '经络疏通'], slots: ['09:30', '11:00', '13:00', '15:00', '17:00']
  },
  /* ============ 济南 ============ */
  {
    id: 16, city: '济南', name: '玉玄道康养馆（中央商务区店）',
    addr: '历下区垂杨路179号复星国际中心商业4号楼108', rating: null, price: null, hours: '08:00-21:00',
    phone: '15666664096', lng: 117.111, lat: 36.668,
    services: ['磁疗调理', '艾灸', '经络疏通'], slots: ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00']
  },
  /* ============ 合肥 ============ */
  {
    id: 17, city: '合肥', name: '玉玄道康养馆（名门首府店）',
    addr: '蜀山区集贤路98号名门首府B17栋102', rating: null, price: null, hours: '09:00-18:00',
    phone: '13865909750', lng: 117.258, lat: 31.82,
    services: ['磁疗调理', '艾灸', '经络疏通'], slots: ['09:30', '11:00', '13:00', '15:00', '17:00']
  },
  /* ============ 武汉 ============ */
  {
    id: 18, city: '武汉', name: '玉玄道康养馆（江汉北路店）',
    addr: '江岸区江汉北路14号', rating: null, price: null, hours: '09:00-18:00',
    phone: '13307117755', lng: 114.2793, lat: 30.5922,
    services: ['磁疗调理', '艾灸', '经络疏通'], slots: ['09:30', '11:00', '13:00', '15:00', '17:00']
  },
  /* ============ 长沙 ============ */
  {
    id: 19, city: '长沙', name: '玉玄道康养馆（梅溪湖店）',
    addr: '岳麓区近湖二路1号湖墅嘉园1-3栋101', rating: null, price: null, hours: '08:00-19:00',
    phone: '15073948998', lng: 112.871, lat: 28.216,
    services: ['磁疗调理', '艾灸', '经络疏通'], slots: ['09:00', '11:00', '13:00', '15:00', '17:00']
  },
  /* ============ 无锡 ============ */
  {
    id: 20, city: '无锡', name: '上医养生·王院长（耘林阅府店）',
    addr: '经开区贡湖大道207号耘林阅府L3-302', rating: null, price: null, hours: '以门店公告为准',
    phone: '18094290730', lng: 120.321, lat: 31.495,
    services: ['推拿调理', '经络养生', '艾灸'], slots: DEFAULT_SLOTS
  },
  /* ============ 哈尔滨 ============ */
  {
    id: 21, city: '哈尔滨', name: '态轻松养生连锁（群力旗舰店）',
    addr: '道里区群力家园C17号楼1号商服', rating: null, price: null, hours: '以门店公告为准',
    phone: '0451-57103333', lng: 126.581, lat: 45.737,
    services: ['推拿按摩', '足部反射', '经络调理'], slots: DEFAULT_SLOTS
  },
  /* ============ 沈阳 ============ */
  {
    id: 22, city: '沈阳', name: '暖山静舍（地王店）',
    addr: '沈河区文艺路建院街19号', rating: null, price: null, hours: '以门店公告为准',
    phone: '024-31954888', lng: 123.456, lat: 41.78,
    services: ['SPA', '推拿', '艾灸'], slots: DEFAULT_SLOTS
  }
]

const CFG_KEY = 'yyx_poi_config_v1'

function loadCfg() {
  try {
    const raw = localStorage.getItem(CFG_KEY)
    if (raw) return { provider: 'amap', key: '', city: '上海', ...JSON.parse(raw) }
  } catch (e) { /* ignore */ }
  return { provider: 'amap', key: '', city: '上海' }
}

export default {
  name: 'StoreBooking',
  data() {
    return {
      map: null,
      tileLayer: null,
      satellite: false,
      cluster: null,
      // markRaw 避免 Vue 把 Leaflet 标记包成响应式 Proxy，
      // 否则动画中 Proxy 标记的 _map 会被读成 null（_latLngToNewLayerPoint 报错）
      markerList: markRaw([]), // [{ store, marker }]
      meMarker: null,
      selected: null,
      locating: false,
      locateMsg: '',
      myLoc: null,
      city: '全部',
      q: '',
      searchQ: '',
      limit: 60,
      nearbyKm: 20,
      cityExpanded: false,
      pickMode: false,
      mapFullscreen: false,
      stores: STORES,
      // 官方数据源
      dsOpen: false,
      showKey: false,
      apiCfg: loadCfg(),
      presetCities: PRESET_CITIES,
      kwTotal: POI_KEYWORDS.length,
      apiRunning: false,
      apiDoneKw: 0,
      liveCount: 0,
      liveStores: [],
      apiMsg: '',
      apiErr: false,
      form: { name: '', phone: '', service: '', date: '', time: '' },
      myBookings: []
    }
  },
  computed: {
    builtinCount() {
      return this.stores.length
    },
    allStores() {
      return [...this.stores, ...this.liveStores]
    },
    liveCities() {
      return [...new Set(this.liveStores.map((s) => s.city))]
    },
    cities() {
      const set = []
      this.allStores.forEach((s) => {
        if (!set.includes(s.city)) set.push(s.city)
      })
      return ['全部', ...set]
    },
    visibleCityChips() {
      if (this.cityExpanded) return this.cities
      // 默认只显示"全部"和前面约 10 个城市，保证一行，按钮在末尾
      return this.cities.slice(0, 11)
    },
    filteredStores() {
      let list
      if (this.city === '附近') {
        list = this.myLoc
          ? this.allStores.filter((s) => s.realDist != null && s.realDist <= this.nearbyKm)
          : []
      } else {
        list = this.city === '全部' ? this.allStores : this.allStores.filter((s) => s.city === this.city)
      }
      if (this.searchQ) {
        // 分词搜索：多个关键词空格分隔，全部命中才显示（提高准确度）
        const words = this.searchQ.toLowerCase().split(/\s+/).filter(Boolean)
        list = list.filter((s) => {
          const hay = (
            s.name + ' ' + (s.addr || '') + ' ' + (s.city || '') + ' ' + (s.services || []).join(' ')
          ).toLowerCase()
          return words.every((w) => hay.includes(w))
        })
      }
      if (this.city === '附近') list = [...list].sort((a, b) => a.realDist - b.realDist)
      return list
    },
    visibleStores() {
      return this.filteredStores.slice(0, this.limit)
    },
    canSubmit() {
      return (
        this.form.name &&
        /^1\d{10}$/.test(this.form.phone) &&
        this.form.service &&
        this.form.date &&
        this.form.time
      )
    },
    today() {
      return new Date().toISOString().slice(0, 10)
    }
  },
  watch: {
    apiCfg: {
      handler(v) {
        try { localStorage.setItem(CFG_KEY, JSON.stringify(v)) } catch (e) { /* ignore */ }
      },
      deep: true
    },
    city() {
      this.limit = 60
      this.updateMarkers()
      this.fitAll()
    },
    searchQ() {
      this.limit = 60
      this.updateMarkers()
    },
    nearbyKm() {
      this.limit = 60
      this.updateMarkers()
      this.fitAll()
    },
    liveStores() {
      this.updateMarkers()
    }
  },
  mounted() {
    this.initMap()
    this.loadFileStores()
    window.addEventListener('resize', this.onResize)
  },
  activated() {
    // keep-alive 切换回来后需要重新计算地图尺寸
    this.$nextTick(() => this.map && this.map.invalidateSize())
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.onResize)
    if (this.map) {
      this.map.stop() // 取消进行中的缩放/平移动画，避免卸载后动画回调读到已销毁的地图
      this.map.remove()
      this.map = null
    }
  },
  methods: {
    /* ---------------- 地图 ---------------- */
    initMap() {
      // markRaw：阻止 Vue 把 Leaflet 实例包成响应式 Proxy，
      // 否则热重载/动画时 Leaflet 内部状态会被响应式劫持读成 null（_latLngToNewLayerPoint 报错）
      const map = markRaw(
        L.map(this.$refs.mapEl, {
          center: [34.5, 108.5],
          zoom: 5,
          zoomControl: true,
          attributionControl: false
        })
      )
      this.map = map

      this.tileLayer = markRaw(
        L.tileLayer(AMAP_TILE.road, {
          subdomains: ['1', '2', '3', '4'],
          maxZoom: 18,
          minZoom: 3
        }).addTo(map)
      )

      // 海量标记聚合层：全国视图下自动聚合成数量圈，放大后展开为单个标记
      this.cluster = markRaw(
        L.markerClusterGroup({
          maxClusterRadius: 70,
          disableClusteringAtZoom: 15,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          chunkedLoading: true
        }).addTo(map)
      )

      L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map)

      // 手动选点：点击地图任意位置设为"我的位置"
      map.on('click', (e) => {
        if (!this.pickMode) return
        this.pickMode = false
        this.setMyLoc({ lng: e.latlng.lng, lat: e.latlng.lat }, '已按您点击的位置设定')
      })

      map.whenReady(() => {
        this.updateMarkers()
        this.fitAll()
      })

      setTimeout(() => map.invalidateSize(), 300)
    },

    makeIcon(label, active) {
      return L.divIcon({
        className: 'store-marker',
        html: `<div class="pin${active ? ' active' : ''}">${label}</div>`,
        iconSize: [26, 34],
        iconAnchor: [13, 33],
        popupAnchor: [0, -32]
      })
    },

    updateMarkers() {
      if (!this.map || !this.cluster) return
      // 缩放动画进行中清空聚合层会导致标记的 _map 变成 null，等动画结束后再重建
      if (this.map._animatingZoom) {
        if (!this._pendingMarkerUpdate) {
          this._pendingMarkerUpdate = true
          this.map.once('zoomend', () => {
            this._pendingMarkerUpdate = false
            this.updateMarkers()
          })
        }
        return
      }
      try { this.map.stop() } catch (e) { /* ignore */ } // 停掉进行中的缩放动画再清图层
      this.cluster.clearLayers()
      this.markerList = markRaw([])
      this.filteredStores.forEach((s, i) => {
        // 个别门店暂无公开坐标：保留在列表中，不上图
        if (!isFinite(s.lat) || !isFinite(s.lng)) return
        const marker = L.marker([s.lat, s.lng], {
          icon: this.makeIcon(i + 1, this.selected && this.selected.id === s.id)
        })
          .bindPopup(this.popupHtml(s), { closeButton: true })
          .on('click', () => this.selectStore(s))
        this.cluster.addLayer(marker)
        this.markerList.push({ store: s, marker })
      })
    },

    popupHtml(s) {
      const price = s.price ? `人均 ¥${s.price}` : '价格电询'
      const rating = s.rating ? `⭐ ${s.rating} · ` : ''
      const src = s.source === 'baidu' ? '百度官方POI' : s.source === 'amap' ? '高德官方POI' : '已核验门店'
      const tel = this.isPhone(s.phone) ? `☎ ${s.phone}<br/>` : '☎ 暂无门店电话<br/>'
      return `<div class="mp-pop">
        <strong>${s.name}</strong>
        <div class="mp-row">${rating}${price} · 🕐 ${s.hours}<br/>📍 ${s.addr}<br/>${tel}<span class="mp-src">数据来源：${src}</span></div>
        <a class="mp-nav" href="${this.navUrl(s)}" target="_blank" rel="noopener">🧭 高德地图导航</a>
      </div>`
    },

    navUrl(s) {
      const name = encodeURIComponent(s.name)
      return `https://uri.amap.com/marker?position=${s.lng},${s.lat}&name=${name}&src=yiyangxuan&coordinate=gaode&callnative=1`
    },

    telHref(phone) {
      return String(phone).replace(/[^\d+]/g, '')
    },

    isPhone(p) {
      // 座机（可带区号/横杠）、11 位手机号、400 电话均视为可拨打
      return !!p && /^(?:0\d{2,3}-?)?\d{7,8}$|^1\d{10}$|^400-?\d{3}-?\d{4}$/.test(String(p).trim())
    },

    /* ---------------- 离线门店数据（高德官方 POI 批量预拉取） ---------------- */
    async loadFileStores() {
      try {
        const r = await fetch(process.env.BASE_URL + 'data/stores.json')
        if (!r.ok) return
        const list = await r.json()
        if (!Array.isArray(list) || !list.length) return
        // 与已有门店去重：电话相同 或 名称+地址相同 视为同一家
        const keys = new Set(
          this.allStores.map((s) => String(s.name).replace(/\s/g, '') + '|' + String(s.addr || '').replace(/\s/g, ''))
        )
        const phones = new Set(this.allStores.map((s) => String(s.phone || '')).filter(Boolean))
        const out = []
        list.forEach((s, i) => {
          const k = String(s.name).replace(/\s/g, '') + '|' + String(s.addr || '').replace(/\s/g, '')
          if (keys.has(k)) return
          if (s.phone && phones.has(String(s.phone))) return
          keys.add(k)
          if (s.phone) phones.add(String(s.phone))
          out.push({
            id: 'f' + i,
            name: s.name,
            city: s.city,
            addr: s.addr || '地址见地图标记',
            phone: s.phone || '',
            rating: null,
            price: null,
            hours: '以门店公告为准',
            lng: s.lng,
            lat: s.lat,
            services: CAT_SERVICES[s.cat] || ['养生调理'],
            slots: DEFAULT_SLOTS,
            source: s.source || 'amap'
          })
        })
        this.liveStores = this.liveStores.concat(out)
      } catch (e) { /* 数据文件不存在时仅显示内置门店 */ }
    },

    /* ---------------- 官方数据源拉取 ---------------- */
    async runFetch() {
      const { provider, key, city } = this.apiCfg
      if (!key || !city) {
        this.apiErr = true
        this.apiMsg = '请先填写 API Key 和要拉取的城市'
        return
      }
      this.apiRunning = true
      this.apiErr = false
      this.apiMsg = ''
      this.apiDoneKw = 0
      this.liveCount = 0

      const onProgress = (done, total, found) => {
        this.apiDoneKw = done
        this.liveCount = found
      }

      try {
        const fn = provider === 'baidu' ? searchBaiduCity : searchAmapCity
        const list = await fn(key, city, { onProgress })

        // 与已有门店（内置 + 之前拉取的）合并去重
        const exist = new Set(
          this.allStores.map((s) => String(s.name).replace(/\s/g, '') + '|' + String(s.addr || '').replace(/\s/g, ''))
        )
        let added = 0
        list.forEach((s) => {
          const k = String(s.name).replace(/\s/g, '') + '|' + String(s.addr || '').replace(/\s/g, '')
          if (exist.has(k)) return
          exist.add(k)
          s.rating = null
          s.price = null
          s.services = CAT_SERVICES[s.cat] || ['养生调理']
          s.slots = DEFAULT_SLOTS
          s.realDist = this.myLoc ? haversineKm(this.myLoc, { lng: s.lng, lat: s.lat }) : null
          this.liveStores.push(s)
          added++
        })

        if (!added && !this.liveStores.length) {
          this.apiErr = true
          this.apiMsg = '接口调用成功，但未返回门店数据，请检查 Key 权限（需开启地点检索/搜索服务）与城市名'
        } else {
          this.apiMsg = `拉取完成：新增 ${added} 家「${city}」真实门店`
          this.$nextTick(() => {
            this.updateMarkers()
            this.city = city
            this.fitAll()
          })
        }
      } catch (e) {
        this.apiErr = true
        this.apiMsg = '拉取失败：' + (e && e.message ? e.message : String(e))
      }
      this.apiRunning = false
    },

    /* ---------------- 交互 ---------------- */
    switchCity(c) {
      this.city = c
      if (this.selected && c !== '全部' && c !== '附近' && this.selected.city !== c) {
        this.selected = null
      }
    },

    // 点击搜索按钮：把输入词提交为搜索条件
    doSearch() {
      this.searchQ = this.q.trim()
      this.$nextTick(() => this.updateMarkers())
    },

    countOf(c) {
      if (c === '附近') {
        return this.myLoc
          ? this.allStores.filter((s) => s.realDist != null && s.realDist <= this.nearbyKm).length
          : 0
      }
      return this.allStores.filter((s) => s.city === c).length
    },

    showNearby() {
      if (!this.myLoc) {
        this.locateMe()
        return
      }
      this.city = '附近'
    },

    selectStore(s) {
      this.selected = s
      this.form = { name: this.form.name, phone: this.form.phone, service: s.services[0], date: '', time: '' }
      this.markerList.forEach(({ store, marker }) => {
        const label = this.filteredStores.indexOf(store) + 1
        marker.setIcon(this.makeIcon(label || '•', store.id === s.id))
      })
      if (this.map) {
        const hit = this.markerList.find((m) => m.store.id === s.id)
        this.map.flyTo([s.lat, s.lng], Math.max(this.map.getZoom(), 15), { duration: 0.6 })
        if (hit) {
          // 等飞行动画结束后再展开聚合圈并弹窗，避免与缩放动画并发
          this.map.once('moveend', () => {
            if (!this.map) return
            this.cluster.zoomToShowLayer(hit.marker, () => hit.marker.openPopup())
          })
        }
      }
    },

    fitAll() {
      if (!this.map) return
      try {
        const list = this.filteredStores.filter((s) => isFinite(s.lat) && isFinite(s.lng))
        if (!list.length) return
        // animate:false —— 缩放动画与 clearLayers 并发是 _latLngToNewLayerPoint 报错的根源
        if (list.length === 1) {
          this.map.setView([list[0].lat, list[0].lng], 14, { animate: false })
          return
        }
        const bounds = L.latLngBounds(list.map((s) => [s.lat, s.lng]))
        if (this.myLoc) bounds.extend([this.myLoc.lat, this.myLoc.lng])
        this.map.fitBounds(bounds, { padding: [50, 50], animate: false })
      } catch (e) { /* 地图尚未就绪时忽略本次自适应 */ }
    },

    toggleLayer() {
      this.satellite = !this.satellite
      this.tileLayer.setUrl(this.satellite ? AMAP_TILE.satellite : AMAP_TILE.road)
    },

    // 地图全屏切换：用 CSS 放大 map-wrap，再通知 Leaflet 重算尺寸
    toggleFullscreen() {
      this.mapFullscreen = !this.mapFullscreen
      this.$nextTick(() => {
        if (this.map) {
          this.map.invalidateSize()
          this.fitAll()
        }
      })
      // 防止全屏时页面背景透出
      document.body.style.overflow = this.mapFullscreen ? 'hidden' : ''
    },

    locateMe() {
      this.locating = true
      this.locateMsg = '正在通过百度地图定位…'
      this.baiduIpLocate().catch(() => this.browserLocate())
    },

    // 百度地图网页版 IP 定位（qt=cur，支持 JSONP 无需 Key，与百度地图同源）
    baiduIpLocate() {
      return new Promise((resolve, reject) => {
        const cb = '__yyx_bdloc_' + Date.now().toString(36)
        const script = document.createElement('script')
        let done = false
        const cleanup = () => {
          try { delete window[cb] } catch (e) { window[cb] = undefined }
          if (script.parentNode) script.parentNode.removeChild(script)
        }
        const timer = setTimeout(() => {
          if (!done) { done = true; cleanup(); reject(new Error('百度定位超时')) }
        }, 6000)
        window[cb] = (data) => {
          if (done) return
          done = true
          clearTimeout(timer)
          cleanup()
          try {
            const geo = data && data.current_city && data.current_city.geo
            if (!geo) { reject(new Error('百度定位无结果')); return }
            // geo 格式: "1|x,y;x,y|x,y;"，x/y 是百度墨卡托坐标
            const m = String(geo).match(/\|(-?[\d.]+),(-?[\d.]+)/)
            if (!m) { reject(new Error('百度定位坐标解析失败')); return }
            const gcj = bdMcToGcj02(Number(m[1]), Number(m[2]))
            this.locating = false
            this.setMyLoc(gcj, '已用百度地图定位到「' + (data.current_city.name || '当前位置') + '」')
            resolve()
          } catch (e) {
            reject(e)
          }
        }
        script.onerror = () => {
          if (!done) { done = true; clearTimeout(timer); cleanup(); reject(new Error('百度定位请求失败')) }
        }
        script.src = 'https://map.baidu.com/?newmap=1&qt=cur&callback=' + cb
        document.head.appendChild(script)
      })
    },

    // 浏览器原生定位兜底（GPS 或 IP 定位）
    browserLocate() {
      if (!navigator.geolocation) {
        this.locating = false
        this.locateMsg = '当前浏览器不支持定位，可点「手动选点」在地图上选位置'
        return
      }
      this.locateMsg = '百度定位不可用，正在获取您的位置…'
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.locating = false
          const gcj = wgs84ToGcj02(pos.coords.longitude, pos.coords.latitude)
          this.setMyLoc(gcj, `已定位（精度约 ${Math.round(pos.coords.accuracy)} 米）`)
        },
        (err) => {
          this.locating = false
          this.locateMsg = '定位失败：' + (err && err.message ? err.message : '请检查浏览器定位权限') + '，可点「手动选点」在地图上选位置'
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      )
    },

    // 设置"我的位置"并切到附近模式（手动选点 / 点击"附近"时使用）
    setMyLoc(gcj, msg) {
      this.myLoc = gcj
      this.renderMyLocation(gcj)
      this.allStores.forEach((s) => {
        s.realDist = haversineKm(gcj, { lng: s.lng, lat: s.lat })
      })
      this.city = '附近'
      this.locateMsg = msg + `，显示 ${this.nearbyKm}km 内共 ${this.countOf('附近')} 家门店`
      this.map.flyTo([gcj.lat, gcj.lng], 13, { duration: 0.6 })
    },

    renderMyLocation(p) {
      const icon = L.divIcon({
        className: 'me-marker',
        html: '<div class="dot"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      })
      if (this.meMarker) {
        this.meMarker.setLatLng([p.lat, p.lng]).setIcon(icon)
      } else {
        this.meMarker = markRaw(
          L.marker([p.lat, p.lng], { icon, zIndexOffset: 1000 })
            .addTo(this.map)
            .bindPopup('<div class="mp-pop"><strong>我的位置</strong></div>')
        )
      }
    },

    navigate(s) {
      window.open(this.navUrl(s), '_blank', 'noopener')
    },

    onResize() {
      this.map && this.map.invalidateSize()
    },

    /* ---------------- 预约 ---------------- */
    makeCode() {
      return 'YYX' + Date.now().toString(36).toUpperCase().slice(-6)
    },

    submit() {
      this.myBookings.unshift({
        code: this.makeCode(),
        store: this.selected.name,
        city: this.selected.city,
        service: this.form.service,
        date: this.form.date,
        time: this.form.time,
        name: this.form.name,
        phone: this.form.phone
      })
      this.locateMsg = ''
      alert('预约已提交！预约码 ' + this.myBookings[0].code + '，请致电门店确认：' + (this.isPhone(this.selected.phone) ? this.selected.phone : '暂无门店电话（可按地址到店咨询）'))
      this.form.time = ''
    },
    cancel(i) {
      this.myBookings.splice(i, 1)
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
  margin: 0 0 4px;
  color: #7a8a82;
  font-size: 14px;
}
.module-head b {
  color: #2f5d50;
}
.module-head .src-note {
  margin: 0 0 14px;
  font-size: 12px;
  color: #aab6b0;
}
.real-badge {
  display: inline-block;
  background: #e8f5ec;
  color: #2f9e57;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 6px;
  vertical-align: middle;
}

/* ===== 官方数据源面板 ===== */
.ds-panel {
  background: linear-gradient(135deg, #f0f7f2, #fff);
  border: 1px solid #d5e6db;
  border-radius: 14px;
  margin-bottom: 18px;
  overflow: hidden;
}
.ds-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  cursor: pointer;
  user-select: none;
}
.ds-head h3 {
  margin: 0;
  font-size: 15px;
  color: #2f5d50;
}
.ds-toggle {
  font-size: 12px;
  color: #7a8a82;
}
.ds-body {
  padding: 0 18px 18px;
}
.ds-why {
  font-size: 13px;
  color: #5a6b62;
  line-height: 1.8;
  margin: 0 0 14px;
  background: #fff;
  border-radius: 10px;
  padding: 12px 14px;
  border: 1px dashed #cfe4d6;
}
.ds-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  flex-wrap: wrap;
}
.ds-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #5a6b62;
}
.ds-field.grow {
  flex: 1;
  min-width: 220px;
}
.ds-field select,
.ds-field input {
  padding: 9px 12px;
  border: 1px solid #dce5e0;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  background: #fff;
}
.ds-field input:focus,
.ds-field select:focus {
  border-color: #7fc8a9;
}
.ds-eye {
  border: 1px solid #d8e3dd;
  background: #fff;
  color: #5a6b62;
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 12px;
  cursor: pointer;
  height: 36px;
}
.ds-cities {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.ds-lbl {
  font-size: 12px;
  color: #8a9b93;
}
.ds-chip {
  border: 1px solid #dbe6df;
  background: #fff;
  color: #5a6b62;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 14px;
  cursor: pointer;
}
.ds-chip:hover {
  border-color: #7fc8a9;
  color: #2f5d50;
}
.ds-chip.active {
  background: #2f5d50;
  color: #fff;
  border-color: #2f5d50;
}
.ds-guide {
  margin: 12px 0;
  font-size: 12px;
  color: #6b7d74;
  line-height: 1.8;
  background: #fff;
  border-radius: 10px;
  padding: 10px 14px;
  border: 1px solid #e4eee8;
}
.ds-guide a {
  color: #2f8f66;
}
.ds-guide code {
  background: #eef6f1;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
}
.ds-run {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.ds-run .btn {
  width: auto;
  padding: 11px 26px;
}
.ds-live {
  font-size: 13px;
  color: #b9770e;
  font-weight: 600;
}
.ds-msg {
  margin: 12px 0 0;
  font-size: 13px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #eef6f1;
  color: #2f5d50;
  line-height: 1.7;
}
.ds-msg.ok {
  background: #e8f5ec;
  color: #1e7e46;
}
.ds-msg.err {
  background: #fdeeee;
  color: #b03a2e;
}

/* ===== 城市筛选 ===== */
.city-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  align-items: center;
}
.city-bar .expand-btn {
  background: #f0f7f3;
  border-color: #7fc8a9;
  color: #2f5d50;
  font-weight: 600;
  white-space: nowrap;
}
.city-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid #dbe6df;
  background: #fff;
  color: #5a6b62;
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.15s;
}
.city-chip:hover {
  border-color: #7fc8a9;
  color: #2f5d50;
}
.city-chip.active {
  background: #2f5d50;
  color: #fff;
  border-color: #2f5d50;
}
.chip-num {
  font-size: 11px;
  opacity: 0.75;
}
.city-chip.near {
  border-color: #7fc8a9;
  color: #2f5d50;
  font-weight: 600;
}
.city-chip.near.active {
  background: #e07a5f;
  border-color: #e07a5f;
  color: #fff;
}
.nearby-km {
  border: 1px solid #dbe6df;
  border-radius: 18px;
  padding: 5px 10px;
  font-size: 12px;
  color: #2f5d50;
  background: #fff;
  outline: none;
  cursor: pointer;
}

/* ===== 地图 ===== */
.map.picking {
  cursor: crosshair !important;
}
.map-wrap {
  position: relative;
  height: 420px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 26px rgba(47, 93, 80, 0.12);
  margin-bottom: 20px;
  background: #eef2ee;
}
/* 全屏模式：固定定位占满整个视口 */
.map-wrap.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  border-radius: 0;
  margin-bottom: 0;
  box-shadow: none;
}
.map {
  width: 100%;
  height: 100%;
  z-index: 1;
}
/* 右下角全屏按钮 */
.fullscreen-btn {
  position: absolute;
  bottom: 36px;
  right: 12px;
  z-index: 500;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #dbe6df;
  border-radius: 10px;
  color: #2f5d50;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(47, 93, 80, 0.15);
  transition: all 0.15s;
}
.fullscreen-btn:hover {
  background: #2f5d50;
  color: #fff;
}
.map-wrap.fullscreen .fullscreen-btn {
  background: #e07a5f;
  border-color: #e07a5f;
  color: #fff;
}
.map-tools {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 500;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tool {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #dbe6df;
  color: #2f5d50;
  font-size: 13px;
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(47, 93, 80, 0.12);
  white-space: nowrap;
  transition: all 0.15s;
}
.tool:hover {
  background: #fff;
  border-color: #7fc8a9;
}
.tool.on {
  background: #2f5d50;
  color: #fff;
  border-color: #2f5d50;
}
.tool:disabled {
  opacity: 0.7;
  cursor: default;
}
.tool .ico {
  font-size: 14px;
}
.map-hint {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 500;
  background: rgba(255, 255, 255, 0.92);
  color: #6b7d74;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 20px;
  box-shadow: 0 3px 10px rgba(47, 93, 80, 0.1);
  max-width: 70%;
}
.map-hint .msg {
  color: #2f5d50;
  font-weight: 600;
}

/* ===== 布局 ===== */
.layout {
  display: grid;
  grid-template-columns: 1fr 330px;
  gap: 18px;
}
@media (max-width: 760px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
.stores {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.list-bar {
  display: flex;
  gap: 10px;
  align-items: center;
}
.list-bar .search {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #dce5e0;
  border-radius: 10px;
  font-size: 13px;
  outline: none;
}
.list-bar .search:focus {
  border-color: #7fc8a9;
}
.search-btn {
  padding: 10px 18px;
  border: 1px solid #2f5d50;
  border-radius: 10px;
  background: #2f5d50;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.search-btn:hover {
  background: #254a3f;
}
.list-count {
  font-size: 12px;
  color: #8a9b93;
  white-space: nowrap;
}
.store {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  border: 2px solid transparent;
  box-shadow: 0 4px 18px rgba(47, 93, 80, 0.06);
  transition: border-color 0.15s, transform 0.15s;
}
.store:hover {
  border-color: #cfe8db;
}
.store.active {
  border-color: #7fc8a9;
  transform: translateY(-1px);
}
.store-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.store-top h3 {
  margin: 0;
  font-size: 15px;
  color: #2f5d50;
  display: flex;
  align-items: center;
  gap: 8px;
}
.store-top h3 .no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #2f5d50;
  color: #fff;
  font-size: 12px;
  flex-shrink: 0;
}
.store.active .store-top h3 .no {
  background: #e6a23c;
}
.src-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
  flex-shrink: 0;
}
.src-tag.builtin {
  background: #e8f5ec;
  color: #2f9e57;
}
.src-tag.api {
  background: #e8f0fb;
  color: #2b6cb0;
}
.store-meta {
  font-size: 13px;
  color: #5a6b62;
  margin: 6px 0 2px;
}
.city-tag {
  display: inline-block;
  background: #eef6f1;
  color: #2f5d50;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 6px;
  margin-right: 4px;
}
.store-addr {
  font-size: 13px;
  color: #8a9b93;
  margin: 4px 0;
}
.store-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.mini-tag {
  background: #eef6f1;
  color: #2f5d50;
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 10px;
}
.store-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.mini-btn {
  flex: 1;
  text-align: center;
  text-decoration: none;
  border: 1px solid #d8e3dd;
  background: #f7fbf8;
  color: #2f5d50;
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 13px;
  cursor: pointer;
}
.mini-btn:hover {
  background: #eef6f1;
  border-color: #7fc8a9;
}
.mini-btn.muted {
  background: #f3f6f4;
  color: #aab6b0;
  cursor: default;
}
.btn.more {
  background: #fff;
  color: #2f5d50;
  border: 1px solid #cfe4d6;
  margin-top: 4px;
}
.btn.more:hover {
  background: #eef6f1;
}
.none {
  text-align: center;
  color: #aab6b0;
  font-size: 13px;
  padding: 30px 0;
}

/* ===== 预约面板 ===== */
.booking {
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 4px 18px rgba(47, 93, 80, 0.06);
  align-self: start;
  position: sticky;
  top: 0;
}
.booking.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aab6b0;
  font-size: 14px;
  position: static;
}
.booking h3 {
  margin: 0 0 6px;
  color: #2f5d50;
  font-size: 15px;
}
.bk-addr {
  margin: 0 0 16px;
  font-size: 12px;
  color: #8a9b93;
  line-height: 1.7;
}
.field {
  display: block;
  margin-bottom: 12px;
}
.field > span {
  display: block;
  font-size: 13px;
  color: #5a6b62;
  margin-bottom: 6px;
}
.field select,
.field input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #dce5e0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background: #fff;
  box-sizing: border-box;
}
.slots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.slot {
  padding: 7px 12px;
  border: 1px solid #d8e3dd;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #5a6b62;
}
.slot.active {
  background: #2f5d50;
  color: #fff;
  border-color: #2f5d50;
}
.btn {
  width: 100%;
  padding: 11px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
}
.btn.primary {
  background: #2f5d50;
  color: #fff;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.bk-tip {
  margin: 10px 0 0;
  font-size: 12px;
  color: #aab6b0;
  text-align: center;
}

/* ===== 我的预约 ===== */
.my-booking {
  margin-top: 24px;
}
.my-booking h3 {
  color: #2f5d50;
  margin: 0 0 12px;
}
.bk-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.bk-item {
  background: #fff;
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 18px rgba(47, 93, 80, 0.06);
}
.bk-code {
  display: inline-block;
  background: #e8f5ec;
  color: #2f9e57;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 6px;
  margin-left: 8px;
}
.bk-sub {
  font-size: 12px;
  color: #8a9b93;
  margin-top: 4px;
}
.bk-cancel {
  border: 1px solid #e0a3a3;
  background: #fff;
  color: #c0392b;
  border-radius: 8px;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 13px;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .map-wrap {
    height: 300px;
  }
  .store {
    padding: 14px;
  }
  .booking {
    padding: 16px 14px;
    position: static;
  }
  .bk-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>

<!-- 地图标记 / 弹窗 / 聚合：由 JS 动态注入，需非 scoped 样式 -->
<style>
.store-marker {
  background: transparent;
  border: none;
}
.store-marker .pin {
  position: relative;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #2f5d50;
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2.5px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  transition: transform 0.15s;
}
.store-marker .pin::after {
  content: '';
  position: absolute;
  bottom: -7px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 8px solid #2f5d50;
}
.store-marker .pin.active {
  background: #e6a23c;
  transform: scale(1.2);
  z-index: 5;
}
.store-marker .pin.active::after {
  border-top-color: #e6a23c;
}

.me-marker {
  background: transparent;
  border: none;
}
.me-marker .dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #1a73e8;
  border: 3px solid #fff;
  box-shadow: 0 0 0 4px rgba(26, 115, 232, 0.25);
  animation: mePulse 1.8s infinite;
}
@keyframes mePulse {
  0% {
    box-shadow: 0 0 0 4px rgba(26, 115, 232, 0.35);
  }
  70% {
    box-shadow: 0 0 0 14px rgba(26, 115, 232, 0);
  }
  100% {
    box-shadow: 0 0 0 4px rgba(26, 115, 232, 0);
  }
}

.leaflet-popup-content-wrapper {
  border-radius: 12px;
  box-shadow: 0 8px 26px rgba(47, 93, 80, 0.2);
}
.leaflet-popup-content {
  margin: 12px 14px;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.mp-pop strong {
  color: #2f5d50;
  font-size: 14px;
}
.mp-pop .mp-row {
  color: #8a9b93;
  font-size: 12px;
  margin: 5px 0 9px;
  line-height: 1.7;
}
.mp-pop .mp-src {
  display: inline-block;
  font-size: 11px;
  background: #eef6f1;
  color: #5a6b62;
  padding: 1px 8px;
  border-radius: 6px;
}
.mp-pop .mp-nav {
  display: inline-block;
  background: #2f5d50;
  color: #fff;
  text-decoration: none;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 8px;
}
.mp-pop .mp-nav:hover {
  background: #234740;
}
.marker-cluster-small {
  background: rgba(47, 93, 80, 0.35);
}
.marker-cluster-small div {
  background: rgba(47, 93, 80, 0.85);
  color: #fff;
  font-weight: 600;
}
.marker-cluster-medium {
  background: rgba(47, 93, 80, 0.45);
}
.marker-cluster-medium div {
  background: rgba(47, 93, 80, 0.9);
  color: #fff;
  font-weight: 600;
}
.marker-cluster-large {
  background: rgba(230, 162, 60, 0.4);
}
.marker-cluster-large div {
  background: rgba(230, 162, 60, 0.9);
  color: #fff;
  font-weight: 600;
}
</style>
