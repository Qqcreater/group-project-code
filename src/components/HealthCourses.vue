<template>
  <div class="module">
    <div class="module-head">
      <div class="head-row">
        <div>
          <h2>🧘 养生课程内容</h2>
          <p>跟练B站真实教学视频，章节与视频时间轴一一对应。</p>
        </div>
        <button class="create-btn" @click="openCreate">➕ 自建课程</button>
      </div>
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
            <h3>{{ c.title }}<span v-if="c.aiRec" class="ai-tag">✨ 自主添加</span><span v-else-if="c.isCustom" class="custom-tag">自建</span></h3>
            <span class="top-right">
              <span class="level" :class="c.level">{{ c.level }}</span>
              <button v-if="c.isCustom" class="del-btn" title="删除该自建课程" @click="deleteCourse(c)">✕</button>
            </span>
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

        <!-- B站官方嵌入播放器（对应真实锻炼教学视频）；AI 推荐课程无固定视频时展示搜索引导 -->
        <div class="video-player">
          <div v-if="playingCourse.bvid" class="bilibili-wrap">
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
          <div v-else class="bilibili-wrap ai-video-guide">
            <div class="guide-icon">🔍</div>
            <p class="guide-title">这是 AI 根据你的健康分析定制的课程，还没有绑定固定视频</p>
            <p class="guide-desc">点击下方按钮去哔哩哔哩搜索跟练视频，任选一个喜欢的跟着练即可；进度会正常记录。</p>
            <a
              class="guide-btn"
              :href="'https://search.bilibili.com/all?keyword=' + encodeURIComponent(playingCourse.searchKw || playingCourse.title)"
              target="_blank"
              rel="noopener"
            >🔍 去 B站搜索「{{ playingCourse.searchKw || playingCourse.title }}」</a>
          </div>
          <div class="source-tip">
            <span>📺 视频源：哔哩哔哩 · {{ playingCourse.teacher }} · 全片 {{ formatTime(playingCourse.videoSec) }}</span>
            <a
              v-if="playingCourse.bvid"
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

    <!-- 自建课程弹窗 -->
    <div v-if="showCreate" class="modal-mask" @click.self="closeCreate">
      <div class="modal create-modal">
        <div class="modal-head">
          <h3>➕ 自建课程</h3>
          <button class="close-btn" @click="closeCreate">✕</button>
        </div>
        <div class="form">
          <label>课程标题 <i>*</i></label>
          <input v-model.trim="form.title" maxlength="30" placeholder="如：办公室八段锦午间跟练" />

          <label>B站视频链接或 BV 号 <i>*</i></label>
          <input v-model.trim="form.bvidInput" placeholder="https://www.bilibili.com/video/BV… 或 BV1h5EX6EEjZ" />

          <div class="form-row">
            <div>
              <label>视频时长（分钟）<i>*</i></label>
              <input v-model.number="form.minutes" type="number" min="1" max="240" />
            </div>
            <div>
              <label>章节数（自动均分时长）</label>
              <input v-model.number="form.sectionCount" type="number" min="1" max="8" />
            </div>
          </div>

          <div class="form-row">
            <div>
              <label>分类</label>
              <input v-model.trim="form.cat" list="catOptions" placeholder="选择或输入新分类" />
              <datalist id="catOptions">
                <option v-for="c in catOptions" :key="c" :value="c" />
              </datalist>
            </div>
            <div>
              <label>难度</label>
              <select v-model="form.level">
                <option value="入门">入门</option>
                <option value="进阶">进阶</option>
              </select>
            </div>
          </div>

          <label>讲师 / UP主（选填）</label>
          <input v-model.trim="form.teacher" placeholder="默认：自建课程" />

          <label>课程简介（选填）</label>
          <textarea v-model.trim="form.desc" rows="2" maxlength="120" placeholder="简单介绍一下这门课…"></textarea>

          <label>封面图标</label>
          <div class="emoji-row">
            <button
              v-for="e in emojis"
              :key="e"
              type="button"
              class="emoji-btn"
              :class="{ sel: form.emoji === e }"
              @click="form.emoji = e"
            >{{ e }}</button>
          </div>

          <p v-if="formErr" class="form-err">{{ formErr }}</p>
          <div class="form-foot">
            <button class="btn" @click="closeCreate">取消</button>
            <button class="btn primary" :disabled="saving" @click="submitCreate">{{ saving ? '创建中…' : '创建课程' }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { BUILT_IN_COURSES, COURSE_JUMP_KEY, loadAiCourses } from '@/utils/courseLibrary'

const STORAGE_KEY = 'zy_courses_progress'
const CUSTOM_KEY = 'zy_custom_courses'

export default {
  name: 'HealthCourses',
  data() {
    return {
      activeCat: '全部',
      categories: ['全部', '太极', '瑜伽', '冥想', '八段锦', '营养'],
      watchTime: 0,
      watchTimer: null,
      playingCourse: null,
      /* 自建课程 */
      customCourses: [],
      showCreate: false,
      formErr: '',
      saving: false,
      emojis: ['🎬', '🧎', '🌅', '🌙', '🧘‍♀️', '🥗', '✋', '🥊', '🏃', '💆'],
      form: {
        title: '', bvidInput: '', minutes: 5, sectionCount: 3,
        cat: '', level: '入门', teacher: '', desc: '', emoji: '🎬'
      },
      /* 内置课程数据来自共享库 courseLibrary.js（含关键词标签，供自测推荐匹配） */
      courses: BUILT_IN_COURSES.map((c) => ({
        ...c,
        enrolled: false,
        progressSec: 0,
        celebrated: false,
        lastStudy: ''
      }))
    }
  },
  computed: {
    catOptions() {
      return this.categories.filter((c) => c !== '全部')
    },
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
    this.loadCustom()
    this.restoreProgress()
    // 健康自测推荐课程跳转：自动打开对应课程视频
    try {
      const jumpId = localStorage.getItem(COURSE_JUMP_KEY)
      if (jumpId) {
        localStorage.removeItem(COURSE_JUMP_KEY)
        const target = this.courses.find((c) => String(c.id) === jumpId)
        if (target) {
          this.$nextTick(() => this.openVideo(target))
        }
      }
    } catch (_) { /* noop */ }
  },
  /* keep-alive 缓存下，每次切回本页都会触发：重新同步 AI 定制课程，
   * 保证在自测页添加课程后切回来能立即看到（created 只会跑一次） */
  activated() {
    this.syncAiCourses()
    this.restoreProgress()
  },
  beforeUnmount() {
    this.stopWatch()
  },
  methods: {
    /* ===== 自建课程 ===== */
    /* 同步 AI 定制课程（zy_ai_courses）：先清掉已加载的 AI 课程再重建，可重复调用 */
    syncAiCourses() {
      try {
        this.courses = this.courses.filter((c) => !c.aiRec)
        this.customCourses = this.customCourses.filter((c) => !c.aiRec)
        const aiList = loadAiCourses().filter((def) => def && def.title).map((def) => ({
          emoji: '✨',
          cat: '营养',
          teacher: 'AI 智能推荐',
          level: '入门',
          desc: '',
          bvid: '',
          videoSec: 600,
          sections: [{ name: '完整学习', start: 0, end: 600 }],
          ...def,
          isCustom: true,
          aiRec: true,
          enrolled: false,
          progressSec: 0,
          celebrated: false,
          lastStudy: ''
        }))
        aiList.forEach((course) => {
          this.customCourses.push(course)
          if (course.cat && !this.categories.includes(course.cat)) this.categories.push(course.cat)
        })
        if (aiList.length) this.courses.unshift(...aiList.slice().reverse())
      } catch (e) {
        /* 忽略 AI 课程加载错误 */
      }
    },
    loadCustom() {
      this.syncAiCourses()
      try {
        const saved = JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]')
        if (!Array.isArray(saved)) return
        saved.forEach((def) => {
          if (!def || !def.bvid) return
          const course = {
            emoji: '🎬',
            cat: '营养',
            teacher: '自建课程',
            level: '入门',
            desc: '',
            ...def,
            isCustom: true,
            enrolled: false,
            progressSec: 0,
            celebrated: false,
            lastStudy: ''
          }
          this.customCourses.push(course)
          this.courses.push(course)
          if (course.cat && !this.categories.includes(course.cat)) this.categories.push(course.cat)
        })
      } catch (e) {
        /* 忽略本地存储解析错误 */
      }
    },
    saveCustom() {
      try {
        const list = this.customCourses
          .filter((c) => !c.aiRec) // AI 推荐课程有独立存储，不写入自建课程库
          .map((c) => ({
            id: c.id, title: c.title, emoji: c.emoji, cat: c.cat, teacher: c.teacher,
            level: c.level, bvid: c.bvid, videoSec: c.videoSec, desc: c.desc,
            sections: c.sections, isCustom: true
          }))
        localStorage.setItem(CUSTOM_KEY, JSON.stringify(list))
      } catch (e) {
        /* 忽略本地存储写入错误 */
      }
    },
    /* 从 AI 推荐课程存储中删除 */
    removeAiCourse(id) {
      try {
        const list = loadAiCourses().filter((c) => c.id !== id)
        localStorage.setItem('zy_ai_courses', JSON.stringify(list))
      } catch (e) {
        /* 忽略本地存储写入错误 */
      }
    },
    openCreate() {
      this.form = { title: '', bvidInput: '', minutes: 5, sectionCount: 3, cat: '', level: '入门', teacher: '', desc: '', emoji: '🎬' }
      this.formErr = ''
      this.showCreate = true
    },
    closeCreate() {
      this.showCreate = false
    },
    extractBvid(input) {
      const m = String(input || '').match(/BV[0-9A-Za-z]{10}/)
      return m ? m[0] : ''
    },
    submitCreate() {
      const f = this.form
      if (!f.title) { this.formErr = '请填写课程标题'; return }
      const bvid = this.extractBvid(f.bvidInput)
      if (!bvid) { this.formErr = 'B站链接无效：需要包含 BV 号（BV 开头的 12 位字符）'; return }
      const totalSec = Math.round((f.minutes || 0) * 60)
      if (!totalSec || totalSec < 30) { this.formErr = '请填写有效视频时长（至少 1 分钟）'; return }
      const n = Math.max(1, Math.min(8, f.sectionCount || 1))
      // 按章节数自动均分视频时长
      const per = Math.floor(totalSec / n)
      const sections = []
      for (let i = 0; i < n; i++) {
        const start = i * per
        const end = i === n - 1 ? totalSec : (i + 1) * per
        sections.push({ name: `第${i + 1}节 跟练`, start, end })
      }
      const course = {
        id: 'c' + Date.now(),
        title: f.title,
        emoji: f.emoji || '🎬',
        cat: f.cat || '营养',
        teacher: f.teacher || '自建课程',
        level: f.level || '入门',
        bvid,
        videoSec: totalSec,
        desc: f.desc || `自建课程：${f.title}。B站跟练视频，共 ${n} 个章节。`,
        sections,
        enrolled: false,
        progressSec: 0,
        celebrated: false,
        lastStudy: '',
        isCustom: true
      }
      this.customCourses.push(course)
      this.courses.push(course)
      if (course.cat && !this.categories.includes(course.cat)) this.categories.push(course.cat)
      this.saveCustom()
      this.showCreate = false
      this.activeCat = '全部'
    },
    deleteCourse(c) {
      const tip = c.aiRec ? `确定删除自主添加的 AI 定制课程《${c.title}》？\n学习进度将一并清除。` : `确定删除自建课程《${c.title}》？\n学习进度将一并清除，内置课程不受影响。`
      if (!confirm(tip)) return
      this.courses = this.courses.filter((x) => x.id !== c.id)
      this.customCourses = this.customCourses.filter((x) => x.id !== c.id)
      if (c.aiRec) this.removeAiCourse(c.id)
      this.saveCustom()
      // 清除该课程的学习进度
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
        if (saved[c.id]) {
          delete saved[c.id]
          localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
        }
      } catch (e) {
        /* 忽略本地存储错误 */
      }
    },
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
.head-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.head-row p {
  margin-bottom: 0;
}
.create-btn {
  flex-shrink: 0;
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #35705f, #2f5d50);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(47, 93, 80, 0.25);
  transition: opacity 0.2s, transform 0.1s;
}
.create-btn:hover {
  opacity: 0.92;
}
.create-btn:active {
  transform: scale(0.97);
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
.custom-tag {
  margin-left: 8px;
  font-size: 10px;
  font-weight: 600;
  color: #b9770e;
  background: #fbe9d0;
  border-radius: 8px;
  padding: 2px 7px;
  vertical-align: 2px;
}
/* AI 推荐课程标记 */
.ai-tag {
  margin-left: 8px;
  font-size: 10px;
  font-weight: 600;
  color: #3c6656;
  background: #dff0e7;
  border: 1px solid #9dc4b2;
  border-radius: 8px;
  padding: 2px 7px;
  vertical-align: 2px;
}
/* AI 课程无固定视频时的搜索引导 */
.ai-video-guide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 34px 24px;
  background: linear-gradient(135deg, #f4faf6, #e8f3ec);
  min-height: 240px;
}
.guide-icon {
  font-size: 40px;
  margin-bottom: 12px;
}
.guide-title {
  font-size: 15px;
  font-weight: 600;
  color: #2f5d50;
  margin: 0 0 8px;
}
.guide-desc {
  font-size: 13px;
  color: #6d8378;
  line-height: 1.7;
  margin: 0 0 16px;
  max-width: 420px;
}
.guide-btn {
  display: inline-block;
  background: #4a7a68;
  color: #fff;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: 22px;
  text-decoration: none;
  transition: background 0.2s;
}
.guide-btn:hover {
  background: #3c6656;
}
.top-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.del-btn {
  border: none;
  background: #f3e5e4;
  color: #c0564f;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 12px;
  cursor: pointer;
  line-height: 1;
  transition: background 0.2s;
}
.del-btn:hover {
  background: #c0564f;
  color: #fff;
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
/* 自建课程表单弹窗 */
.create-modal {
  width: 480px;
  padding: 22px 24px;
}
.form label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #2f5d50;
  margin: 12px 0 6px;
}
.form label i {
  color: #c0564f;
  font-style: normal;
}
.form input,
.form textarea,
.form select {
  width: 100%;
  box-sizing: border-box;
  border: 1.5px solid #d7e3dc;
  border-radius: 9px;
  background: #fff;
  padding: 9px 12px;
  font-size: 13.5px;
  color: #2c3e50;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s;
  resize: vertical;
}
.form input:focus,
.form textarea:focus,
.form select:focus {
  border-color: #7fc8a9;
}
.form-row {
  display: flex;
  gap: 12px;
}
.form-row > div {
  flex: 1;
  min-width: 0;
}
.emoji-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.emoji-btn {
  width: 38px;
  height: 38px;
  border: 1.5px solid #d7e3dc;
  border-radius: 9px;
  background: #fff;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.15s;
}
.emoji-btn.sel {
  border-color: #2f5d50;
  background: #e3f1ea;
  transform: scale(1.05);
}
.form-err {
  margin: 12px 0 0;
  font-size: 13px;
  color: #c0564f;
  background: #fdf1f0;
  border: 1px solid #f3d4d1;
  border-radius: 8px;
  padding: 8px 12px;
}
.form-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}
.form-foot .btn.primary {
  background: #2f5d50;
  color: #fff;
}
.form-foot .btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
@media (max-width: 560px) {
  .form-row {
    flex-direction: column;
  }
  .head-row {
    flex-direction: column;
  }
  .create-btn {
    width: 100%;
  }
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
