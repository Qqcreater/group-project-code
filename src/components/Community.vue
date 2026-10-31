<template>
  <div class="module">
    <div class="module-head">
      <h2>💬 互动社区</h2>
      <p>与养生同好分享日常，记录你的健康点滴。</p>
    </div>

    <div class="composer">
      <div class="composer-head">
        <span class="me-avatar">🧑‍⚕️</span>
        <textarea
          v-model="draft"
          rows="2"
          placeholder="分享今天的养生心得…"
        ></textarea>
      </div>
      <div class="composer-foot">
        <span class="count">{{ draft.length }}/200</span>
        <button class="btn primary" :disabled="!draft.trim()" @click="publish">发布</button>
      </div>
    </div>

    <div class="feed">
      <article v-for="p in posts" :key="p.id" class="post">
        <div class="post-head">
          <span class="post-avatar">{{ p.avatar }}</span>
          <div>
            <div class="post-name">{{ p.name }}</div>
            <div class="post-time">{{ p.time }}</div>
          </div>
        </div>
        <p class="post-content">{{ p.content }}</p>
        <div class="post-actions">
          <button class="act" :class="{ liked: p.liked }" @click="toggleLike(p)">
            {{ p.liked ? '❤️' : '🤍' }} {{ p.likes }}
          </button>
          <button class="act">💬 {{ p.comments }}</button>
          <button class="act">↗ 分享</button>
        </div>
      </article>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Community',
  data() {
    return {
      draft: '',
      posts: [
        { id: 1, name: '养生小白', avatar: '🌱', time: '10 分钟前', content: '坚持八段锦一周了，睡眠真的变好了！分享给同样失眠的朋友们～', likes: 32, comments: 8, liked: false },
        { id: 2, name: '中医爱好者', avatar: '🍵', time: '1 小时前', content: '秋季干燥，最近天天喝冰糖雪梨羹，嗓子舒服多了。大家有什么润肺小方子？', likes: 56, comments: 14, liked: false },
        { id: 3, name: '瑜伽教练 Lin', avatar: '🧘‍♀️', time: '今天 09:20', content: '办公室肩颈操更新啦，久坐的小伙伴记得每小时动一动哦！', likes: 89, comments: 21, liked: false }
      ]
    }
  },
  methods: {
    publish() {
      if (!this.draft.trim()) return
      this.posts.unshift({
        id: Date.now(),
        name: '我',
        avatar: '🧑‍⚕️',
        time: '刚刚',
        content: this.draft.trim(),
        likes: 0,
        comments: 0,
        liked: false
      })
      this.draft = ''
    },
    toggleLike(p) {
      p.liked = !p.liked
      p.likes += p.liked ? 1 : -1
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
.composer {
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 18px;
  box-shadow: 0 4px 18px rgba(47, 93, 80, 0.06);
}
.composer-head {
  display: flex;
  gap: 12px;
}
.me-avatar {
  font-size: 34px;
}
.composer textarea {
  flex: 1;
  border: 1px solid #dce5e0;
  border-radius: 10px;
  padding: 10px;
  font-size: 14px;
  resize: none;
  outline: none;
  font-family: inherit;
}
.composer-foot {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 14px;
  margin-top: 10px;
}
.count {
  font-size: 12px;
  color: #aab6b0;
}
.btn {
  padding: 8px 22px;
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
.feed {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.post {
  background: #fff;
  border-radius: 14px;
  padding: 18px;
  box-shadow: 0 4px 18px rgba(47, 93, 80, 0.06);
}
.post-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.post-avatar {
  font-size: 34px;
}
.post-name {
  font-weight: 600;
  color: #2f5d50;
}
.post-time {
  font-size: 12px;
  color: #aab6b0;
}
.post-content {
  margin: 12px 0;
  font-size: 14px;
  line-height: 1.7;
  color: #3c4a44;
}
.post-actions {
  display: flex;
  gap: 18px;
  border-top: 1px solid #eef2ef;
  padding-top: 10px;
}
.act {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  color: #7a8a82;
}
.act.liked {
  color: #c0392b;
}

@media (max-width: 640px) {
  .composer,
  .post {
    padding: 14px;
  }
  .post-actions {
    gap: 14px;
  }
}
</style>
