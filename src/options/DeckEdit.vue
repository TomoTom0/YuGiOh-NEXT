<template>
  <div class="deck-edit">
    <h2>デッキ編集（サンプル）</h2>
    <p class="desc">このタブはデッキ編集の構造確認用サンプルです。カード名・枚数・カードID・画像ID を入力してシリアライズを確認できます。</p>

    <form ref="formEl" class="deck-form" @submit.prevent>
      <div class="row">
        <label>デッキ名</label>
        <input v-model="deckName" name="dnm" />
      </div>

      <div class="card-list">
        <div v-for="(card, idx) in cards" :key="idx" class="card-row">
          <input v-model="card.monm" :id="`monm_${idx+1}`" name="monm" />
          <input v-model="card.monum" :id="`monum_${idx+1}`" name="monum" class="num" />
          <input type="hidden" v-model="card.monsterCardId" name="monsterCardId" />
          <input type="hidden" v-model="card.imgs" name="imgs" />
          <button type="button" @click="removeCard(idx)">削除</button>
        </div>
      </div>

      <div class="actions">
        <button type="button" @click="addCard">カード追加</button>
        <button type="button" class="primary" @click="showSerialized">シリアライズを表示</button>
        <button type="button" @click="showJson">JSON 表示</button>
        <button type="button" @click="resetForm">リセット</button>
      </div>
    </form>

    <h3>出力</h3>
    <pre class="out">{{ outText }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';

const deckName = ref('サンプルデッキ');

type Card = {
  monm: string;
  monum: string;
  monsterCardId: string;
  imgs: string;
};

  const cards = reactive<Card[]>([
  { monm: 'Vanquish Soul Caesar Valius', monum: '1', monsterCardId: '18732', imgs: '18732_1_1_1' },
  { monm: 'Another Sample Card', monum: '2', monsterCardId: '20001', imgs: '20001_1_1_1' },
]);

const outText = ref('(ここにシリアライズ結果が表示されます)');

const addCard = () => {
  cards.push({ monm: '新しいカード', monum: '1', monsterCardId: '', imgs: '' });
};

const removeCard = (idx: number) => {
  cards.splice(idx, 1);
};

function serialize() {
  const parts: string[] = [];
  parts.push(encodeURIComponent('dnm') + '=' + encodeURIComponent(String(deckName.value ?? '')));
  for (const c of cards) {
    parts.push(encodeURIComponent('monm') + '=' + encodeURIComponent(String(c.monm ?? '')));
    parts.push(encodeURIComponent('monum') + '=' + encodeURIComponent(String(c.monum ?? '')));
    parts.push(encodeURIComponent('monsterCardId') + '=' + encodeURIComponent(String(c.monsterCardId ?? '')));
    parts.push(encodeURIComponent('imgs') + '=' + encodeURIComponent(String(c.imgs ?? '')));
  }
  return parts.join('&');
}

function toJson() {
  const obj: Record<string, any> = { dnm: deckName.value };
  // Collect arrays for repeating names
  const map: Record<string, any[]> = {};
  for (const c of cards) {
    [['monm', c.monm], ['monum', c.monum], ['monsterCardId', c.monsterCardId], ['imgs', c.imgs]].forEach(([k, v]) => {
      const key = k as string;
      if (!map[key]) map[key] = [];
      map[key].push(v);
    });
  }
  Object.assign(obj, map);
  return obj;
}

const showSerialized = () => {
  outText.value = 'ope=3&' + serialize();
};

const showJson = () => {
  outText.value = JSON.stringify(toJson(), null, 2);
};

const resetForm = () => {
  deckName.value = 'サンプルデッキ';
  cards.splice(0, cards.length, 
    { monm: 'Vanquish Soul Caesar Valius', monum: '1', monsterCardId: '18732', imgs: '18732_1_1_1' },
    { monm: 'Another Sample Card', monum: '2', monsterCardId: '20001', imgs: '20001_1_1_1' }
  );
  outText.value = '(ここにシリアライズ結果が表示されます)';
};
</script>

<style scoped>
.deck-edit{background: var(--bg-primary);padding:16px;border-radius:8px}
.desc{color: var(--text-secondary)}
.row{margin-bottom:12px;display:flex;gap:8px;align-items:center}
.card-list{margin-bottom:12px}
.card-row{display:flex;gap:8px;align-items:center;margin-bottom:8px}
.card-row input{padding:6px;border: 1px solid var(--border-primary);border-radius:4px}
.card-row .num{width:48px}
.actions{display:flex;gap:8px}
.primary{background: var(--button-bg);color: var(--button-text);border:none;padding:8px 12px;border-radius:6px}
.out{background: var(--bg-secondary);padding:12px;border-radius:6px;white-space:pre-wrap}
</style>
