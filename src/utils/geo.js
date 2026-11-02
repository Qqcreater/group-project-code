// 地理坐标工具：WGS84(GPS) <-> GCJ-02(火星坐标/高德) 转换 + 距离计算
// 浏览器 navigator.geolocation 返回的是 WGS84，而高德/腾讯地图使用 GCJ-02，
// 两者在国内相差约 300~700 米，必须转换后标记才不会偏移。

const PI = Math.PI
const A = 6378245.0 // 长半轴
const EE = 0.00669342162296594323 // 偏心率平方

export function outOfChina(lng, lat) {
  return !(lng > 72.004 && lng < 137.8347 && lat > 0.8293 && lat < 55.8271)
}

function transformLat(x, y) {
  let ret =
    -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0
  ret += ((160.0 * Math.sin((y / 12.0) * PI) + 320 * Math.sin((y * PI) / 30.0)) * 2.0) / 3.0
  return ret
}

function transformLng(x, y) {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0
  ret += ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) * 2.0) / 3.0
  return ret
}

// WGS84 -> GCJ-02
export function wgs84ToGcj02(lng, lat) {
  if (outOfChina(lng, lat)) return { lng, lat }
  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLng(lng - 105.0, lat - 35.0)
  const radLat = (lat / 180.0) * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI)
  dLng = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI)
  return { lng: lng + dLng, lat: lat + dLat }
}

// GCJ-02 -> WGS84（粗略反解，用于把门店坐标导给 GPS 设备）
export function gcj02ToWgs84(lng, lat) {
  const g = wgs84ToGcj02(lng, lat)
  return { lng: lng * 2 - g.lng, lat: lat * 2 - g.lat }
}

// BD-09(百度) <-> GCJ-02(高德/火星) 互转
// 百度地点检索 API 返回的是 BD-09 坐标，直接放到高德瓦片上会偏移，
// 必须先转成 GCJ-02。
const X_PI = (Math.PI * 3000.0) / 180.0

// GCJ-02 -> BD-09
export function gcj02ToBd09(lng, lat) {
  const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * X_PI)
  const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * X_PI)
  return { lng: z * Math.cos(theta) + 0.0065, lat: z * Math.sin(theta) + 0.006 }
}

// BD-09 -> GCJ-02
export function bd09ToGcj02(lng, lat) {
  const x = lng - 0.0065
  const y = lat - 0.006
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI)
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI)
  return { lng: z * Math.cos(theta), lat: z * Math.sin(theta) }
}

// 两点球面距离（公里）
export function haversineKm(a, b) {
  const R = 6371.0088
  const dLat = ((b.lat - a.lat) * PI) / 180
  const dLng = ((b.lng - a.lng) * PI) / 180
  const la1 = (a.lat * PI) / 180
  const la2 = (b.lat * PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// 百度墨卡托(BD-09 MC) -> BD-09 经纬度
// 百度地图网页版接口（如 qt=cur）返回的是墨卡托坐标，需先转成经纬度
const MCBAND = [12890594.86, 8362377.87, 5591021, 3481989.83, 1678043.12, 0]
const MC2LL = [
  [1.410526172116255e-8, 0.00000898305509648872, -1.9939833816331, 200.9824383106796, -187.2403703815547, 91.6087516669843, -23.38765649603339, 2.57121317296198, -0.03801003308653, 17337981.2],
  [-7.435856389565537e-9, 0.000008983055097726239, -0.78625201886289, 96.32687599759846, -1.85204757529826, -59.36935905485877, 47.40033549296737, -16.50741931063887, 2.28786674699375, 10260144.86],
  [-3.030883460898826e-8, 0.00000898305509983578, 0.30071316287616, 59.74293618442277, 7.357984074871, -25.38371002664745, 13.45380521110908, -3.29883767235584, 0.32710905363475, 6856817.37],
  [-1.981981304930552e-8, 0.000008983055099779535, 0.03278182852591, 40.31678527705744, 0.65659298677277, -4.44255534477492, 0.85341911805263, 0.12923347998204, -0.04625736007561, 4482777.06],
  [3.09191371068437e-9, 0.000008983055096812155, 0.00006995724062, 23.10934304144901, -0.00023663490511, -0.6321817810242, -0.00663494467273, 0.03430082397953, -0.00466043876332, 2555164.4],
  [2.890871144776878e-9, 0.000008983055095805407, -3.068298e-8, 7.47137025468032, -3.53937994e-6, -0.02145144861037, -0.00001234426596, 0.00010322952773, -0.00000323890364, 826088.5]
]

function mcConvert(x, y, c) {
  let xT = c[0] + c[1] * Math.abs(x)
  const cc = Math.abs(y) / c[9]
  let yT = c[2] + c[3] * cc + c[4] * cc * cc + c[5] * cc ** 3 + c[6] * cc ** 4 + c[7] * cc ** 5 + c[8] * cc ** 6
  xT *= x < 0 ? -1 : 1
  yT *= y < 0 ? -1 : 1
  return { lng: xT, lat: yT }
}

export function bdMcToBd09(x, y) {
  const ay = Math.abs(y)
  for (let i = 0; i < MCBAND.length; i++) {
    if (ay >= MCBAND[i]) return mcConvert(x, y, MC2LL[i])
  }
  return mcConvert(x, y, MC2LL[MC2LL.length - 1])
}

// 百度墨卡托 -> GCJ-02（一步到位，给地图直接用）
export function bdMcToGcj02(x, y) {
  const bd = bdMcToBd09(x, y)
  return bd09ToGcj02(bd.lng, bd.lat)
}
