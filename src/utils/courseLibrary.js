/* 内置养生课程库（HealthCourses 与 HealthSelfTest 共用）
 * keys：用于自测建议关键词 → 课程匹配的标签词 */
export const BUILT_IN_COURSES = [
  {
    id: 1,
    title: '八段锦入门十二式',
    emoji: '🧎',
    cat: '八段锦',
    teacher: '余小鱼鱼鱼（北体冠军示范）',
    level: '入门',
    bvid: 'BV1h5EX6EEjZ',
    videoSec: 736,
    keys: ['气虚', '气血', '乏力', '疲劳', '气短', '面色白', '苍白', '经络', '五脏', '体质差'],
    desc: '国家体育总局推广版八段锦，1080P高清，北体武术冠军标准示范，带呼吸口令与完整跟练。坚持练习可调气血、通经络、养五脏。',
    sections: [
      { name: '起势与热身', start: 0, end: 120 },
      { name: '八段锦完整跟练', start: 120, end: 660 },
      { name: '收功调息', start: 660, end: 736 }
    ]
  },
  {
    id: 2,
    title: '清晨太极云手练习',
    emoji: '🌅',
    cat: '太极',
    teacher: '陈-运太极',
    level: '入门',
    bvid: 'BV1QzcvziETh',
    videoSec: 185,
    keys: ['气血', '循环', '手脚凉', '阳虚', '瘀', '晦暗', '晨起', '精神差'],
    desc: '42式太极拳云手动作分解精讲，以腰为轴、节节贯穿、连贯圆活。3分钟快速掌握云手要领，晨起练一遍激活周身气血。',
    sections: [
      { name: '云手动作分解', start: 0, end: 120 },
      { name: '完整演示', start: 120, end: 185 }
    ]
  },
  {
    id: 3,
    title: '睡前正念冥想引导',
    emoji: '🌙',
    cat: '冥想',
    teacher: '小慈',
    level: '入门',
    bvid: 'BV1E4jF6kEDC',
    videoSec: 1848,
    keys: ['失眠', '焦虑', '黑眼圈', '眼袋', '眼周', '疲劳', '压力', '熬夜', '心火旺', '入睡难'],
    desc: '身体扫描·深度修复系列：30分钟渐进式肌肉放松，从脚趾到眉心依次绷紧再松开，疗愈焦虑失眠。建议佩戴耳机，睡前练习。',
    sections: [
      { name: '引导入静', start: 0, end: 900 },
      { name: '渐进式肌肉放松', start: 900, end: 1620 },
      { name: '自然入睡', start: 1620, end: 1848 }
    ]
  },
  {
    id: 4,
    title: '办公室肩颈舒缓瑜伽',
    emoji: '🧘‍♀️',
    cat: '瑜伽',
    teacher: 'Kassandra',
    level: '入门',
    bvid: 'BV1FbLT6hExA',
    videoSec: 872,
    keys: ['肩颈', '颈椎', '僵硬', '久坐', '低头', '酸痛', '紧张', '僵硬', '头痛'],
    desc: 'Kassandra 15分钟颈肩释放瑜伽：专注颈部与肩部的流动练习，缓解久坐导致的疼痛、僵硬与紧张。适合新手，无需任何辅具。',
    sections: [
      { name: '唤醒热身', start: 0, end: 240 },
      { name: '颈肩深度拉伸', start: 240, end: 720 },
      { name: '放松收束', start: 720, end: 872 }
    ]
  },
  {
    id: 5,
    title: '中医四季养生·黄帝内经',
    emoji: '🥗',
    cat: '营养',
    teacher: '倪海厦',
    level: '进阶',
    bvid: 'BV1u4Ew6MEgU',
    videoSec: 1827,
    keys: ['脾虚', '湿', '面黄', '浮肿', '消化', '脾胃', '四季', '阴阳', '饮食', '养生知识'],
    desc: '倪海厦详解《黄帝内经·四气调神大论》：春生、夏长、秋收、冬藏的四季养生操作方法，长夏养脾，阴阳平衡，圣人不治已病治未病。章节时间与视频官方时间轴一致。',
    sections: [
      { name: '长寿的终极秘密', start: 0, end: 260 },
      { name: '春季养生', start: 260, end: 530 },
      { name: '夏季养生', start: 530, end: 735 },
      { name: '秋季养生', start: 735, end: 940 },
      { name: '冬季养生', start: 940, end: 1110 },
      { name: '长夏与脾胃', start: 1110, end: 1270 },
      { name: '阴阳平衡', start: 1270, end: 1500 },
      { name: '治未病智慧', start: 1500, end: 1827 }
    ]
  },
  {
    id: 6,
    title: '五行经络拍打操',
    emoji: '✋',
    cat: '八段锦',
    teacher: '会发光的猫儿',
    level: '入门',
    bvid: 'BV1EHxyzTEuc',
    videoSec: 293,
    keys: ['经络', '瘀', '气血', '代谢', '水肿', '湿气', '困倦', '不通', '拍打'],
    desc: '5分钟拍八虚完整跟练：空心掌拍打两肘、两腋、两髀、两腘，每天拍一拍，促进气血流通、疏通经络。晨起或睡前各做一遍。',
    sections: [
      { name: '手法讲解', start: 0, end: 90 },
      { name: '完整跟练', start: 90, end: 260 },
      { name: '收势整理', start: 260, end: 293 }
    ]
  }
]

/* 按关键词匹配课程：返回命中数从高到低排序的课程数组 */
export function matchCoursesByText(text, limit = 3) {
  if (!text) return []
  const scored = BUILT_IN_COURSES.map((c) => {
    let hit = 0
    const hitKeys = []
    c.keys.forEach((k) => {
      if (text.includes(k)) { hit++; hitKeys.push(k) }
    })
    return { course: c, hit, hitKeys }
  }).filter((x) => x.hit > 0)
  scored.sort((a, b) => b.hit - a.hit)
  return scored.slice(0, limit).map((x) => ({ ...x.course, hitKeys: x.hitKeys }))
}

/* 自测结果跳转课程页的暂存 key（HealthCourses created 时消费） */
export const COURSE_JUMP_KEY = 'zy_jump_course_id'

/* ===== AI 推荐课程（健康自测分析后自动生成，持久化到养生课程页） ===== */
export const AI_COURSES_KEY = 'zy_ai_courses'

/* 保存一门 AI 定制课程（用户自主添加，置顶展示于养生课程页）；同标题已存在时原位更新并返回 true */
export function saveAiCourse(course) {
  try {
    let list = []
    try {
      const raw = JSON.parse(localStorage.getItem(AI_COURSES_KEY) || '[]')
      if (Array.isArray(raw)) list = raw
      // 存储内容损坏（非数组）时直接重置，避免永远保存失败
    } catch (_) { /* 解析失败按空数组处理 */ }
    const record = {
      id: 'ai' + Date.now(),
      aiRec: true,       // AI 定制课程标识
      userAdded: true,   // 用户自主添加（区别于自动生成）
      isCustom: true,
      bvid: '',
      videoSec: 600,
      teacher: 'AI 智能推荐',
      level: '入门',
      ...course
    }
    const idx = list.findIndex((c) => c && c.title === course.title)
    if (idx >= 0) {
      record.id = (list[idx] && list[idx].id) || record.id // 保留原 id，学习进度不受影响
      list.splice(idx, 1, record)
    } else {
      list.push(record)
    }
    localStorage.setItem(AI_COURSES_KEY, JSON.stringify(list))
    return true
  } catch (_) {
    return false
  }
}

/* 读取全部 AI 推荐课程 */
export function loadAiCourses() {
  try {
    const list = JSON.parse(localStorage.getItem(AI_COURSES_KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch (_) {
    return []
  }
}
