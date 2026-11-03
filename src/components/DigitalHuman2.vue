<template>
  <!-- 悬浮头像按钮（可拖拽） -->
  <div
    v-show="!expanded"
    ref="floatBtn"
    class="floating-avatar"
    :class="{ listening: recording, speaking: speaking, bounce: hasNewMsg, dragging: isDragging }"
    :style="floatStyle"
    @mousedown.prevent="onDragStart"
    @touchstart.prevent="onTouchStart"
    @click="onClickToggle"
    title="小颐 · 养生顾问"
  >
    <!-- 小颐形象（保持原图）+ 基础动作：点头 / 歪头 / 说话点头 / 倾听前倾 / 呼吸 -->
    <div class="xy-anim" :class="animClass">
      <img src="assets/xiaoyi.png" alt="小颐" draggable="false" />
    </div>
    <span v-if="recording" class="floating-badge rec">●</span>
    <span v-else-if="hasNewMsg" class="floating-badge dot"></span>
    <!-- 录音声波指示 -->
    <div v-if="recording" class="xy-soundbars">
      <i></i><i></i><i></i>
    </div>
    <!-- AI 思考气泡 -->
    <div v-if="aiThinking" class="xy-think-bubble">···</div>
  </div>

  <!-- 展开的数字人对话工作台（三栏：形象 / 对话 / 辅助） -->
  <transition name="chat-fade">
    <div v-show="expanded"
         ref="chatPanel"
         class="chat-panel"
         :style="panelStyle">
      <!-- 顶部标题栏（拖拽把手） -->
      <div class="chat-head"
           :class="{ drag: panelDragging }"
           @mousedown.prevent="onPanelDragStart"
           @touchstart.prevent="onPanelTouchStart"
           title="按住拖动移动面板">
        <div class="chat-head-left">
          <span class="head-ico">🧑‍⚕️</span>
          <div>
            <div class="chat-head-name">小颐 · 数字人工作台</div>
            <div class="chat-head-sub">养生顾问 <span class="drag-hint">💫 拖动顶部可移动</span></div>
          </div>
        </div>
        <button class="chat-close" @click="toggle" title="收起">✕</button>
      </div>

      <div class="dh-layout">
        <!-- 左栏：数字人形象 -->
        <aside class="dh-left">
          <div class="dh-card-head">
            <span>🧑‍⚕️ 数字人交互</span>
            <span class="dh-online">在线</span>
          </div>
          <div class="dh-stage">
              <div class="xy-anim" :class="animClass" :style="{ opacity: avatarOpacity / 100 }">
                <div class="xy-fig">
                  <img src="assets/xiaoyi_front.png" alt="小颐数字人" draggable="false" />
                  <!-- 讲话时的半身数字人视频：Canvas 按轮廓遮罩实时合成，与全身立绘对齐 -->
                  <canvas v-show="speaking" ref="talkCanvas" class="xy-talk" width="636" height="606"></canvas>
                  <video ref="talkVideo" class="xy-talk-src" src="assets/xiaoyi_talk.webm?v=2"
                         muted loop playsinline preload="auto"></video>
                </div>
              </div>
            <span v-if="speaking" class="dh-stage-tag">🔊 播报中</span>
            <span v-else-if="recording" class="dh-stage-tag rec">● 聆听中</span>
            <span v-else-if="aiThinking" class="dh-stage-tag think">💭 思考中</span>
          </div>
          <div class="dh-ctrl">
            <div class="dh-opacity-row">
              <span class="dh-ctrl-label">👁 透明度</span>
              <input type="range" min="30" max="100" v-model.number="avatarOpacity" class="dh-range" />
              <span class="dh-ctrl-val">{{ avatarOpacity }}%</span>
            </div>
            <div class="dh-actions">
              <button class="dh-act-btn" @click="greet">👋 打招呼</button>
              <button class="dh-act-btn" @click="_nodOnce">🙂 点头</button>
            </div>
          </div>
        </aside>

        <!-- 中栏：对话主区 -->
        <section class="dh-main">
          <div class="dh-main-head">
            <span class="dh-main-title">养生对话框</span>
            <span class="dh-conn"><i class="dot"></i> 数字人已连接</span>
            <div class="dh-main-tools">
              <button class="dh-tool" :class="{ on: voiceOn }" @click="voiceOn = !voiceOn"
                :title="voiceOn ? '关闭语音朗读' : '开启语音朗读'">
                🔊 语音朗读{{ voiceOn ? '开' : '关' }}
              </button>
              <button class="dh-tool" @click="stopSpeak" title="停止播报">⏹</button>
              <button class="dh-tool" @click="clearChat" title="清空对话">🗑</button>
              <button class="dh-tool" :class="{ on: !!ttsCfg }" @click="openTtsSettings"
                :title="ttsCfg ? '当前音色：豆包 TTS' : '当前音色：浏览器语音，点击可配置豆包 TTS'">🎙</button>
            </div>
          </div>

          <div class="dh-status">
            <span v-if="aiCallStage">{{ aiCallStage }}</span>
            <span v-else-if="speaking">🔊 正在播报…</span>
            <span v-else-if="recording">● 正在聆听…说完点「停止录音」，文字会留在下方识别区</span>
            <span v-else>👋 你好，我是小颐，打字 / 语音 / 传图都可以～</span>
          </div>

          <div class="chat-body" ref="chatBox">
            <div
              v-for="(m, i) in messages"
              :key="i"
              class="msg"
              :class="m.from === 'user' ? 'msg-user' : 'msg-bot'"
            >
              <img v-if="m.from === 'bot'" src="assets/xiaoyi_front.png" class="msg-avatar-img" alt="小颐" />
              <div class="msg-bubble">
                <img v-if="m.image" :src="m.image" class="msg-image" alt="上传的图片" />
                {{ m.text }}
              </div>
            </div>
          </div>

          <!-- 语音识别结果 / 输入区 -->
          <div class="dh-asr" :class="{ active: recording }">
            <div class="dh-asr-head">
              <span>🎤 语音识别结果</span>
              <div class="dh-asr-tools">
                <input
                  type="file"
                  accept="image/*"
                  class="hidden-file-input"
                  ref="fileInput"
                  @change="handleImage"
                />
                <button class="dh-mini" :disabled="aiThinking" @click="$refs.fileInput.click()" title="上传图片给小颐">🖼️</button>
                <button class="dh-mini" @click="inputText = ''" title="清空输入">清空</button>
              </div>
            </div>
            <textarea
              v-model="inputText"
              class="dh-asr-text"
              rows="2"
              :placeholder="pendingImage ? '已选图片，可补充描述后发送…' : (recording ? '正在聆听…' : '语音识别结果会显示在这里，也可以直接打字（Enter 发送）…')"
              @keydown.enter.exact.prevent="send"
            ></textarea>
          </div>

          <!-- 图片预览区 -->
          <div v-if="pendingImage" class="pending-image-row">
            <img :src="pendingImage" class="pending-thumb" alt="待发送图片" />
            <span class="pending-name">{{ pendingFileName }}</span>
            <button class="pending-clear" @click="clearPendingImage" title="移除图片">✕</button>
          </div>

          <!-- 主操作按钮 -->
          <div class="dh-btn-row">
            <button class="dh-btn rec" :class="{ stop: recording, disabled: !supportsSpeech }"
              :title="recording ? '点击停止识别' : '点击开始语音识别'" @click="toggleRecord">
              {{ recording ? '⏹ 停止录音' : '🎤 开始录音' }}
            </button>
            <button class="dh-btn send" :disabled="aiThinking" @click="send">📨 发送</button>
          </div>

          <!-- 豆包 TTS 音色设置浮层 -->
          <div v-if="showTtsSettings" class="tts-mask" @click.self="showTtsSettings = false">
            <div class="tts-pop">
              <div class="tts-pop-head">
                <span>🎙 音色设置</span>
                <button class="tts-close" @click="showTtsSettings = false">✕</button>
              </div>
              <p class="tts-tip">配置后小颐将使用豆包（火山引擎 TTS）声音；未配置时自动使用浏览器中文女声。</p>
              <label class="tts-field">
                <span>AppID</span>
                <input v-model.trim="ttsForm.appid" type="text" placeholder="火山引擎 TTS AppID" />
              </label>
              <label class="tts-field">
                <span>Access Token</span>
                <input v-model.trim="ttsForm.token" type="password" placeholder="火山引擎 TTS Access Token" />
              </label>
              <label class="tts-field">
                <span>音色</span>
                <select v-model="ttsForm.voice">
                  <option v-for="v in doubaoVoices" :key="v.id" :value="v.id">{{ v.name }}</option>
                </select>
              </label>
              <div class="tts-actions">
                <button class="tts-btn ghost" @click="clearTts">恢复浏览器音色</button>
                <button class="tts-btn primary" @click="saveTts">保存</button>
              </div>
            </div>
          </div>
        </section>

        <!-- 右栏：辅助信息 -->
        <aside class="dh-right">
          <div class="dh-side-card grow">
            <div class="dh-side-head">⚡ 快捷话题</div>
            <div class="dh-topics">
              <button v-for="t in topics" :key="t.q" class="dh-topic" @click="ask(t)">{{ t.q }}</button>
            </div>
          </div>
          <div class="dh-side-card">
            <div class="dh-side-head">🌿 日常养生要点</div>
            <ul class="dh-tips">
              <li>尽量 23 点前入睡，不熬夜</li>
              <li>三餐规律，七分饱，少冰少炸</li>
              <li>每天微汗运动 30 分钟</li>
              <li>少生气少焦虑，情志舒畅</li>
              <li>久坐 45 分钟起身活动</li>
            </ul>
          </div>
          <div class="dh-side-card">
            <div class="dh-side-head">📟 服务状态</div>
            <div class="dh-status-line">{{ aiThinking ? '🤔 AI 分析中…' : (speaking ? '🔊 语音播报中' : (recording ? '🎤 语音识别中' : '✅ 待命中')) }}</div>
          </div>
        </aside>
      </div>
    </div>
  </transition>
</template>

<script>
import { speakText, stopText, loadTtsConfig, saveTtsConfig, DOUBAO_VOICES } from '../utils/ttsService'

const TOPICS = [
  { q: '失眠怎么办？', a: '【失眠调理】中医认为失眠多与心肝火旺、心脾两虚有关。\n🌙 起居：睡前1小时远离手机，用40℃温水泡脚15分钟；\n🍵 食疗：酸枣仁莲子粥、桂圆百合汤助眠；\n💆 穴位：按揉神门穴、内关穴各3分钟；\n🧘 配合「睡前正念冥想」课程效果更佳。' },
  { q: '脾胃不好吃什么？', a: '【脾胃调理】脾主运化，胃主受纳，脾胃不和则百病生。\n🍲 食疗：四神汤（茯苓、莲子、芡实、山药）健脾祛湿；小米南瓜粥养胃；\n💆 穴位：常按足三里、中脘穴，饭后顺时针摩腹36圈；\n🚫 忌：生冷瓜果、肥甘厚腻、暴饮暴食；\n🧘 建议：每餐七分饱，细嚼慢咽。' },
  { q: '肩颈酸痛如何缓解？', a: '【颈肩腰调理】久坐伤肉，经络瘀滞则僵痛。\n🧘 跟练：推荐「办公室肩颈舒缓瑜伽」课程，每天15分钟；\n💆 穴位：按揉肩井穴、风池穴、后溪穴；\n🪑 工作：每45分钟起身活动，调整桌椅高度，屏幕与视线平齐；\n♨️ 热敷：睡前热敷肩颈10分钟促进循环。' },
  { q: '怎么调理气血？', a: '【气血调养】气为血之帅，血为气之母，气血双补是关键。\n🍲 食疗：黄芪党参乌鸡汤、红枣阿胶糕、桂圆红枣鸡蛋糖水；\n💆 穴位：常按三阴交、血海穴；\n😴 睡眠是最好的补血方式，23点前务必入睡；\n🚫 经期避免节食减肥与剧烈运动。' }
]

const KB = [
  { keys: ['失眠', '睡不着', '入睡困难', '多梦', '早醒', '睡眠差', '睡不好', '翻来覆去'],
    reply: '【失眠调理】中医认为失眠多与心肝火旺、心脾两虚有关。\n🌙 起居：睡前1小时远离手机，用40℃温水泡脚15分钟；\n🍵 食疗：酸枣仁莲子粥、桂圆百合汤助眠；\n💆 穴位：按揉神门穴、内关穴各3分钟；\n🧘 配合「睡前正念冥想」课程效果更佳。' },
  { keys: ['疲劳', '累', '乏力', '没劲', '疲惫', '困倦', '嗜睡', '气短'],
    reply: '【疲劳调理】多是气虚所致，气不足则神疲乏力。\n🍚 食疗：黄芪党参乌鸡汤、山药薏米粥补中益气；\n💆 穴位：艾灸足三里、气海穴，每天10分钟；\n🏃 运动：八段锦「两手托天理三焦」，晨起练习5分钟；\n😴 作息：23点前入睡，避免过度耗气。' },
  { keys: ['脾胃', '胃胀', '胃痛', '消化不良', '没胃口', '腹胀', '腹泻', '拉肚子', '便秘', '反酸'],
    reply: '【脾胃调理】脾主运化，胃主受纳，脾胃不和则百病生。\n🍲 食疗：四神汤健脾祛湿；小米南瓜粥养胃；\n💆 穴位：常按足三里、中脘穴，饭后顺时针摩腹36圈；\n🚫 忌：生冷瓜果、肥甘厚腻、暴饮暴食。' },
  { keys: ['头痛', '头疼', '偏头痛', '头晕', '头昏', '太阳穴疼'],
    reply: '【头痛调理】肝阳上亢多胀痛，血虚多隐痛，痰湿多昏重。\n💆 穴位：按揉太阳穴、风池穴、合谷穴各2分钟；\n🍵 食疗：菊花决明子茶清肝明目；当归红枣茶养血；\n😴 保证充足睡眠，避免长时间低头；\n⚠️ 突发剧烈头痛请及时就医。' },
  { keys: ['焦虑', '郁闷', '烦躁', '压力大', '心情不好', '抑郁', '心慌', '易怒'],
    reply: '【情志调理】肝主疏泄，情绪不畅则肝气郁结。\n🧘 疏解：玫瑰花陈皮茶疏肝理气；八段锦「攒拳怒目增气力」发泄情绪；\n💆 穴位：太冲穴（消气穴）、膻中穴各按3分钟；\n🚶 运动：每日快走30分钟，晒晒太阳。' },
  { keys: ['咳嗽', '感冒', '嗓子疼', '喉咙痛', '咽喉', '有痰', '干咳', '鼻塞'],
    reply: '【肺系调理】肺为娇脏，易受外邪侵袭。\n🍐 食疗：冰糖雪梨羹润肺止咳；川贝炖雪梨适合干咳；罗汉果茶利咽；\n💆 穴位：按揉列缺穴、尺泽穴；\n🧣 起居：注意颈部保暖，避免辛辣刺激。' },
  { keys: ['怕冷', '手脚冰凉', '宫寒', '阳虚', '腰膝酸冷', '畏寒'],
    reply: '【阳虚调理】阳气不足则畏寒肢冷，需要温补阳气。\n🍲 食疗：当归生姜羊肉汤温阳散寒；红枣桂圆姜茶暖身；\n💆 穴位：艾灸关元、命门穴，睡前搓热腰眼；\n🚫 忌：冷饮、冰品、生冷海鲜。' },
  { keys: ['气血', '贫血', '气色差', '脸色差', '面色发黄', '月经量少'],
    reply: '【气血调养】气为血之帅，血为气之母。\n🍲 食疗：黄芪党参乌鸡汤、红枣阿胶糕、桂圆红枣鸡蛋糖水；\n💆 穴位：常按三阴交、血海穴；\n😴 23点前务必入睡。' },
  { keys: ['上火', '口臭', '口腔溃疡', '长痘', '牙龈肿', '目赤'],
    reply: '【清热降火】实火宜清，虚火宜滋。\n🍵 食疗：金银花茶、绿豆汤清实火；麦冬石斛茶滋阴降虚火；\n🥗 多吃苦瓜、芹菜、冬瓜，少食辛辣烧烤；\n💆 穴位：按揉内庭穴、曲池穴泄热；\n😴 熬夜最易上火，务必23点前入睡。' },
  { keys: ['减肥', '瘦', '肥胖', '减脂', '瘦身'],
    reply: '【体重管理】中医减肥重在健脾祛湿、化痰消脂，而非单纯节食。\n🍵 饮品：薏米红豆水祛湿、决明子山楂茶消脂；\n🏃 运动：每日经络拍打操+快走40分钟；\n🥗 饮食：三分饥与寒，晚餐七分饱，忌夜宵；\n💆 穴位：按揉丰隆穴（化痰要穴）、天枢穴。' },
  { keys: ['肩颈', '颈椎', '腰痛', '腰酸', '久坐', '鼠标手', '脖子疼'],
    reply: '【颈肩腰调理】久坐伤肉，经络瘀滞则僵痛。\n🧘 跟练：「办公室肩颈舒缓瑜伽」课程，每天15分钟；\n💆 穴位：按揉肩井穴、风池穴、后溪穴；\n🪑 每45分钟起身活动，屏幕与视线平齐；\n♨️ 睡前热敷肩颈10分钟。' },
  { keys: ['痛经', '月经', '经期', '例假', '妇科'],
    reply: '【经期调养】寒凝则痛，气滞则胀，温经散寒是根本。\n🍲 经前一周：艾叶红糖鸡蛋汤温经暖宫；避免冷饮；\n💆 穴位：按揉三阴交、关元穴，热水袋敷小腹；\n🧘 经期宜静养，避免剧烈运动。' },
  { keys: ['湿气', '湿气重', '水肿', '舌苔厚', '大便黏', '身体沉重'],
    reply: '【祛湿调理】湿性黏浊，健脾是祛湿之本。\n🍲 食疗：薏米红豆水、赤小豆冬瓜汤、茯苓白术鸡汤；\n🚫 少吃甜腻、生冷、油炸食物，少饮酒；\n💆 穴位：常按阴陵泉、丰隆穴；\n🏃 每天微汗运动30分钟。' },
  { keys: ['免疫力', '体质差', '容易感冒', '反复感冒', '抵抗力'],
    reply: '【增强体质】正气存内，邪不可干。\n🍲 食疗：黄精枸杞炖乳鸽、虫草花炖老鸭汤固本培元；\n🏃 运动：坚持八段锦，循序渐进；\n😴 睡眠充足、心情舒畅是免疫力的基石。' },
  { keys: ['眼睛', '干眼', '视疲劳', '近视', '眼干', '眼涩'],
    reply: '【养肝明目】肝开窍于目，久视伤血。\n🍵 食疗：枸杞菊花茶、决明子茶清肝明目；多吃蓝莓、胡萝卜；\n💆 穴位：眼保健操轮刮眼眶，按揉睛明穴、太冲穴；\n📱 每用眼40分钟远眺5分钟；\n😴 晚上11点前睡，肝血充足目自明。' },
  { keys: ['养生', '调理身体', '保养', '健康'],
    reply: '中医养生讲究「治未病」，顺天时、养正气。给你几个日常要点：\n🌅 作息：尽量23点前睡，早上7点左右起，不熬夜、不赖床；\n🍱 饮食：三餐规律，荤素搭配，少冰少炸，七分饱；\n🏃 运动：每天微汗运动30分钟，八段锦/快走/瑜伽都好；\n😌 情志：少生气、少焦虑，保持心情舒畅；\n📍 想针对具体问题咨询？比如失眠、脾胃、颈椎、上火…我可以给你更针对性的建议～' }
]

const FALLBACK_REPLY = '谢谢你的提问。我是养生顾问小颐 🌿\n我擅长失眠、疲劳、脾胃、气血、祛湿、肩颈、情志等日常调理建议。\n\n你可以试着问我：\n🌙 最近失眠怎么办？\n🍲 脾胃不好吃什么？\n💆 肩颈酸痛如何缓解？\n\n也可以点击下方快捷话题快速了解～'

export default {
  name: 'DigitalHuman',
  data() {
    return {
      expanded: false,
      topics: TOPICS,
      messages: [
        { from: 'bot', text: '你好呀～我是养生顾问小颐 🌿\n可以打字或点麦克风跟我聊天，有养生问题随时问我～' }
      ],
      inputText: '',
      interimText: '',
      speaking: false,
      voiceOn: true,
      /* TTS 音色设置（豆包 / 浏览器回退） */
      showTtsSettings: false,
      ttsCfg: null,
      ttsForm: { appid: '', token: '', cluster: 'volcano_tts', voice: DOUBAO_VOICES[0].id },
      doubaoVoices: DOUBAO_VOICES,
      recording: false,
      aiThinking: false,
      aiCallStage: '',
      keepsSpeaking: null,
      recognition: null,
      keepListening: false,
      supportsSpeech: false,
      hasNewMsg: false,
      openTimer: null,
      /* 数字人动作状态 */
      headAction: '',      // 头部动作：nod / tilt / ''
      avatarOpacity: 100,  // 工作台左栏形象透明度（30~100）
      /* 图片上传 */
      pendingImage: '',       // base64 data URL
      pendingFileName: '',
      /* 拖拽状态 */
      isDragging: false,
      moved: false,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
      floatPos: null, // { left, top } 自定义位置；null 表示用 CSS 默认（右下角）
      /* 聊天面板拖拽 */
      panelPos: null,
      panelDragging: false,
      panelMoved: false,
      pStartX: 0,
      pStartY: 0,
      pOffsetX: 0,
      pOffsetY: 0
    }
  },
  watch: {
    expanded(val) {
      if (val) {
        this.hasNewMsg = false
        this.$nextTick(() => this.scrollBottom())
      }
    },
    /* 播报开始/结束：启动或停止半身讲话视频合成 */
    speaking(val) {
      if (val) this._startTalkVideo()
      else this._stopTalkVideo()
    }
  },
  computed: {
    floatStyle() {
      if (!this.floatPos) return {}
      return { left: this.floatPos.left + 'px', top: this.floatPos.top + 'px' }
    },
    /* 形象动作类：说话点头 > 录音前倾 > 随机点头/歪头 */
    animClass() {
      return {
        nod: this.headAction === 'nod' && !this.speaking && !this.recording,
        tilt: this.headAction === 'tilt' && !this.speaking && !this.recording,
        talking: this.speaking,
        listening: this.recording
      }
    },
    panelStyle() {
      if (!this.panelPos) return {}
      return { left: this.panelPos.left + 'px', top: this.panelPos.top + 'px', right: 'auto', bottom: 'auto' }
    }
  },
  created() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    this.supportsSpeech = !!SR
    try {
      const saved = localStorage.getItem('zy_float_pos')
      if (saved) this.floatPos = JSON.parse(saved)
      const savedPanel = localStorage.getItem('zy_panel_pos')
      if (savedPanel) this.panelPos = JSON.parse(savedPanel)
      // 恢复历史聊天记录（只存了文字，图片不持久化）
      const savedChat = localStorage.getItem('zy_xiaoyi_chat')
      if (savedChat) {
        const arr = JSON.parse(savedChat)
        if (Array.isArray(arr) && arr.length) this.messages = arr
      }
    } catch (_) { /* noop */ }
    setTimeout(() => {
      this.hasNewMsg = true
      setTimeout(() => { if (!this.expanded) this.hasNewMsg = false }, 3500)
    }, 1500)
  },
  mounted() {
    // 读取豆包 TTS 配置 + 启动随机小动作（点头/歪头）
    this.ttsCfg = loadTtsConfig()
    this._scheduleIdle()
    this._initTalkVideo()
  },
  beforeUnmount() {
    this.stopSpeak()
    this.stopRecord()
    this._stopTalkVideo()
    if (this.openTimer) clearTimeout(this.openTimer)
    this._cleanupDragListeners()
    this._cleanupPanelDragListeners()
    // 清理数字人动作定时器
    if (this._idleTimer) clearTimeout(this._idleTimer)
    if (this._headTimer) clearTimeout(this._headTimer)
  },
  methods: {
    toggle() {
      this.expanded = !this.expanded
      if (this.expanded) {
        this._nodOnce() // 点开对话点头回应
      } else {
        this.stopSpeak()
        this.stopRecord()
      }
    },
    /* ===== 数字人动作 ===== */
    /* 初始化讲话视频资源：把黑白轮廓遮罩转换为「alpha 遮罩」（白=不透明身体，黑=透明背景） */
    _initTalkVideo() {
      this._talkRaf = 0
      this._talkAmp = 0
      this._maskCanvas = null
      const img = new Image()
      img.onload = () => {
        const mc = document.createElement('canvas')
        mc.width = img.width
        mc.height = img.height
        const mctx = mc.getContext('2d')
        mctx.drawImage(img, 0, 0)
        const imgData = mctx.getImageData(0, 0, mc.width, mc.height)
        const px = imgData.data
        // canvas 合成只认 alpha：把亮度直接写入 alpha 通道
        for (let i = 0; i < px.length; i += 4) px[i + 3] = px[i]
        mctx.putImageData(imgData, 0, 0)
        this._maskCanvas = mc
      }
      img.src = 'assets/xiaoyi_talk_matte.png'
    },
    /* 播报中：播放半身讲话视频，按 alpha 遮罩实时合成到 canvas（背景透明，露出下层全身立绘） */
    _startTalkVideo() {
      const canvas = this.$refs.talkCanvas
      const video = this.$refs.talkVideo
      if (!canvas || !video) return
      const ctx = canvas.getContext('2d')
      try { video.currentTime = 0 } catch (_) { /* noop */ }
      const p = video.play()
      if (p) p.catch(() => {})
      const loop = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        if (this._maskCanvas && video.readyState >= 2) {
          // 语速跟随语音振幅：音量大→口型切换快（1.0~1.8 倍），静音段也保持持续张合
          const amp = this._talkAmp || 0
          const target = 1.0 + amp * 0.8
          video.playbackRate += (target - video.playbackRate) * 0.2
          ctx.drawImage(this._maskCanvas, 0, 0, canvas.width, canvas.height)
          ctx.globalCompositeOperation = 'source-in'
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          ctx.globalCompositeOperation = 'source-over'
        }
        this._talkRaf = requestAnimationFrame(loop)
      }
      this._talkRaf = requestAnimationFrame(loop)
    },
    /* 停止讲话视频：暂停、清空画布，恢复静态全身立绘 */
    _stopTalkVideo() {
      if (this._talkRaf) cancelAnimationFrame(this._talkRaf)
      this._talkRaf = 0
      this._talkAmp = 0
      const video = this.$refs.talkVideo
      if (video) {
        video.pause()
        video.playbackRate = 1
      }
      const canvas = this.$refs.talkCanvas
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    },
    /* 待机小动作：每 6~11s 随机点头或歪头 */
    _scheduleIdle() {
      this._idleTimer = setTimeout(() => {
        if (!this.expanded && !this.speaking && !this.recording && !this.aiThinking) {
          this.headAction = Math.random() < 0.5 ? 'nod' : 'tilt'
          if (this._headTimer) clearTimeout(this._headTimer)
          this._headTimer = setTimeout(() => { this.headAction = '' }, 1200)
        }
        this._scheduleIdle()
      }, 6000 + Math.random() * 5000)
    },
    /* 点头一次（点击回应） */
    _nodOnce() {
      this.headAction = 'nod'
      if (this._headTimer) clearTimeout(this._headTimer)
      this._headTimer = setTimeout(() => { this.headAction = '' }, 1000)
    },
    /* 打招呼：点头 + 播报欢迎语（避免重复刷屏） */
    greet() {
      this._nodOnce()
      const greeted = this.messages.some(m => m.text.indexOf('你好呀～我是养生顾问小颐') !== -1)
      if (!greeted) {
        this.reply('你好呀～我是养生顾问小颐 🌿\n可以打字、语音或传图问我养生问题哦～')
      }
    },
    onClickToggle() {
      // 移动超过 5px 视为拖拽，不触发点击
      if (!this.moved) this.toggle()
    },
    /* ===== 拖拽（鼠标） ===== */
    onDragStart(e) {
      this.isDragging = true
      this.moved = false
      this.startX = e.clientX
      this.startY = e.clientY
      const rect = this.$refs.floatBtn.getBoundingClientRect()
      // 如果没有自定义位置，先把默认右下角换算成 top/left
      if (!this.floatPos) {
        this.floatPos = { left: rect.left, top: rect.top }
      }
      this.offsetX = this.startX - this.floatPos.left
      this.offsetY = this.startY - this.floatPos.top
      window.addEventListener('mousemove', this._onDragMove)
      window.addEventListener('mouseup', this._onDragEnd)
    },
    _onDragMove(e) {
      const dx = e.clientX - this.startX
      const dy = e.clientY - this.startY
      if (!this.moved && Math.abs(dx) + Math.abs(dy) > 5) this.moved = true
      const left = e.clientX - this.offsetX
      const top = e.clientY - this.offsetY
      this._applyPos(left, top)
    },
    _onDragEnd() {
      this.isDragging = false
      window.removeEventListener('mousemove', this._onDragMove)
      window.removeEventListener('mouseup', this._onDragEnd)
      this._persistPos()
    },
    /* ===== 拖拽（触摸） ===== */
    onTouchStart(e) {
      const t = e.touches[0]
      this.isDragging = true
      this.moved = false
      this.startX = t.clientX
      this.startY = t.clientY
      const rect = this.$refs.floatBtn.getBoundingClientRect()
      if (!this.floatPos) {
        this.floatPos = { left: rect.left, top: rect.top }
      }
      this.offsetX = t.clientX - this.floatPos.left
      this.offsetY = t.clientY - this.floatPos.top
      window.addEventListener('touchmove', this._onTouchMove, { passive: false })
      window.addEventListener('touchend', this._onTouchEnd)
    },
    _onTouchMove(e) {
      e.preventDefault()
      const t = e.touches[0]
      const dx = t.clientX - this.startX
      const dy = t.clientY - this.startY
      if (!this.moved && Math.abs(dx) + Math.abs(dy) > 5) this.moved = true
      const left = t.clientX - this.offsetX
      const top = t.clientY - this.offsetY
      this._applyPos(left, top)
    },
    _onTouchEnd() {
      this.isDragging = false
      window.removeEventListener('touchmove', this._onTouchMove)
      window.removeEventListener('touchend', this._onTouchEnd)
      this._persistPos()
    },
    _applyPos(left, top) {
      // 限制在可视区域内
      const el = this.$refs.floatBtn
      if (!el) return
      const w = el.offsetWidth
      const h = el.offsetHeight
      const maxL = window.innerWidth - w - 6
      const maxT = window.innerHeight - h - 6
      const minL = 6
      const minT = 6
      const clampedL = Math.max(minL, Math.min(maxL, left))
      const clampedT = Math.max(minT, Math.min(maxT, top))
      this.floatPos = { left: clampedL, top: clampedT }
    },
    _persistPos() {
      if (!this.floatPos) return
      try { localStorage.setItem('zy_float_pos', JSON.stringify(this.floatPos)) } catch (_) { /* noop */ }
    },
    _cleanupDragListeners() {
      window.removeEventListener('mousemove', this._onDragMove)
      window.removeEventListener('mouseup', this._onDragEnd)
      window.removeEventListener('touchmove', this._onTouchMove)
      window.removeEventListener('touchend', this._onTouchEnd)
    },
    /* ===== 聊天面板拖拽（拖头部） ===== */
    onPanelDragStart(e) {
      // 点到关闭按钮不拖
      if (e.target.closest('.chat-close')) return
      this.panelDragging = true
      this.panelMoved = false
      this.pStartX = e.clientX
      this.pStartY = e.clientY
      const rect = this.$refs.chatPanel.getBoundingClientRect()
      if (!this.panelPos) this.panelPos = { left: rect.left, top: rect.top }
      this.pOffsetX = this.pStartX - this.panelPos.left
      this.pOffsetY = this.pStartY - this.panelPos.top
      window.addEventListener('mousemove', this._onPanelDragMove)
      window.addEventListener('mouseup', this._onPanelDragEnd)
    },
    _onPanelDragMove(e) {
      const dx = e.clientX - this.pStartX
      const dy = e.clientY - this.pStartY
      if (!this.panelMoved && Math.abs(dx) + Math.abs(dy) > 5) this.panelMoved = true
      const left = e.clientX - this.pOffsetX
      const top = e.clientY - this.pOffsetY
      this._applyPanelPos(left, top)
    },
    _onPanelDragEnd() {
      this.panelDragging = false
      window.removeEventListener('mousemove', this._onPanelDragMove)
      window.removeEventListener('mouseup', this._onPanelDragEnd)
      this._persistPanelPos()
    },
    onPanelTouchStart(e) {
      if (e.target.closest('.chat-close')) return
      const t = e.touches[0]
      this.panelDragging = true
      this.panelMoved = false
      this.pStartX = t.clientX
      this.pStartY = t.clientY
      const rect = this.$refs.chatPanel.getBoundingClientRect()
      if (!this.panelPos) this.panelPos = { left: rect.left, top: rect.top }
      this.pOffsetX = t.clientX - this.panelPos.left
      this.pOffsetY = t.clientY - this.panelPos.top
      window.addEventListener('touchmove', this._onPanelTouchMove, { passive: false })
      window.addEventListener('touchend', this._onPanelTouchEnd)
    },
    _onPanelTouchMove(e) {
      e.preventDefault()
      const t = e.touches[0]
      const dx = t.clientX - this.pStartX
      const dy = t.clientY - this.pStartY
      if (!this.panelMoved && Math.abs(dx) + Math.abs(dy) > 5) this.panelMoved = true
      const left = t.clientX - this.pOffsetX
      const top = t.clientY - this.pOffsetY
      this._applyPanelPos(left, top)
    },
    _onPanelTouchEnd() {
      this.panelDragging = false
      window.removeEventListener('touchmove', this._onPanelTouchMove)
      window.removeEventListener('touchend', this._onPanelTouchEnd)
      this._persistPanelPos()
    },
    _applyPanelPos(left, top) {
      const el = this.$refs.chatPanel
      if (!el) return
      const w = el.offsetWidth
      const h = el.offsetHeight
      const maxL = Math.max(0, window.innerWidth - w)
      const maxT = Math.max(0, window.innerHeight - h)
      const clampedL = Math.max(0, Math.min(maxL, left))
      const clampedT = Math.max(0, Math.min(maxT, top))
      this.panelPos = { left: clampedL, top: clampedT }
    },
    _persistPanelPos() {
      if (!this.panelPos) return
      try { localStorage.setItem('zy_panel_pos', JSON.stringify(this.panelPos)) } catch (_) { /* noop */ }
    },
    _cleanupPanelDragListeners() {
      window.removeEventListener('mousemove', this._onPanelDragMove)
      window.removeEventListener('mouseup', this._onPanelDragEnd)
      window.removeEventListener('touchmove', this._onPanelTouchMove)
      window.removeEventListener('touchend', this._onPanelTouchEnd)
    },
    scrollBottom() {
      const box = this.$refs.chatBox
      if (box) box.scrollTop = box.scrollHeight
    },
    pushMsg(from, text, image) {
      const msg = { from, text: text || '' }
      if (image) msg.image = image
      this.messages.push(msg)
      this.hasNewMsg = !this.expanded && from === 'bot'
      this.$nextTick(() => this.scrollBottom())
      this.saveChat()
    },
    /* 持久化聊天记录：只存文字（图片 base64 太大），最多 50 条 */
    saveChat() {
      try {
        const plain = this.messages.slice(-50).map(m => ({ from: m.from, text: m.text || '' }))
        localStorage.setItem('zy_xiaoyi_chat', JSON.stringify(plain))
      } catch (_) { /* 存储满等情况忽略 */ }
    },
    send() {
      const text = (this.inputText || '').trim()
      if (!text && !this.pendingImage) return
      if (this.aiThinking) return
      const image = this.pendingImage || ''
      this.inputText = ''
      this.pushMsg('user', text || '帮我看看这张图片～', image)
      this.pendingImage = ''
      this.pendingFileName = ''
      this.aiReply(text || '帮我看看这张图片里有什么？', image)
    },
    ask(t) {
      if (this.aiThinking) return
      this.pushMsg('user', t.q)
      this.aiReply(t.q)
    },

    /* 压缩图片到最大边 1024px + 转 base64 data URL（JPEG 0.85） */
    compressImage(file, maxSide = 1024, quality = 0.85) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const img = new Image()
          img.onload = () => {
            let { width, height } = img
            if (width > maxSide || height > maxSide) {
              if (width >= height) {
                height = Math.round(height * (maxSide / width))
                width = maxSide
              } else {
                width = Math.round(width * (maxSide / height))
                height = maxSide
              }
            }
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, width, height)
            resolve(canvas.toDataURL('image/jpeg', quality))
          }
          img.onerror = reject
          img.src = e.target.result
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    },
    async handleImage(e) {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      if (!file.type.startsWith('image/')) {
        alert('只能上传图片文件哦～')
        return
      }
      try {
        const dataUrl = await this.compressImage(file)
        this.pendingImage = dataUrl
        this.pendingFileName = file.name
        // 重置 input，允许重复选同一张图
        e.target.value = ''
      } catch (err) {
        console.error('[小颐] 图片处理失败', err)
        alert('图片读取失败，请换一张试试')
      }
    },
    clearPendingImage() {
      this.pendingImage = ''
      this.pendingFileName = ''
      if (this.$refs.fileInput) this.$refs.fileInput.value = ''
    },

    /* 智能提取 DeepSeek 响应里的文字内容（兼容 string / multimodal-array / 空但有 reasoning） */
    _extractContent(data) {
      const msg = data?.choices?.[0]?.message
      if (!msg) return ''
      // 1) 纯 string
      if (typeof msg.content === 'string' && msg.content) return msg.content
      // 2) 新版 multimodal：[{type:'text', text:'...'}]
      if (Array.isArray(msg.content)) {
        const pieces = []
        for (const seg of msg.content) {
          if (!seg) continue
          if (typeof seg === 'string') pieces.push(seg)
          else if (seg.type === 'text' && seg.text) pieces.push(seg.text)
        }
        const joined = pieces.join('').trim()
        if (joined) return joined
      }
      // 3) reasoning_content 兜底
      if (typeof msg.reasoning_content === 'string' && msg.reasoning_content) {
        return msg.reasoning_content
      }
      return ''
    },

    /* 调用智谱 —— 有图时 glm-4.6v-flash 优先，无图时 glm-4.7 优先 */
    async aiReply(userText, imageUrl = '') {
      this.aiThinking = true
      const hasImage = !!imageUrl
      // history 永远用 string（保证纯文本模型能读），图片换成占位描述
      const history = this.messages
        .filter(m => m.text || m.image)
        .slice(-10)
        .map(m => {
          if (m.from === 'user' && m.image) {
            const text = m.text ? m.text + '（用户上传了一张图片）' : '（用户上传了一张图片，请结合上下文分析）'
            return { role: 'user', content: text }
          }
          return {
            role: m.from === 'user' ? 'user' : 'assistant',
            content: m.text || ''
          }
        })
      const API_KEY = 'sk-5f223cfad7fa435da12b65e7d109e715'
      const buildHeaders = () => ({
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + API_KEY
      })
      // 候选模型：有图时视觉模型优先，无图时文本模型优先
      const candidates = hasImage
        ? [
            { endpoint: 'https://api.deepseek.com/chat/completions', model: 'deepseek-v4-flash-vision-exp', label: '直连·V4-Flash-Vision', vision: true },
            { endpoint: '/ds-api/chat/completions', model: 'deepseek-v4-flash-vision-exp', label: '代理·V4-Flash-Vision', vision: true },
            { endpoint: 'https://api.deepseek.com/chat/completions', model: 'deepseek-flash', label: '直连·Flash(兜底)', vision: false },
            { endpoint: '/ds-api/chat/completions', model: 'deepseek-flash', label: '代理·Flash(兜底)', vision: false }
          ]
        : [
            { endpoint: 'https://api.deepseek.com/chat/completions', model: 'deepseek-flash', label: '直连·Flash', vision: false },
            { endpoint: '/ds-api/chat/completions', model: 'deepseek-flash', label: '代理·Flash', vision: false }
          ]
      const MAX_RETRIES = 3
      let lastStatus = 0
      let lastErrMsg = ''
      let replyText = ''
      let finalLabel = ''

      outer: for (let ci = 0; ci < candidates.length; ci++) {
        const { endpoint, model, label, vision } = candidates[ci]
        // 按模型能力重建 messages：V 模型用数组 content + 视觉 prompt；纯文本模型用 string content + 把图片转占位
        let currentUserContent
        let currentSystem
        if (vision && hasImage) {
          // V 模型 + 当前有图 → 数组 content
          currentUserContent = [
            ...(userText ? [{ type: 'text', text: userText }] : []),
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
          currentSystem = '你是「小颐」，一位专业的中医养生顾问。用户可能上传了一张图片（如舌苔、皮肤、食物、场景等），请结合图片内容和用户问题进行中医角度的分析与建议。要求：\n1. 先简要描述你看到的图片内容\n2. 结合中医理论给出针对性的养生建议\n3. 包含食疗、穴位、起居、运动等建议\n4. 用 emoji 和换行让排版清晰\n5. 回答控制在300字以内'
        } else if (!vision && hasImage) {
          // 纯文本模型 + 当前有图 → string content（把图片描述成占位，模型看不到图但不会 400）
          const desc = userText ? userText + '（用户同时上传了一张图片，我无法直接看到图片内容，请基于文本给出建议，并提醒用户描述图片细节或换个时间再试）' : '（用户上传了一张图片，但我目前无法直接看图，请让用户描述图片内容，我再给出建议）'
          currentUserContent = desc
          currentSystem = '你是「小颐」，一位专业的中医养生顾问。请用亲切温和的语气回答用户的养生健康问题。要求：\n1. 结合中医理论与现代健康知识\n2. 回答简洁实用，用 emoji 和换行让排版清晰\n3. 包含食疗建议、穴位按摩、起居调养、运动建议等\n4. 回答控制在200字以内\n5. 如果用户问的不是养生健康问题，温和地引导回养生话题\n6. 提到具体穴位时请标注大致位置'
        } else {
          // 纯文本模型 + 纯文本 → string content（普通情况）
          currentUserContent = userText || ''
          currentSystem = '你是「小颐」，一位专业的中医养生顾问。请用亲切温和的语气回答用户的养生健康问题。要求：\n1. 结合中医理论与现代健康知识\n2. 回答简洁实用，用 emoji 和换行让排版清晰\n3. 包含食疗建议、穴位按摩、起居调养、运动建议等\n4. 回答控制在200字以内\n5. 如果用户问的不是养生健康问题，温和地引导回养生话题\n6. 提到具体穴位时请标注大致位置'
        }
        const messages = [
          { role: 'system', content: currentSystem },
          ...history,
          { role: 'user', content: currentUserContent }
        ]
        const payload = {
          model,
          messages,
          temperature: 0.7,
          max_tokens: 800,
          stream: false
        }
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            if (attempt === 0) this.aiCallStage = `🤔 ${label}（第${attempt+1}次）`
            else this.aiCallStage = `🤔 ${label} 第${attempt+1}次…`

            console.log('[小颐][AI] →', label, 'attempt', attempt+1, 'model=', model)
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: buildHeaders(),
              body: JSON.stringify(payload),
              cache: 'no-store'
            })
            lastStatus = res.status
            let body = null
            try { body = await res.json() } catch (_) { body = null }
            console.log('[小颐][AI] ←', label, 'HTTP=', lastStatus, 'body=', body ? {
              hasChoices: !!body.choices,
              choice0MsgType: body?.choices?.[0]?.message ? typeof body.choices[0].message.content : undefined,
              errCode: body?.error?.code,
              errMsg: body?.error?.message
            } : 'NO_JSON')

            // 429：指数退避，在当前候选内重试
            if (res.status === 429) {
              const errMsg = body?.error?.message || ''
              lastErrMsg = errMsg
              const retryAfterHeader = res.headers.get('Retry-After') || res.headers.get('retry-after')
              let retryMs
              if (retryAfterHeader && !isNaN(parseInt(retryAfterHeader, 10))) {
                retryMs = parseInt(retryAfterHeader, 10) * 1000 + 500
              } else {
                retryMs = Math.max(2, Math.pow(2, attempt + 2)) * 1000
              }
              if (attempt < MAX_RETRIES - 1) {
                this.aiCallStage = `🤕 ${label} 限流，${(retryMs/1000).toFixed(0)}s 后第${attempt+2}次…`
                await new Promise(r => setTimeout(r, retryMs))
                continue
              }
              console.log('[小颐][AI] ' + label + ' 429 重试耗尽，跳下一个候选')
              continue outer
            }

            // 401/403/400：不再换 model 继续浪费（Key 本身有问题），直接全停
            if (res.status === 401 || res.status === 403 || res.status === 400) {
              if (body?.error) lastErrMsg = body.error.message || body.error
              break outer
            }

            if (!res.ok) {
              if (body?.error) lastErrMsg = body.error.message || body.error
              // 5xx / 其它：试下一轮
              continue
            }

            // 200：尝试提取 content（兼容 string / multimodal-array / reasoning）
            const extracted = body ? this._extractContent(body) : ''
            if (extracted) {
              replyText = extracted
              finalLabel = label
              break outer
            }
            lastErrMsg = '响应 200 但 choices.message.content 为空（已兼容 string/数组/reasoning）'
            console.log('[小颐][AI] 200 但无内容，body=', body ? JSON.stringify(body).slice(0, 600) : null)
            // 200 但内容空：这种大概率是接口数据格式变化，试换下一个模型
            continue outer
          } catch (err) {
            lastStatus = -1
            lastErrMsg = (err && err.message) || 'Network/CORS Error'
            console.warn('[小颐][AI] catch', label, err && err.message)
            break outer  // 抓异常说明网络/CORS，再试代理
          }
        }
      }

      if (replyText) {
        this.aiCallStage = `✅ 调用成功 · ${finalLabel}（${replyText.length}字）`
        this.reply(replyText)
      } else {
        let hint = ''
        if (lastStatus === 429) {
          hint = '🤕 DeepSeek 全部链路限流。\n建议稍后再试，或登录 https://platform.deepseek.com/ 查看额度。'
          if (lastErrMsg) hint += `\n服务端错误：${lastErrMsg}`
          hint += '\n\n'
        } else if (lastStatus === 401 || lastStatus === 403) {
          hint = '🔑 API Key 无效或已过期。\n'
          if (lastErrMsg) hint += `服务端：${lastErrMsg}\n`
          hint += '请登录 https://platform.deepseek.com/api_keys 检查 Key 是否启用、是否还有额度。\n\n'
        } else if (lastStatus === 400) {
          hint = `⚠️ 请求格式错误（400）`
          if (lastErrMsg) hint += `：${lastErrMsg}`
          hint += '\n\n'
        } else if (lastStatus >= 500) {
          hint = `💥 DeepSeek 服务器异常（HTTP ${lastStatus}），请稍后再试。\n\n`
        } else if (lastStatus === -1) {
          hint = `🌐 网络/CORS 错误：${lastErrMsg || '未知'}。\n开发环境确认 vue.config.js 代理已生效；线上部署需要 nginx 反代 /ds-api/。\n\n`
        } else {
          hint = `⚠️ 未收到有效回答（HTTP ${lastStatus}）。`
          if (lastErrMsg) hint += ` ${lastErrMsg}`
          hint += '\n浏览器 Console 有 [小颐][AI] 调试日志，可截图发我排查。\n\n'
        }
        const fallback = this.matchKB(userText)
        this.aiCallStage = `⚠️ 调用失败（HTTP ${lastStatus}），切本地知识库`
        this.reply(hint + '—— 以下为本地养生知识库回答 ——\n\n' + fallback)
      }
      setTimeout(() => { this.aiCallStage = '' }, 8000)
      this.aiThinking = false
    },
    matchKB(text) {
      let best = null
      let bestScore = 0
      KB.forEach((item) => {
        let score = 0
        item.keys.forEach((w) => {
          if (text.includes(w)) score += w.length >= 4 ? 4 : w.length >= 3 ? 3 : 2
        })
        if (score > bestScore) {
          bestScore = score
          best = item
        }
      })
      return best ? best.reply : FALLBACK_REPLY
    },
    reply(text) {
      this.pushMsg('bot', text)
      this.speak(text)
    },
    clearChat() {
      this.messages = [{ from: 'bot', text: '对话已清空～有什么问题随时问我 🌿' }]
      try { localStorage.removeItem('zy_xiaoyi_chat') } catch (_) { /* noop */ }
    },
    /* 语音识别 */
    toggleRecord() {
      if (!this.supportsSpeech) {
        alert('当前浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器。\n（微信/微信内置浏览器不支持语音识别 API）')
        return
      }
      if (this.recording) this.stopRecord()
      else this.startRecord()
    },
    startRecord() {
      try {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition
        const rec = new SR()
        rec.lang = 'zh-CN'
        rec.interimResults = true
        rec.continuous = true
        // 保留输入框已有文字作为基础
        this._voiceBase = this.inputText || ''
        rec.onresult = (e) => {
          let interim = ''
          let final = ''
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript
            if (e.results[i].isFinal) final += t
            else interim += t
          }
          if (final) {
            this._voiceBase += final
          }
          const newText = this._voiceBase + interim
          // 只在有内容时更新，防止 stop 后空结果覆盖输入框
          if (newText) {
            this.inputText = newText
          }
        }
        rec.onerror = (e) => {
          if (e.error === 'not-allowed') {
            alert('麦克风权限被拒绝。\n请点击浏览器地址栏的锁图标 → 允许麦克风权限。')
          }
        }
        rec.onend = () => {
          if (this.keepListening) {
            try { rec.start() } catch (_) { /* noop */ }
          } else {
            this.recording = false
          }
        }
        this.recognition = rec
        this.keepListening = true
        rec.start()
        this.recording = true
      } catch (e) {
        this.recording = false
        this.keepListening = false
      }
    },
    stopRecord() {
      this.keepListening = false
      if (this.recognition) {
        try { this.recognition.stop() } catch (_) { /* noop */ }
        this.recognition = null
      }
      this.recording = false
      // 保留 inputText 中的识别文字，不清除 _voiceBase
      // _voiceBase 会在下次 startRecord 时重置
    },
    /* 语音播报（豆包 TTS 优先，回退浏览器语音） */
    speak(text) {
      this.stopSpeak()
      if (!this.voiceOn) return
      const plain = text.replace(/\n/g, '。').slice(0, 180)
      speakText(plain, {
        onStart: () => { this.speaking = true },
        onEnd: () => { this.speaking = false },
        onAmp: v => { this._talkAmp = v }
      })
    },
    stopSpeak() {
      stopText()
      this.speaking = false
    },
    /* 音色设置弹窗 */
    openTtsSettings() {
      this.ttsForm = this.ttsCfg
        ? { ...this.ttsCfg }
        : { appid: '', token: '', cluster: 'volcano_tts', voice: DOUBAO_VOICES[0].id }
      this.showTtsSettings = true
    },
    saveTts() {
      saveTtsConfig({ ...this.ttsForm })
      this.ttsCfg = loadTtsConfig()
      this.showTtsSettings = false
    },
    clearTts() {
      saveTtsConfig(null)
      this.ttsCfg = null
      this.showTtsSettings = false
    }
  }
}
</script>

<style scoped>
/* ===== 悬浮头像按钮 ===== */
.floating-avatar {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: auto;
  height: 256px;
  max-height: 272px;
  background: transparent;
  border: none;
  padding: 0;
  cursor: grab;
  z-index: 300;
  box-shadow: none;
  overflow: visible;
  transition: transform 0.18s;
  line-height: 0;
  user-select: none;
  -webkit-user-drag: none;
}
.floating-avatar.dragging {
  cursor: grabbing;
  transition: none;
  z-index: 9999;
}
.xy-anim {
  height: 100%;
  width: auto;
  transform-origin: 50% 92%;
  line-height: 0;
}
.xy-anim img {
  height: 100%;
  width: auto;
  max-width: 220px;
  object-fit: contain;
  display: block;
  pointer-events: none;
  animation: xy-breathe 3.4s ease-in-out infinite;
}
/* 呼吸起伏 */
@keyframes xy-breathe {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(3px); }
}
/* 点头 / 歪头 / 说话点头 / 倾听前倾（作用于整体，不改形象） */
.xy-anim.nod { animation: xy-nod 0.9s ease-in-out 1; }
.xy-anim.tilt { animation: xy-tilt 1.1s ease-in-out 1; }
.xy-anim.talking { animation: xy-nod-slow 1.5s ease-in-out infinite; }
.xy-anim.listening { transform: rotate(5deg); }
@keyframes xy-nod {
  0%, 100% { transform: rotate(0) translateY(0); }
  30%      { transform: rotate(3deg) translateY(3px); }
  65%      { transform: rotate(-1.5deg) translateY(0); }
}
@keyframes xy-nod-slow {
  0%, 100% { transform: rotate(0) translateY(0); }
  40%      { transform: rotate(2.5deg) translateY(2px); }
  70%      { transform: rotate(-1deg) translateY(0); }
}
@keyframes xy-tilt {
  0%, 100% { transform: rotate(0); }
  45%      { transform: rotate(7deg); }
}
/* 录音声波指示条 */
.xy-soundbars {
  position: absolute;
  top: 24%;
  right: -2px;
  display: flex;
  gap: 3px;
  align-items: flex-end;
  height: 22px;
}
.xy-soundbars i {
  width: 4px;
  border-radius: 2px;
  background: #6fbf9a;
  transform-origin: bottom;
  animation: xy-bar 0.9s ease-in-out infinite;
}
.xy-soundbars i:nth-child(1) { height: 10px; }
.xy-soundbars i:nth-child(2) { height: 18px; animation-delay: 0.15s; }
.xy-soundbars i:nth-child(3) { height: 13px; animation-delay: 0.3s; }
@keyframes xy-bar {
  0%, 100% { transform: scaleY(0.4); }
  50%      { transform: scaleY(1); }
}
/* AI 思考气泡 */
.xy-think-bubble {
  position: absolute;
  top: -2px;
  right: 14px;
  background: #fff;
  border: 1.5px solid #cfe0d6;
  color: #7fc8a9;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 13px;
  letter-spacing: 2px;
  line-height: 1.4;
  box-shadow: 0 2px 8px rgba(47, 93, 80, 0.12);
  animation: xy-think-bubble 1s ease-in-out infinite alternate;
}
@keyframes xy-think-bubble {
  from { transform: translateY(0); opacity: 0.75; }
  to   { transform: translateY(-3px); opacity: 1; }
}
.floating-avatar:hover {
  transform: translateY(-2px) scale(1.03);
}
.floating-avatar.listening {
  animation: speak-bob 0.6s ease-in-out infinite;
  filter: drop-shadow(0 0 14px rgba(192,57,43,0.55));
}
.floating-avatar.speaking {
  animation: speak-bob 0.9s ease-in-out infinite;
  filter: drop-shadow(0 0 10px rgba(47,93,80,0.4));
}
.floating-avatar.bounce {
  animation: bounce-tip 0.6s ease-in-out;
}
@keyframes speak-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-4px); }
}
@keyframes bounce-tip {
  0%, 100% { transform: scale(1); }
  30%      { transform: scale(1.12); }
  60%      { transform: scale(0.95); }
}
.floating-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}
.floating-badge.rec { background: #c0392b; color: #fff; }
.floating-badge.dot { background: #e74c3c; }

/* ===== 数字人工作台（桌面端三栏） ===== */
.chat-panel {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: min(1060px, calc(100vw - 48px));
  height: min(640px, calc(100vh - 48px));
  background: #f4f8f5;
  border-radius: 16px;
  box-shadow: 0 18px 50px rgba(47, 93, 80, 0.22);
  border: 1px solid #e3ece7;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 300;
}
.chat-fade-enter-active,
.chat-fade-leave-active {
  transition: all 0.22s ease-out;
}
.chat-fade-enter-from,
.chat-fade-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.96);
}

.chat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: linear-gradient(135deg, #2f5d50, #3e7a68);
  color: #fff;
  flex-shrink: 0;
  cursor: grab;
  user-select: none;
}
.chat-head.drag {
  cursor: grabbing;
  transition: none;
}
.head-ico {
  font-size: 22px;
  line-height: 1;
}
.drag-hint {
  opacity: 0.75;
  font-weight: 400;
  font-size: 11px;
  margin-left: 4px;
}
.chat-head-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.chat-head-name {
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}
.chat-head-sub {
  font-size: 12px;
  opacity: 0.85;
}
.chat-close {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.2);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}
.chat-close:hover { background: rgba(255,255,255,0.35); }

/* 三栏布局 */
.dh-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 236px 1fr 226px;
  gap: 10px;
  padding: 10px;
}

/* ===== 左栏：数字人形象 ===== */
.dh-left {
  background: #fff;
  border: 1px solid #e3ece7;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
.dh-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: #f0f6f2;
  color: #2f5d50;
  font-size: 13px;
  font-weight: 700;
  border-bottom: 1px solid #e3ece7;
  flex-shrink: 0;
}
.dh-online {
  background: #2f5d50;
  color: #fff;
  font-size: 11px;
  padding: 1px 9px;
  border-radius: 10px;
  font-weight: 400;
}
.dh-stage {
  flex: 1;
  min-height: 0;
  position: relative;
  background: radial-gradient(circle at 50% 28%, #f4faf6, #e2efe7);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
}
.dh-stage .xy-anim {
  position: relative;
  max-height: 96%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
/* 严格收缩包裹图片的容器：嘴贴片的百分比坐标以实际图片渲染盒为基准 */
.dh-stage .xy-fig {
  position: relative;
  display: inline-block;
  line-height: 0;
  animation: xy-breathe 3.4s ease-in-out infinite;
}
.dh-stage .xy-fig img {
  display: block;
  width: auto;
  height: auto;
  max-width: 196px;
  max-height: 52vh;
  pointer-events: none;
  animation: none;
}
/* 讲话视频合成层：按「头顶对齐」参数定位（相对 PNG 渲染盒）
   left -3.13% / top 2.88% / 宽 104.8% / 高 67.1%，裙摆区由下层立绘补全 */
.dh-stage .xy-fig .xy-talk {
  position: absolute;
  left: -3.13%;
  top: 2.88%;
  width: 104.8%;
  height: 67.1%;
  pointer-events: none;
  z-index: 2;
}
/* 隐藏的视频源：仍需参与解码供 canvas 绘制 */
.dh-stage .xy-fig .xy-talk-src {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
  z-index: -1;
}
.dh-stage-tag {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(47, 93, 80, 0.92);
  color: #fff;
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 10px;
  white-space: nowrap;
}
.dh-stage-tag.rec { background: rgba(192, 57, 43, 0.94); }
.dh-stage-tag.think { background: rgba(62, 122, 104, 0.94); }
.dh-ctrl {
  padding: 8px 10px 10px;
  border-top: 1px solid #e3ece7;
  background: #fff;
  flex-shrink: 0;
}
.dh-opacity-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #5a6b62;
}
.dh-range {
  flex: 1;
  min-width: 0;
  accent-color: #2f5d50;
}
.dh-ctrl-val {
  width: 36px;
  text-align: right;
  font-size: 11px;
  color: #8a9b93;
}
.dh-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.dh-act-btn {
  flex: 1;
  padding: 6px 0;
  border: 1px solid #d8e3dd;
  background: #fff;
  border-radius: 8px;
  font-size: 12px;
  color: #2f5d50;
  cursor: pointer;
  transition: background 0.15s;
}
.dh-act-btn:hover { background: #eef6f1; }

/* ===== 中栏：对话主区 ===== */
.dh-main {
  background: #fff;
  border: 1px solid #e3ece7;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
}
.dh-main-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #f0f6f2;
  border-bottom: 1px solid #e3ece7;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.dh-main-title {
  font-weight: 700;
  color: #2f5d50;
  font-size: 14px;
}
.dh-conn {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #2f5d50;
}
.dh-conn .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.35);
}
.dh-main-tools {
  margin-left: auto;
  display: flex;
  gap: 6px;
}
.dh-tool {
  border: 1px solid #d8e3dd;
  background: #fff;
  color: #5a6b62;
  border-radius: 14px;
  font-size: 11px;
  padding: 3px 10px;
  cursor: pointer;
  transition: all 0.15s;
}
.dh-tool.on {
  background: #2f5d50;
  border-color: #2f5d50;
  color: #fff;
}
.dh-tool:hover:not(.on) { background: #eef6f1; }

.dh-status {
  padding: 6px 12px;
  background: #f4f8f5;
  color: #5a6b62;
  font-size: 12px;
  flex-shrink: 0;
  border-bottom: 1px dashed #d8e8df;
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #fafcfb;
}
.msg {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.msg-user { justify-content: flex-end; }
.msg-bot { justify-content: flex-start; }
.msg-avatar-img {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 1.5px solid #7fc8a9;
  background: #fff;
}
.msg-bubble {
  max-width: 78%;
  padding: 9px 13px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}
.msg-bot .msg-bubble {
  background: #eef6f1;
  color: #2f4a3e;
  border-top-left-radius: 4px;
}
.msg-user .msg-bubble {
  background: #2f5d50;
  color: #fff;
  border-top-right-radius: 4px;
}
.msg-bubble.interim {
  background: #f0f4f1;
  color: #8a9b93;
  font-style: italic;
}

/* ===== 右栏：辅助信息 ===== */
.dh-right {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}
.dh-side-card {
  background: #fff;
  border: 1px solid #e3ece7;
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.dh-side-card.grow {
  flex: 1;
  overflow: hidden;
}
.dh-side-head {
  font-size: 13px;
  font-weight: 700;
  color: #2f5d50;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.dh-topics {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  min-height: 0;
}
.dh-topic {
  text-align: left;
  padding: 7px 10px;
  border: 1px solid #d8e3dd;
  background: #fff;
  border-radius: 8px;
  font-size: 12px;
  color: #2f5d50;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.dh-topic:hover {
  background: #eef6f1;
  border-color: #bfe0cf;
}
.dh-tips {
  margin: 0;
  padding-left: 16px;
  color: #5a6b62;
  font-size: 12px;
  line-height: 1.9;
}
.dh-status-line {
  font-size: 12px;
  color: #2f5d50;
}

/* ===== 图片上传相关 ===== */
.hidden-file-input { display: none; }

.pending-image-row {
  display: flex; align-items: center; gap: 10px;
  margin: 4px 12px 0; padding: 8px 10px;
  background: #f1f8f4; border-radius: 10px;
  border: 1px dashed #bfe0cf;
}
.pending-thumb {
  width: 56px; height: 56px; object-fit: cover;
  border-radius: 8px; flex-shrink: 0;
  border: 1px solid #d8e8df;
}
.pending-name {
  flex: 1; font-size: 12px; color: #3a6a58;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.pending-clear {
  width: 22px; height: 22px;
  border-radius: 50%; border: none;
  background: #c94b4b; color: #fff;
  font-size: 12px; line-height: 1;
  cursor: pointer; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.pending-clear:hover { background: #a33a3a; }

.msg-image {
  display: block;
  max-width: 100%;
  max-height: 180px;
  border-radius: 10px;
  margin-bottom: 6px;
  border: 1px solid #d8e8df;
  cursor: zoom-in;
}

/* ===== 语音识别结果 / 输入面板 ===== */
.dh-asr {
  margin: 0 12px 8px;
  border: 1px solid #d8e3dd;
  border-radius: 10px;
  background: #fff;
  flex-shrink: 0;
  transition: box-shadow 0.2s, border-color 0.2s;
}
.dh-asr.active {
  border-color: #c0392b;
  box-shadow: 0 0 0 3px rgba(192, 57, 43, 0.12);
}
.dh-asr-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  background: #f0f6f2;
  border-bottom: 1px solid #e3ece7;
  font-size: 12px;
  color: #2f5d50;
  border-radius: 9px 9px 0 0;
}
.dh-asr-tools {
  display: flex;
  gap: 4px;
  align-items: center;
}
.dh-mini {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  padding: 2px 6px;
  border-radius: 6px;
  color: #5a6b62;
}
.dh-mini:hover:not(:disabled) { background: #e3ece7; }
.dh-mini:disabled { opacity: 0.5; cursor: not-allowed; }
.dh-asr-text {
  display: block;
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.55;
  background: transparent;
  color: #2f4a3e;
  font-family: inherit;
  box-sizing: border-box;
}

/* ===== 主操作按钮 ===== */
.dh-btn-row {
  display: flex;
  gap: 10px;
  padding: 0 12px 12px;
  flex-shrink: 0;
}
.dh-btn {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 22px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: filter 0.15s;
  font-family: inherit;
}
.dh-btn.rec {
  background: #5d8a6d;
  color: #fff;
}
.dh-btn.rec.stop {
  background: #c0392b;
  animation: rec-btn-pulse 1.2s infinite;
}
.dh-btn.rec.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.dh-btn.send {
  background: #2f5d50;
  color: #fff;
}
.dh-btn:hover:not(:disabled) { filter: brightness(1.08); }
.dh-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
@keyframes rec-btn-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(192, 57, 43, 0.35); }
  50%      { box-shadow: 0 0 0 6px rgba(192, 57, 43, 0.08); }
}

/* ===== 豆包 TTS 音色设置浮层 ===== */
.tts-mask {
  position: fixed;
  inset: 0;
  background: rgba(31, 54, 46, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 400;
}
.tts-pop {
  width: 290px;
  background: #fff;
  border: 1px solid #e3ece7;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 10px 30px rgba(47, 93, 80, 0.25);
}
.tts-pop-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  color: #2f5d50;
  font-size: 14px;
  margin-bottom: 6px;
}
.tts-close {
  border: none;
  background: #f0f6f2;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  color: #5a6b62;
  font-size: 12px;
}
.tts-close:hover { background: #e3ece7; }
.tts-tip {
  font-size: 11px;
  color: #8a9b93;
  line-height: 1.5;
  margin: 0 0 10px;
}
.tts-field {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #5a6b62;
}
.tts-field span { width: 78px; flex-shrink: 0; }
.tts-field input,
.tts-field select {
  flex: 1;
  min-width: 0;
  height: 30px;
  border: 1px solid #d8e3dd;
  border-radius: 8px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  color: #2f4a3e;
  background: #fff;
  font-family: inherit;
}
.tts-field input:focus,
.tts-field select:focus { border-color: #7fc8a9; }
.tts-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.tts-btn {
  flex: 1;
  height: 32px;
  border-radius: 16px;
  border: none;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.tts-btn.primary { background: #2f5d50; color: #fff; }
.tts-btn.primary:hover { filter: brightness(1.1); }
.tts-btn.ghost {
  background: #fff;
  border: 1px solid #d8e3dd;
  color: #5a6b62;
}
.tts-btn.ghost:hover { background: #eef6f1; }

/* ===== 响应式适配 ===== */
@media (max-width: 1150px) {
  .dh-layout { grid-template-columns: 216px 1fr; }
  .dh-right { display: none; }
}
@media (max-width: 860px) {
  .dh-layout { grid-template-columns: 1fr; padding: 8px; }
  .dh-left { display: none; }
  .chat-panel {
    right: 0;
    left: 0;
    bottom: 0;
    width: 100%;
    height: calc(100vh - 54px);
    max-height: none;
    border-radius: 16px 16px 0 0;
    border: none;
    box-shadow: 0 -8px 30px rgba(47, 93, 80, 0.18);
  }
  .chat-head { padding: 10px 12px; }
  .chat-body { padding: 10px; }
  .msg-bubble { font-size: 13px; }
  .dh-btn { height: 40px; font-size: 13px; }
}
@media (max-width: 768px) {
  .floating-avatar {
    right: 16px;
    bottom: calc(74px + env(safe-area-inset-bottom));
    height: 216px;
    max-height: 220px;
  }
  .xy-anim img { max-width: 184px; }
}
</style>
