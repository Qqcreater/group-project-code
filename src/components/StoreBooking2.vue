<template>
  <div class="module">
    <div class="module-head">
      <h2>📍 线下门店预约</h2>
      <p>选择就近门店与养生服务，一键预约专属调理。</p>
    </div>

    <div class="layout">
      <!-- 门店列表 -->
      <div class="stores">
        <div
          v-for="s in stores"
          :key="s.id"
          class="store"
          :class="{ active: selected && selected.id === s.id }"
          @click="selectStore(s)"
        >
          <div class="store-top">
            <h3>{{ s.name }}</h3>
            <span class="rating">⭐ {{ s.rating }}</span>
          </div>
          <p class="store-addr">📌 {{ s.addr }} · {{ s.distance }}km</p>
          <div class="store-tags">
            <span v-for="sv in s.services" :key="sv" class="mini-tag">{{ sv }}</span>
          </div>
        </div>
      </div>

      <!-- 预约面板 -->
      <div class="booking" v-if="selected">
        <h3>预约「{{ selected.name }}」</h3>
        <label class="field">
          <span>选择服务</span>
          <select v-model="form.service">
            <option v-for="sv in selected.services" :key="sv" :value="sv">{{ sv }}</option>
          </select>
        </label>
        <label class="field">
          <span>预约日期</span>
          <input type="date" v-model="form.date" />
        </label>
        <div class="field">
          <span>时间段</span>
          <div class="slots">
            <button
              v-for="t in timeSlots"
              :key="t"
              class="slot"
              :class="{ active: form.time === t }"
              @click="form.time = t"
            >
              {{ t }}
            </button>
          </div>
        </div>
        <button class="btn primary" :disabled="!canSubmit" @click="submit">确认预约</button>
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
            <strong>{{ b.store }}</strong> · {{ b.service }}
            <div class="bk-sub">{{ b.date }} {{ b.time }}</div>
          </div>
          <button class="bk-cancel" @click="cancel(i)">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StoreBooking',
  data() {
    return {
      selected: null,
      stores: [
        { id: 1, name: '颐养轩·旗舰店', addr: '朝阳区建国路 88 号', distance: 1.2, rating: 4.9, services: ['中医问诊', '艾灸', '推拿', '拔罐'] },
        { id: 2, name: '颐养轩·海淀店', addr: '海淀区中关村大街 12 号', distance: 3.5, rating: 4.7, services: ['针灸', '推拿', '体质调理'] },
        { id: 3, name: '颐养轩·西城店', addr: '西城区金融街 5 号', distance: 5.1, rating: 4.8, services: ['艾灸', '药浴', '拔罐'] }
      ],
      timeSlots: ['09:00', '10:30', '13:00', '14:30', '16:00', '18:00'],
      form: { service: '', date: '', time: '' },
      myBookings: []
    }
  },
  computed: {
    canSubmit() {
      return this.form.service && this.form.date && this.form.time
    }
  },
  methods: {
    selectStore(s) {
      this.selected = s
      this.form = { service: s.services[0], date: '', time: '' }
    },
    submit() {
      this.myBookings.unshift({
        store: this.selected.name,
        service: this.form.service,
        date: this.form.date,
        time: this.form.time
      })
      alert('预约成功！我们会提前短信提醒您。')
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
  margin: 0 0 18px;
  color: #7a8a82;
  font-size: 14px;
}
.layout {
  display: grid;
  grid-template-columns: 1fr 320px;
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
.store {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  border: 2px solid transparent;
  box-shadow: 0 4px 18px rgba(47, 93, 80, 0.06);
}
.store.active {
  border-color: #7fc8a9;
}
.store-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.store-top h3 {
  margin: 0;
  font-size: 16px;
  color: #2f5d50;
}
.rating {
  font-size: 13px;
  color: #b9770e;
}
.store-addr {
  font-size: 13px;
  color: #8a9b93;
  margin: 6px 0;
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
.booking {
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 4px 18px rgba(47, 93, 80, 0.06);
  align-self: start;
}
.booking.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aab6b0;
  font-size: 14px;
}
.booking h3 {
  margin: 0 0 16px;
  color: #2f5d50;
}
.field {
  display: block;
  margin-bottom: 14px;
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
}

@media (max-width: 640px) {
  .store {
    padding: 14px;
  }
  .booking {
    padding: 16px 14px;
  }
  .bk-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
