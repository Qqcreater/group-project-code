<template>
  <div class="module">
    <div class="module-head">
      <h2>🧘 养生课程内容</h2>
      <p>跟练B站真实教学视频，章节与视频时间轴一一对应。</p>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-num">{{ enrolledCount }}</div>
        <div class="stat-label">已报名</div>
      </div>
      <div class="stat">
        <div class="stat-num">{{ totalMinutes }}</div>
        <div class="stat-label">学习分钟</div>
      </div>
      <div class="stat">
        <div class="stat-num">{{ avgProgress }}%</div>
        <div class="stat-label">平均进度</div>
      </div>
    </div>

    <div class="filters">
      <button
        v-for="c in categories"
        :key="c"
        class="chip"
        :class="{ active: activeCat === c }"
        @click="activeCat = c"
      >
        {{ c }}
      </button>
    </div>

    <div class="list">
      <div v-for="c in filtered" :key="c.id" class="course">
        <div class="course-cover">{{ c.emoji }}</div>
        <div class="course-main">
          <div class="course-top">
            <h3>{{ c.title }}</h3>
            <span class="level" :class="c.level">{{ c.level }}</span>
          </div>
          <p class="course-sub">{{ c.teacher }} · 视频 {{ formatTime(c.videoSec) }} · {{ c.cat }} · 已完成 {{ doneCount(c) }}/{{ c.sections.length }} 章</p>
          <p class="course-desc">{{ c.desc }}</p>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressOf(c) + '%' }"></div>
          </div>
          <div class="course-foot">
            <span class="progress-text">{{ progressOf(c) }}%</span>
            <span class="progress-text">{{ c.lastStudy ? '上次学习：' + c.lastStudy : '' }}</span>
            <button class="btn" :class="{ enrolled: c.enrolled }" @click="openVideo(c)">
              {{ c.enrolled ? (c.progressSec > 0 ? '继续跟练 ▶' : '开始跟练 ▶') : '报名学习' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 视频跟练弹窗 -->
    <div v-if="playingCourse" class="modal-mask" @click.self="closeVideo">
      <div class="modal">
        <div class="modal-head">
          <h3>{{ playingCourse.title }}</h3>
          <button class="close-btn" @click="closeVideo">✕</button>
        </div>

        <!-- B站官方嵌入播放器（对应真实锻炼教学视频） -->
        <div class="video-player">
          <div class="bilibili-wrap">
            <iframe
              :src="bilibiliEmbedUrl"
              class="video-iframe"
              scrolling="no"
              border="0"
              frameborder="no"
              framespacing="0"
              allowfullscreen="true"
              referrerpolicy="no-referrer"
              :key="playingCourse.id"
            ></iframe>
          </div>
          <div class="source-tip">
            <span>📺 视频源：哔哩哔哩 · {{ playingCourse.teacher }} · 全片 {{ formatTime(playingCourse.videoSec) }}</span>
            <a
              :href="'https://www.bilibili.com/video/' + playingCourse.bvid"
              target="_blank"
              rel="noopener"
              class="open-original"
            >↗ B站原片</a>
          </div>
          <div class="watching-bar">
            <span class="watching-dot"></span>
            <span>已观看 {{ formatTime(watchTime) }} / 视频 {{ formatTime(playingCourse.videoSec) }} · 当前章节 {{ currentSectionIndex + 1 }}/{{ playingCourse.sections.length }}：{{ currentSection.name }}</span>
            <button class="mark-done-btn" @click.stop="markCurrentDone">✓ 标记本节完成</button>
          </div>
        </div>

        <div class="video-body">
          <!-- 章节列表（与视频时间轴对应） -->
          <div class="sections">
            <h4>课程章节（对应视频时间轴）</h4>
            <div
              v-for="(s, i) in playingCourse.sections"
              :key="i"
              class="section"
              :class="{ done: playingCourse.progressSec >= s.end, current: currentSectionIndex === i }"
            >
              <span class="section-index">{{ playingCourse.progressSec >= s.end ? '✓' : i + 1 }}</span>
              <span class="section-name">{{ s.name }}</span>
              <span class="section-mins">{{ formatRange(s) }}</span>
            </div>
            <p class="section-tip">💡 播放视频时本页自动计时，观看时长到达章节区间末尾会自动勾选并推进；也可点击「标记本节完成」手动推进。</p>
            <button class="finish-btn" @click="closeVideo">完成本次学习</button>
          </div>
          <!-- 课程简介 -->
          <div class="course-info">
            <h4>课程简介</h4>
            <p>{{ playingCourse.desc }}</p>
            <div class="info-row"><span class="info-label">讲师 / UP主</span><span>{{ playingCourse.teacher }}</span></div>
            <div class="info-row"><span class="info-label">视频时长</span><span>{{ formatTime(playingCourse.videoSec) }}</span></div>
            <div class="info-row"><span class="info-label">难度</span><span>{{ playingCourse.level }}</span></div>
            <div class="info-row">
              <span class="info-label">总进度</span>
              <span class="info-progress">{{ progressOf(playingCourse) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const STORAGE_KEY = 'zy_courses_progress'

export default {
  name: 'HealthCourses',
  data() {
    return {
      activeCat: '全部',
      categories: ['全部', '太极', '瑜伽', '冥想', '八段锦', '营养'],
      watchTime: 0,
      watchTimer: null,
      playingCourse: null,
      /* 章节时间 = B站视频真实时间轴（videoSec 为接口返回的真实时长） */
      courses: [
        {
          id: 1,
          title: '八段锦入门十二式',
          emoji: '🧎',
          cat: '八段锦',
          teacher: '余小鱼鱼鱼（北体冠军示范）',
          level: '入门',
          bvid: 'BV1h5EX6EEjZ',
          videoSec: 736,
          desc: '国家体育总局推广版八段锦，1080P高清，北体武术冠军标准示范，带呼吸口令与完整跟练。坚持练习可调气血、通经络、养五脏。',
          sections: [
            { name: '起势与热身', start: 0, end: 120 },
            { name: '八段锦完整跟练', start: 120, end: 660 },
            { name: '收功调息', start: 660, end: 736 }
          ],
          enrolled: false,
          progressSec: 0,
          celebrated: false,
          lastStudy: ''
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
          desc: '42式太极拳云手动作分解精讲，以腰为轴、节节贯穿、连贯圆活。3分钟快速掌握云手要领，晨起练一遍激活周身气血。',
          sections: [
            { name: '云手动作分解', start: 0, end: 120 },
            { name: '完整演示', start: 120, end: 185 }
          ],
          enrolled: false,
          progressSec: 0,
          celebrated: false,
          lastStudy: ''
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
          desc: '身体扫描·深度修复系列：30分钟渐进式肌肉放松，从脚趾到眉心依次绷紧再松开，疗愈焦虑失眠。建议佩戴耳机，睡前练习。',
          sections: [
            { name: '引导入静', start: 0, end: 900 },
            { name: '渐进式肌肉放松', start: 900, end: 1620 },
            { name: '自然入睡', start: 1620, end: 1848 }
          ],
          enrolled: false,
          progressSec: 0,
          celebrated: false,
          lastStudy: ''
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
          desc: 'Kassandra 15分钟颈肩释放瑜伽：专注颈部与肩部的流动练习，缓解久坐导致的疼痛、僵硬与紧张。适合新手，无需任何辅具。',
          sections: [
            { name: '唤醒热身', start: 0, end: 240 },
            { name: '颈肩深度拉伸', start: 240, end: 720 },
            { name: '放松收束', start: 720, end: 872 }
          ],
          enrolled: false,
          progressSec: 0,
          celebrated: false,
          lastStudy: ''
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
          ],
          enrolled: false,
          progressSec: 0,
          celebrated: false,
          lastStudy: ''
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
          desc: '5分钟拍八虚完整跟练：空心掌拍打两肘、两腋、两髀、两腘，每天拍一拍，促进气血流通、疏通经络。晨起或睡前各做一遍。',
          sections: [
            { name: '手法讲解', start: 0, end: 90 },
            { name: '完整跟练', start: 90, end: 260 },
            { name: '收势整理', start: 260, end: 293 }
          ],
          enrolled: false,
          progressSec: 0,
          celebrated: false,
          lastStudy: ''
        }
      ]
    }
  },
  computed: {
    filtered() {
      if (this.activeCat === '全部') return this.courses
      return this.courses.filter((c) => c.cat === this.activeCat)
    },
    enrolledCount() {
      return this.courses.filter((c) => c.enrolled).length
    },
    totalMinutes() {
      return this.courses.reduce((s, c) => s + Math.round((this.progressOf(c) / 100) * (c.videoSec / 60)), 0)
    },
    avgProgress() {
      if (this.courses.length === 0) return 0
      return Math.round(this.courses.reduce((s, c) => s + this.progressOf(c), 0) / this.courses.length)
    },
    bilibiliEmbedUrl() {
      if (!this.playingCourse || !this.playingCourse.bvid) return ''
      // B站官方嵌入地址：autoplay=0 不自动播放，danmaku=0 关弹幕，high_quality=1 高清
      return `https://player.bilibili.com/player.html?bvid=${this.playingCourse.bvid}&p=1&autoplay=0&high_quality=1&danmaku=0&as_wide=1`
    },
    currentSectionIndex() {
      if (!this.playingCourse) return 0
      const idx = this.playingCourse.sections.findIndex((s) => this.watchTime < s.end)
      return idx < 0 ? this.playingCourse.sections.length - 1 : idx
    },
    currentSection() {
      if (!this.playingCourse) return { name: '', start: 0, end: 0 }
      return this.playingCourse.sections[this.currentSectionIndex]
    }
  },
  created() {
    this.restoreProgress()
  },
  beforeUnmount() {
    this.stopWatch()
  },
  methods: {
    restoreProgress() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
        this.courses.forEach((c) => {
          if (saved[c.id]) {
            c.progressSec = saved[c.id].progressSec || 0
            c.enrolled = !!saved[c.id].enrolled
            c.celebrated = !!saved[c.id].celebrated
            c.lastStudy = saved[c.id].lastStudy || ''
          }
        })
      } catch (e) {
        /* 忽略本地存储解析错误 */
      }
    },
    saveProgress() {
      try {
        const data = {}
        this.courses.forEach((c) => {
          data[c.id] = {
            progressSec: c.progressSec,
            enrolled: c.enrolled,
            celebrated: c.celebrated,
            lastStudy: c.lastStudy
          }
        })
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch (e) {
        /* 忽略本地存储写入错误 */
      }
    },
    formatTime(sec) {
      const m = Math.floor(sec / 60)
      const s = Math.floor(sec % 60)
      return `${m}:${String(s).padStart(2, '0')}`
    },
    formatRange(s) {
      return `${this.formatTime(s.start)} - ${this.formatTime(s.end)}`
    },
    progressOf(c) {
      return Math.min(100, Math.round((c.progressSec / c.videoSec) * 100))
    },
    doneCount(c) {
      return c.sections.filter((s) => c.progressSec >= s.end).length
    },
    openVideo(c) {
      c.enrolled = true
      this.playingCourse = c
      // 从上次观看位置继续（与真实视频时间轴对应）
      this.watchTime = c.progressSec || 0
      this.$nextTick(() => {
        this.startWatch()
      })
    },
    closeVideo() {
      this.stopWatch()
      this.saveProgress()
      this.playingCourse = null
    },
    markCurrentDone() {
      // 将观看位置推进到当前章节末尾（下一章开头），保持与视频时间轴一致
      if (!this.playingCourse) return
      const end = this.currentSection.end
      this.watchTime = end
      this.playingCourse.progressSec = end
      this.checkComplete()
      this.saveProgress()
    },
    checkComplete() {
      const c = this.playingCourse
      if (!c) return
      c.lastStudy = new Date().toLocaleString('zh-CN', {
        hour12: false,
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
      if (c.progressSec >= c.videoSec && !c.celebrated) {
        c.celebrated = true
        this.stopWatch()
        this.saveProgress()
        alert(`🎊 恭喜完成《${c.title}》全部章节！\n\n视频时长：${this.formatTime(c.videoSec)}\n完成时间：${new Date().toLocaleString('zh-CN')}`)
      }
    },
    startWatch() {
      this.stopWatch()
      // B站 iframe 跨域无法读取内部播放时间，采用同步计时方案：
      // 打开跟练即计时，与视频真实时长对应，观看到位自动勾选章节
      this.watchTimer = setInterval(() => {
        if (!this.playingCourse) return
        this.watchTime += 1
        this.playingCourse.progressSec = this.watchTime
        this.checkComplete()
      }, 1000)
    },
    stopWatch() {
      if (this.watchTimer) {
        clearInterval(this.watchTimer)
        this.watchTimer = null
      }
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
  margin: 0 0 18px;
  color: #7a8a82;
  font-size: 14px;
}
.stats {
  display: flex;
  gap: 14px;
  margin-bottom: 20px;
}
.stat {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 4px 18px rgba(47, 93, 80, 0.06);
}
.stat-num {
  font-size: 26px;
  font-weight: 700;
  color: #2f5d50;
}
.stat-label {
  font-size: 12px;
  color: #8a9b93;
  margin-top: 4px;
}
.filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.chip {
  padding: 7px 16px;
  border: 1px solid #d8e3dd;
  background: #fff;
  border-radius: 18px;
  cursor: pointer;
  font-size: 13px;
  color: #5a6b62;
}
.chip.active {
  background: #2f5d50;
  color: #fff;
  border-color: #2f5d50;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.course {
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  gap: 16px;
  box-shadow: 0 4px 18px rgba(47, 93, 80, 0.06);
}
.course-cover {
  width: 76px;
  height: 76px;
  border-radius: 12px;
  background: #eef6f1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38px;
  flex-shrink: 0;
}
.course-main {
  flex: 1;
  min-width: 0;
}
.course-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.course-top h3 {
  margin: 0;
  font-size: 16px;
  color: #2f5d50;
}
.level {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 12px;
  flex-shrink: 0;
}
.level.入门 {
  background: #e3f1ea;
  color: #2f5d50;
}
.level.进阶 {
  background: #fbe9d0;
  color: #b9770e;
}
.course-sub {
  font-size: 13px;
  color: #8a9b93;
  margin: 6px 0 6px;
}
.course-desc {
  font-size: 13px;
  color: #5a6b62;
  line-height: 1.6;
  margin: 0 0 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.progress-bar {
  height: 8px;
  background: #eef2ef;
  border-radius: 6px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #7fc8a9, #2f5d50);
  transition: width 0.3s;
}
.course-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.progress-text {
  font-size: 13px;
  color: #5a6b62;
}
.btn {
  padding: 8px 18px;
  border: 1px solid #2f5d50;
  background: #fff;
  color: #2f5d50;
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
}
.btn.enrolled {
  background: #2f5d50;
  color: #fff;
}

/* ===== 视频弹窗 ===== */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 30, 24, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 16px;
}
.modal {
  background: #f4f8f5;
  border-radius: 18px;
  width: 1000px;
  max-width: 100%;
  max-height: 92vh;
  overflow-y: auto;
  padding: 18px;
}
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.modal-head h3 {
  margin: 0;
  color: #2f5d50;
  font-size: 18px;
}
.close-btn {
  border: none;
  background: #e3ece7;
  color: #5a6b62;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 15px;
  cursor: pointer;
}
.close-btn:hover {
  background: #d3e0d9;
}
.video-player {
  background: #111;
  border-radius: 12px;
  overflow: hidden;
}
.bilibili-wrap {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
}
.video-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
.source-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: #1a2a24;
  color: #7fc8a9;
  font-size: 12px;
  gap: 10px;
  flex-wrap: wrap;
}
.open-original {
  color: #7fc8a9;
  text-decoration: none;
  font-size: 12px;
  padding: 3px 10px;
  border: 1px solid rgba(127, 200, 169, 0.4);
  border-radius: 6px;
}
.open-original:hover {
  background: #7fc8a9;
  color: #fff;
}
.watching-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: #12211b;
  color: #7fc8a9;
  font-size: 13px;
  flex-wrap: wrap;
}
.watching-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e74c3c;
  animation: blink 1s infinite;
}
@keyframes blink {
  50% {
    opacity: 0.3;
  }
}
.mark-done-btn {
  margin-left: auto;
  border: 1px solid rgba(127, 200, 169, 0.5);
  background: rgba(127, 200, 169, 0.15);
  color: #7fc8a9;
  padding: 5px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
}
.mark-done-btn:hover {
  background: #7fc8a9;
  color: #12211b;
}
.video-body {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 14px;
  margin-top: 14px;
}
.sections,
.course-info {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
}
.sections h4,
.course-info h4 {
  margin: 0 0 10px;
  color: #2f5d50;
  font-size: 15px;
}
.section {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  margin-bottom: 6px;
  border: 1px solid transparent;
}
.section.current {
  background: #eef6f1;
  border-color: #7fc8a9;
}
.section.done {
  opacity: 0.75;
}
.section-index {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e3ece7;
  color: #5a6b62;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.section.done .section-index {
  background: #2f5d50;
  color: #fff;
}
.section.current .section-index {
  background: #7fc8a9;
  color: #fff;
}
.section-name {
  flex: 1;
  font-size: 14px;
  color: #3c4a44;
}
.section-mins {
  font-size: 12px;
  color: #8a9b93;
  font-variant-numeric: tabular-nums;
}
.section-tip {
  font-size: 12px;
  color: #8a9b93;
  line-height: 1.7;
  margin: 8px 0;
}
.finish-btn {
  width: 100%;
  margin-top: 8px;
  padding: 10px;
  border: 1px solid #2f5d50;
  background: #fff;
  color: #2f5d50;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
}
.finish-btn:hover {
  background: #2f5d50;
  color: #fff;
}
.course-info p {
  font-size: 13px;
  color: #5a6b62;
  line-height: 1.7;
  margin: 0 0 12px;
}
.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #3c4a44;
  padding: 8px 0;
  border-bottom: 1px dashed #e6ebe7;
}
.info-label {
  color: #8a9b93;
}
.info-progress {
  color: #2f5d50;
  font-weight: 700;
}

@media (max-width: 780px) {
  .video-body {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .stats {
    gap: 8px;
  }
  .stat {
    padding: 10px 6px;
  }
  .stat-num {
    font-size: 20px;
  }
  .course {
    gap: 12px;
    padding: 14px;
  }
  .course-cover {
    width: 56px;
    height: 56px;
    font-size: 28px;
  }
  .btn {
    padding: 7px 14px;
  }
  .modal-mask {
    padding: 0;
    align-items: flex-end;
  }
  .modal {
    max-height: 96vh;
    border-radius: 16px 16px 0 0;
    padding: 14px 12px calc(14px + env(safe-area-inset-bottom));
  }
  .modal-head h3 {
    font-size: 16px;
  }
  .watching-bar {
    font-size: 12px;
  }
  .mark-done-btn {
    margin-left: 0;
  }
}
</style>
