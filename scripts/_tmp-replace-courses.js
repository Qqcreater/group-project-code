/* 一次性脚本：把 HealthCourses.vue 内置课程数组替换为共享库映射（兼容 CRLF） */
const fs = require('fs')
const p = 'src/components/HealthCourses.vue'
let s = fs.readFileSync(p, 'utf8')
const start = s.indexOf('      /* 章节时间')
const tail = / {10}lastStudy: ''\r?\n {8}\}\r?\n {6}\]/
const m = tail.exec(s)
if (start < 0 || !m) { console.error('markers not found', start, m && m.index); process.exit(1) }
const replacement = "      /* 内置课程数据来自共享库 courseLibrary.js（含关键词标签，供自测推荐匹配） */\n      courses: BUILT_IN_COURSES.map((c) => ({\n        ...c,\n        enrolled: false,\n        progressSec: 0,\n        celebrated: false,\n        lastStudy: ''\n      }))"
s = s.slice(0, start) + replacement + s.slice(m.index + m[0].length)
fs.writeFileSync(p, s)
console.log('replaced ok')
