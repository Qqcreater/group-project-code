<template>
  <div class="module">
    <div class="module-head">
      <h2>🍲 食疗药膳专区</h2>
      <p>辨证施膳，按体质与季节挑选适合的养生膳食。</p>
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

    <div class="grid">
      <article
        v-for="r in filtered"
        :key="r.id"
        class="card"
        @click="open = r.id"
      >
        <div class="card-emoji">{{ r.emoji }}</div>
        <div class="card-body">
          <div class="card-top">
            <h3>{{ r.name }}</h3>
            <span class="card-tag">{{ r.cat }}</span>
          </div>
          <p class="card-desc">{{ r.efficacy }}</p>
          <div class="card-foot">
            <span>⏱ {{ r.time }}</span>
            <span>🔥 {{ r.cal }} kcal</span>
            <span v-if="r.bvid" class="video-badge">📺 有视频</span>
          </div>
        </div>
      </article>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="open !== null" class="modal-mask" @click.self="open = null">
      <div class="modal">
        <button class="modal-close" @click="open = null">✕</button>
        <div class="modal-emoji">{{ current.emoji }}</div>
        <h2>{{ current.name }}</h2>
        <span class="card-tag">{{ current.cat }}</span>
        <p class="modal-eff">{{ current.efficacy }}</p>
        <h4>🧾 食材</h4>
        <p>{{ current.ingredients }}</p>
        <h4>👥 适宜人群</h4>
        <p>{{ current.suitable }}</p>
        <h4>🍳 做法</h4>
        <ol>
          <li v-for="(s, i) in current.steps" :key="i">{{ s }}</li>
        </ol>
        <div v-if="current.bvid" class="video-section">
          <h4>📺 视频教程</h4>
          <div class="bilibili-wrap">
            <iframe
              :src="'https://player.bilibili.com/player.html?bvid=' + current.bvid + '&p=1&autoplay=0&high_quality=1&danmaku=0&as_wide=1'"
              class="video-iframe"
              scrolling="no"
              border="0"
              frameborder="no"
              allowfullscreen="true"
              referrerpolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            ></iframe>
          </div>
          <div class="video-source">
            📎 视频来源：<a :href="'https://www.bilibili.com/video/' + current.bvid" target="_blank" rel="noopener">哔哩哔哩</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MedicinalCuisine',
  data() {
    return {
      activeCat: '全部',
      open: null,
      categories: ['全部', '健脾', '养肝', '润肺', '补肾', '祛湿', '安神', '补气', '养血', '清热', '滋阴', '明目', '养颜'],
      recipes: [
        // —— 健脾 ——
        { id: 1, name: '山药薏米粥', emoji: '🥣', cat: '健脾',
          efficacy: '健脾祛湿，适合脾胃虚弱、易浮肿者。', time: '40 分钟', cal: 180,
          ingredients: '山药 100g、薏米 50g、粳米 80g、枸杞少许。',
          suitable: '脾胃虚弱、舌苔厚腻、易疲劳人群。',
          steps: ['薏米提前浸泡 2 小时', '粳米与薏米同煮 30 分钟', '加入山药块煮 10 分钟', '撒枸杞焖 5 分钟'],
          bvid: 'BV1mt41137Di' },
        { id: 7, name: '八珍汤', emoji: '🍲', cat: '补气',
          efficacy: '气血双补，适合气血两虚、面色萎黄、疲倦乏力者。', time: '50 分钟', cal: 20,
          ingredients: '党参 10g、白术 10g、茯苓 9g、炙甘草 6g、熟地黄 10g、当归 10g、白芍 8g、川芎 5g、生姜 3 片、大枣 3 枚。',
          suitable: '气血两虚、面色苍白或萎黄、头晕乏力、心悸气短、月经量少者。',
          steps: ['药材冲洗后清水浸泡 20 分钟', '大火煮沸转小火煎 30 分钟，滤出药汁', '加水再煎 20 分钟，两次药汁混合', '分早晚两次温服'],
          bvid: 'BV1sCyUBWELK' },
        { id: 8, name: '红枣山药糕', emoji: '🍰', cat: '健脾',
          efficacy: '健脾养胃，软糯香甜，适合老人小孩。', time: '60 分钟', cal: 240,
          ingredients: '山药 200g、红枣 15g、糯米粉 80g、白糖适量。',
          suitable: '脾虚、胃口差、常吃不下饭者。',
          steps: ['山药蒸熟压成泥', '加糯米粉红枣碎白糖拌匀', '上锅蒸 20 分钟至成型'],
          bvid: '' },

        // —— 养肝 ——
        { id: 2, name: '枸杞菊花茶', emoji: '🍵', cat: '养肝',
          efficacy: '清肝明目，缓解用眼过度。', time: '10 分钟', cal: 25,
          ingredients: '枸杞 10g、菊花 5g、冰糖少许。',
          suitable: '长期用眼、熬夜、肝火旺者。',
          steps: ['温水冲洗材料', '沸水冲泡焖 5 分钟', '可反复续水 2-3 次'],
          bvid: '' },
        { id: 9, name: '白芍甘草饮', emoji: '🌾', cat: '养肝',
          efficacy: '柔肝缓急，缓解肝郁胁痛。', time: '20 分钟', cal: 30,
          ingredients: '白芍 15g、炙甘草 8g、大枣 3 枚。',
          suitable: '肝郁气滞、胁肋胀痛、情绪不畅者。',
          steps: ['药材冲洗', '加水 500ml 煎 15 分钟', '取汁温服，可煎 2 次'],
          bvid: '' },

        // —— 润肺 ——
        { id: 3, name: '冰糖雪梨羹', emoji: '🍐', cat: '润肺',
          efficacy: '润肺止咳，缓解秋燥咽干。', time: '35 分钟', cal: 120,
          ingredients: '雪梨 1 个、冰糖 15g、百合 10g。',
          suitable: '干咳无痰、咽干口燥者。',
          steps: ['雪梨去核切块', '与百合同煮 25 分钟', '加冰糖煮至化开'],
          bvid: '' },
        { id: 10, name: '银耳莲子羹', emoji: '🫘', cat: '润肺',
          efficacy: '滋阴润肺，适合秋冬燥咳、皮肤干燥。', time: '70 分钟', cal: 200,
          ingredients: '银耳 1 朵、莲子 30g、红枣 8 枚、冰糖适量。',
          suitable: '肺燥干咳、口干咽燥、皮肤干燥者。',
          steps: ['银耳冷水泡发 2 小时撕小朵', '与莲子红枣同炖 1 小时', '加冰糖再煮 10 分钟'],
          bvid: 'BV1E1tqzsEMg' },
        { id: 11, name: '枇杷叶蜂蜜饮', emoji: '🍯', cat: '润肺',
          efficacy: '清热润肺，化痰止咳。', time: '20 分钟', cal: 45,
          ingredients: '鲜枇杷叶 10g（干 5g）、蜂蜜 1 勺、生姜 2 片。',
          suitable: '肺胃热盛、咳嗽有痰者。',
          steps: ['枇杷叶刷去毛洗净', '与生姜煎水 10 分钟', '温后加蜂蜜搅匀'],
          bvid: '' },

        // —— 补肾 ——
        { id: 4, name: '黑豆核桃糊', emoji: '🥜', cat: '补肾',
          efficacy: '补肾益精，适合腰膝酸软者。', time: '30 分钟', cal: 220,
          ingredients: '黑豆 60g、核桃 30g、黑芝麻 15g。',
          suitable: '肾虚、脱发、记忆力下降人群。',
          steps: ['黑豆浸泡过夜', '与核桃同煮软烂', '加黑芝麻打成糊'],
          bvid: '' },
        { id: 12, name: '杜仲腰花汤', emoji: '🍲', cat: '补肾',
          efficacy: '补肾强腰，缓解腰酸乏力。', time: '60 分钟', cal: 260,
          ingredients: '猪腰 1 个、杜仲 15g、枸杞 10g、生姜 3 片。',
          suitable: '肾虚腰痛、腰膝酸软、耳鸣者。',
          steps: ['猪腰切片去白筋焯水', '与杜仲生姜同炖 40 分钟', '加枸杞再煮 10 分钟调味'],
          bvid: '' },

        // —— 祛湿 ——
        { id: 5, name: '赤小豆冬瓜汤', emoji: '🍲', cat: '祛湿',
          efficacy: '利水消肿，适合湿热体质。', time: '50 分钟', cal: 90,
          ingredients: '赤小豆 50g、冬瓜 200g、陈皮 3g。',
          suitable: '水肿、四肢沉重、湿气重者。',
          steps: ['赤小豆先煮 30 分钟', '加陈皮冬瓜煮 15 分钟', '少盐调味'],
          bvid: '' },
        { id: 13, name: '薏米茯苓茶', emoji: '🍵', cat: '祛湿',
          efficacy: '健脾渗湿，改善舌苔厚腻与面部出油。', time: '30 分钟', cal: 20,
          ingredients: '薏米 30g、茯苓 15g、炒麦芽 10g。',
          suitable: '湿气重、舌苔厚腻、大便黏腻者。',
          steps: ['薏米小火炒至微黄', '与茯苓麦芽同煎 20 分钟', '取汁代茶饮用'],
          bvid: '' },
        { id: 14, name: '陈皮砂仁粥', emoji: '🥣', cat: '祛湿',
          efficacy: '行气祛湿，适合湿阻中焦、脘腹胀闷。', time: '45 分钟', cal: 170,
          ingredients: '粳米 80g、陈皮 5g、砂仁 3g、生姜 2 片。',
          suitable: '湿气重、胃口差、腹胀恶心者。',
          steps: ['粳米煮粥 30 分钟', '加陈皮生姜再煮 10 分钟', '砂仁研末加入焖 3 分钟'],
          bvid: '' },

        // —— 安神 ——
        { id: 6, name: '酸枣仁安神饮', emoji: '🌿', cat: '安神',
          efficacy: '养心安神，改善睡眠质量。', time: '15 分钟', cal: 40,
          ingredients: '酸枣仁 10g、百合 10g、桂圆 5 颗。',
          suitable: '失眠多梦、心悸易醒者。',
          steps: ['酸枣仁捣碎', '与百合同煮 10 分钟', '加桂圆焖片刻'],
          bvid: '' },
        { id: 15, name: '莲子百合银耳粥', emoji: '🥣', cat: '安神',
          efficacy: '养心安神，适合心神不宁、夜寐不安。', time: '60 分钟', cal: 210,
          ingredients: '莲子 30g、百合 15g、银耳 1 朵、粳米 60g。',
          suitable: '心烦失眠、心神不宁、口舌生疮者。',
          steps: ['银耳泡发撕小朵', '与莲子百合同煮 40 分钟', '加粳米再煮 15 分钟至浓稠'],
          bvid: '' },

        // —— 补气 ——
        { id: 16, name: '黄芪党参乌鸡汤', emoji: '🐔', cat: '补气',
          efficacy: '补气健脾，增强免疫力。', time: '120 分钟', cal: 380,
          ingredients: '乌骨鸡 半只、黄芪 20g、党参 15g、红枣 8 枚。',
          suitable: '气虚乏力、容易感冒、病后体虚者。',
          steps: ['乌鸡焯水洗净', '与药材红枣同炖 1.5 小时', '出锅加盐调味'],
          bvid: '' },
        { id: 17, name: '四君子茶', emoji: '🍵', cat: '补气',
          efficacy: '补气健脾，为经典补气基础方。', time: '25 分钟', cal: 15,
          ingredients: '党参 10g、白术 10g、茯苓 10g、炙甘草 6g。',
          suitable: '脾胃气虚、乏力食少、大便偏稀者。',
          steps: ['药材捣碎装入茶包', '沸水煎煮 15 分钟', '取汁代茶，温服'],
          bvid: '' },

        // —— 养血 ——
        { id: 18, name: '当归羊肉汤', emoji: '🍲', cat: '养血',
          efficacy: '温经养血，适合气血不足、手脚冰凉。', time: '120 分钟', cal: 420,
          ingredients: '羊肉 400g、当归 15g、生姜 30g、红糖少许。',
          suitable: '血虚畏寒、手脚冰凉、经期腹痛者。',
          steps: ['羊肉焯水去膻', '与当归生姜同炖 1.5 小时', '出锅加红糖调味'],
          bvid: '' },
        { id: 19, name: '红枣桂圆小米粥', emoji: '🥣', cat: '养血',
          efficacy: '补气养血，适合贫血与产后调养。', time: '40 分钟', cal: 190,
          ingredients: '小米 80g、红枣 10 枚、桂圆 15g、红糖适量。',
          suitable: '气血不足、面色萎黄、月经量少者。',
          steps: ['小米淘净加水煮沸', '加红枣桂圆同煮 30 分钟', '出锅前加红糖化开'],
          bvid: '' },

        // —— 清热 ——
        { id: 20, name: '绿豆百合汤', emoji: '🫘', cat: '清热',
          efficacy: '清热解毒，消暑除烦。', time: '60 分钟', cal: 150,
          ingredients: '绿豆 100g、百合 20g、冰糖适量。',
          suitable: '夏季烦热、口舌生疮、咽喉肿痛者。',
          steps: ['绿豆提前浸泡 2 小时', '与百合同煮 40 分钟至开花', '加冰糖煮化，冰镇更佳'],
          bvid: '' },
        { id: 21, name: '金银花薄荷饮', emoji: '🍃', cat: '清热',
          efficacy: '疏风清热，适合风热感冒初起。', time: '10 分钟', cal: 10,
          ingredients: '金银花 15g、薄荷 6g、连翘 10g。',
          suitable: '风热感冒、咽喉红肿、目赤肿痛者。',
          steps: ['薄荷后下', '金银花连翘煎 8 分钟', '加薄荷再煎 2 分钟取汁'],
          bvid: '' },

        // —— 滋阴 ——
        { id: 22, name: '百合莲子鸭肉汤', emoji: '🦆', cat: '滋阴',
          efficacy: '滋阴润燥，适合阴虚内热、口干舌燥。', time: '120 分钟', cal: 340,
          ingredients: '鸭肉 400g、百合 15g、莲子 30g、沙参 12g。',
          suitable: '阴虚火旺、口干咽燥、夜间盗汗者。',
          steps: ['鸭肉焯水去油', '与药材同炖 1.5 小时', '出锅加盐调味'],
          bvid: '' },

        // —— 明目 ——
        { id: 23, name: '决明子枸杞茶', emoji: '👁', cat: '明目',
          efficacy: '清肝明目，缓解视疲劳与眼干。', time: '15 分钟', cal: 20,
          ingredients: '决明子 15g、枸杞 10g、菊花 5g。',
          suitable: '长期看屏幕、眼干酸涩、视力模糊者。',
          steps: ['决明子小火炒香', '与枸杞菊花同煎 10 分钟', '取汁代茶，可续 2-3 次'],
          bvid: '' },
        { id: 24, name: '桑椹枸杞粥', emoji: '🥣', cat: '明目',
          efficacy: '滋补肝肾，明目乌发。', time: '40 分钟', cal: 180,
          ingredients: '黑米 80g、干桑椹 20g、枸杞 10g、冰糖适量。',
          suitable: '肝肾不足、头晕目眩、视力减退者。',
          steps: ['黑米淘净浸泡 1 小时', '与桑椹同煮 30 分钟', '加枸杞冰糖再煮 5 分钟'],
          bvid: '' },

        // —— 养颜 ——
        { id: 25, name: '玫瑰花红枣饮', emoji: '🌹', cat: '养颜',
          efficacy: '疏肝理气，活血养颜。', time: '10 分钟', cal: 25,
          ingredients: '干玫瑰花 8 朵、红枣 6 枚、枸杞 10g。',
          suitable: '情绪不畅、面色暗淡、黄褐斑者。',
          steps: ['红枣去核切半', '与玫瑰枸杞沸水冲泡', '焖 5 分钟即可饮用'],
          bvid: '' },
        { id: 26, name: '桃胶雪燕炖奶', emoji: '🧋', cat: '养颜',
          efficacy: '滋阴润燥，美容养颜。', time: '30 分钟 + 泡发', cal: 180,
          ingredients: '桃胶 15g、雪燕 5g、牛奶 200ml、冰糖适量。',
          suitable: '皮肤干燥、暗沉无光、追求养颜者。',
          steps: ['桃胶泡发 12 小时去杂质', '雪燕泡发 6 小时', '加牛奶冰糖炖 15 分钟'],
          bvid: 'BV1ZTUUBQEF1' }
      ]
    }
  },
  computed: {
    filtered() {
      if (this.activeCat === '全部') return this.recipes
      return this.recipes.filter((r) => r.cat === this.activeCat)
    },
    current() {
      return this.recipes.find((r) => r.id === this.open) || {}
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
.filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
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
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.card {
  background: #fff;
  border-radius: 14px;
  padding: 18px;
  display: flex;
  gap: 14px;
  cursor: pointer;
  box-shadow: 0 4px 18px rgba(47, 93, 80, 0.06);
  transition: transform 0.18s, box-shadow 0.18s;
}
.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(47, 93, 80, 0.12);
}
.card-emoji {
  font-size: 40px;
  flex-shrink: 0;
}
.card-body {
  flex: 1;
}
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-top h3 {
  margin: 0;
  font-size: 16px;
  color: #2f5d50;
}
.card-tag {
  background: #dcefe5;
  color: #2f5d50;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 12px;
}
.card-desc {
  font-size: 13px;
  color: #7a8a82;
  margin: 8px 0;
  line-height: 1.5;
}
.card-foot {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: #9aa9a1;
  flex-wrap: wrap;
}
.video-badge {
  color: #e07a2f;
  background: #fff4e6;
  padding: 1px 8px;
  border-radius: 10px;
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 40, 34, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.modal {
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  width: 520px;
  max-width: 92vw;
  max-height: 86vh;
  overflow-y: auto;
  position: relative;
}
.modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  border: none;
  background: #f1f4f1;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  cursor: pointer;
}
.modal-emoji {
  font-size: 52px;
  text-align: center;
}
.modal h2 {
  text-align: center;
  margin: 6px 0;
  color: #2f5d50;
}
.modal-eff {
  text-align: center;
  color: #7a8a82;
  font-size: 14px;
}
.modal h4 {
  color: #2f5d50;
  margin: 16px 0 6px;
}
.modal p {
  font-size: 14px;
  color: #3c4a44;
  line-height: 1.6;
}
.modal ol {
  padding-left: 20px;
  font-size: 14px;
  color: #3c4a44;
  line-height: 1.8;
}

/* B 站视频播放器 */
.video-section {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px dashed #e0e8e2;
}
.bilibili-wrap {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 10px;
  overflow: hidden;
}
.video-iframe {
  width: 100%;
  height: 100%;
  display: block;
}
.video-source {
  margin-top: 8px;
  font-size: 12px;
  color: #9aa9a1;
  text-align: center;
}
.video-source a {
  color: #2f5d50;
  text-decoration: none;
}
.video-source a:hover {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
    gap: 12px;
  }
  .card {
    padding: 14px;
  }
  .modal-mask {
    align-items: flex-end;
  }
  .modal {
    width: 100%;
    max-width: 100%;
    max-height: 88vh;
    border-radius: 16px 16px 0 0;
    padding: 20px 16px calc(20px + env(safe-area-inset-bottom));
  }
}
</style>
