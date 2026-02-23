/**
 * Gemini Nanoでカードテキストから条件抽出のテスト
 *
 * 以下の挙動を確認：
 * 1. window.ai APIが利用可能か
 * 2. Gemini Nanoでプロンプトを実行できるか
 * 3. カードテキストから検索条件を抽出できるか
 */

const { connectCDP } = require('./cdp-helper.js');

// テスト用カードデータ
const testCard = {
  cardId: '20760',
  name: '天威龍－スールヤ',
  text: `このカード名の①②の効果はそれぞれ１ターンに１度しか使用できない。
①：幻竜族モンスターか、効果モンスター以外の表側表示モンスターが自分フィールドに存在する場合に発動できる。このカードを手札から特殊召喚する。
②：このカードが幻竜族SモンスターのS素材として墓地へ送られた場合に発動できる。EXデッキから「天威」Lモンスター１体を特殊召喚する。その後、自分はこの効果で特殊召喚したモンスターのリンクマーカーの数×１０００LPを失う。この効果で特殊召喚したモンスターはL素材にできない。`
};

// プンプト
const prompt = `カードテキストから検索可能な条件を抽出してください。

## 【最重要】抽出の手順

各カードに対して、以下の手順で**必ず全ての条件**を抽出してください：

1. カードテキスト全体を読む
2. 「～モンスター」「～族」「～属性」「～以上/以下」「～カード」など、検索条件になりうる表現を全て見つける
3. 「～か、～」（OR条件）で区切られている場合は、それぞれを別の条件として抽出する
4. 「～以外の～」は1つの条件として抽出し、分割しない（重要）
5. 見つけた全ての条件を漏れなく抽出する

## 出力形式
{"results":[{"cardId":"ID","conditions":[{"text":"元テキスト","filters":{},"logic":"and","startIndex":0,"endIndex":5}]}]}

## 分割する場合としない場合の違い（重要）

### 分割する：「～か、～」（OR条件）
原文：「幻竜族モンスター**か、**効果モンスター以外の表側表示モンスターが自分フィールドに存在する場合」
抽出する条件：
1. 「幻竜族モンスター」
2. 「効果モンスター以外の表側表示モンスター」

### 分割しない：「～以外の～」（除外条件）
原文：「「バックアップ＠イグニスター」**以外の**サイバース族・闇属性モンスター」
抽出する条件：
- **1つの条件**：「「バックアップ＠イグニスター」以外のサイバース族・闇属性モンスター」
- 分割して「「バックアップ＠イグニスター」以外」と「サイバース族・闇属性モンスター」に分けない

## filtersの定義

### cardTypes: {operator: "in"|"not_in", value: ["monster", "spell", "trap"]}
- 例：「モンスター」→ {operator: "in", value: ["monster"]}

### monsterTypes: {operator: "in"|"not_in", value: [...]}
カードテキスト → 内部値:
- 通常 → normal、効果 → effect、融合 → fusion、S/シンクロ → synchro、X/エクシーズ → xyz、L/リンク → link、儀式 → ritual、P/ペンデュラム → pendulum

### races: {operator: "in"|"not_in", value: [...]}
カードテキスト → 内部値:
- 戦士族 → warrior、ドラゴン族 → dragon、魔法使い族 → spellcaster、幻竜族 → wyrm、サイバース族 → cyberse

### attributes: {operator: "in"|"not_in", value: [...]}
カードテキスト → 内部値:
- 光 → light、闇 → dark、炎 → fire、水 → water、風 → wind、地 → earth

### nameQuery: {operator: "has"|"equals"|"!="|"not_contains", value: "カード名"}
- 「「天威」モンスター」→ {operator: "has", value: "天威"}

## カード情報
cardId: ${testCard.cardId}
name: ${testCard.name}
text: ${testCard.text}

## 出力
上記の形式でJSONのみで出力してください。`;

async function testGeminiNano(): Promise<void> {
  console.log('【Gemini Nano テスト】\n');

  const cdp = await connectCDP();

  try {
    // 任意のページに移動（拡張機能がロードされる場所）
    console.log('ページにアクセス中...');
    await cdp.navigate('https://www.db.yugioh-card.com/yugiohdb/');
    await cdp.wait(5000);

    console.log('\n=== 1. window.ai APIの確認 ===\n');

    // window.aiが利用可能か確認
    const aiAvailable = await cdp.evaluate(`
      typeof window.ai !== 'undefined' && typeof window.ai.createTextSession !== 'undefined'
    `);

    if (!aiAvailable) {
      console.log('❌ window.ai APIは利用できません');
      console.log('ヒント: Chromeのフラグで optimization-guide-on-device-model を有効にする必要があります');
      cdp.close();
      return;
    }

    console.log('✅ window.ai APIは利用可能です');

    console.log('\n=== 2. セッション作成 ===\n');

    // セッションを作成
    const sessionCreated = await cdp.evaluate(`
      (async () => {
        try {
          const session = await window.ai.createTextSession();
          window.__geminiSession = session;
          return { success: true };
        } catch (e) {
          return { success: false, error: e.message };
        }
      })()
    `);

    if (!sessionCreated.success) {
      console.log('❌ セッション作成に失敗:', sessionCreated.error);
      cdp.close();
      return;
    }

    console.log('✅ セッション作成に成功');

    console.log('\n=== 3. プロンプト実行 ===\n');
    console.log('カード:', testCard.name);
    console.log('プロンプト長:', prompt.length, '文字\n');

    // プロンプトを実行
    const startTime = Date.now();
    const result = await cdp.evaluate(`
      (async () => {
        try {
          const session = window.__geminiSession;
          const prompt = ${JSON.stringify(prompt)};
          const response = await session.prompt(prompt);
          return { success: true, response };
        } catch (e) {
          return { success: false, error: e.message, stack: e.stack };
        }
      })()
    `);
    const endTime = Date.now();

    if (!result.success) {
      console.log('❌ プロンプト実行に失敗:', result.error);
      if (result.stack) {
        console.log('Stack:', result.stack);
      }
      cdp.close();
      return;
    }

    console.log(`✅ プロンプト実行に成功 (${endTime - startTime}ms)`);

    // 結果をパース
    console.log('\n=== 4. 結果の解析 ===\n');

    let jsonResponse;
    try {
      // markdownコードブロックを削除
      let content = result.response;
      content = content.replace(/^```json\\s*\\n/, '').replace(/\\n```$/, '');
      content = content.trim();

      jsonResponse = JSON.parse(content);
    } catch (e) {
      console.log('❌ JSONのパースに失敗:', e.message);
      console.log('\n生の応答:');
      console.log(result.response);
      cdp.close();
      return;
    }

    // 結果を表示
    console.log('抽出された条件数:', jsonResponse.results?.[0]?.conditions?.length || 0);
    console.log('');

    if (jsonResponse.results?.[0]?.conditions) {
      jsonResponse.results[0].conditions.forEach((condition: { text: string; filters: unknown }, index: number) => {
        console.log(`条件${index + 1}: ${condition.text}`);
        if (condition.filters) {
          console.log('  filters:', JSON.stringify(condition.filters, null, 2));
        }
      });
    }

    console.log('\n=== 5. 期待される条件との比較 ===\n');

    const expectedConditions = [
      '幻竜族モンスター',
      '効果モンスター以外の表側表示モンスター',
      '幻竜族Sモンスター',
      '「天威」Lモンスター'
    ];

    console.log('期待される条件数:', expectedConditions.length);
    console.log('');

    const extractedTexts = jsonResponse.results?.[0]?.conditions?.map((c: { text: string }) => c.text) || [];

    expectedConditions.forEach((expected, index) => {
      const found = extractedTexts.some((extracted: string) => extracted.includes(expected));
      if (found) {
        console.log(`✅ 条件${index + 1}: "${expected}" は抽出されました`);
      } else {
        console.log(`❌ 条件${index + 1}: "${expected}" は抽出されていません`);
      }
    });

    console.log('\n【テスト完了】\n');

    // 成功率を計算
    const successCount = expectedConditions.filter(expected =>
      extractedTexts.some((extracted: string) => extracted.includes(expected))
    ).length;

    const successRate = Math.round((successCount / expectedConditions.length) * 100);
    console.log(`成功率: ${successCount}/${expectedConditions.length} (${successRate}%)`);

    cdp.close();
  } catch (error) {
    console.error('エラー:', error);
    cdp.close();
    process.exit(1);
  }
}

// テスト実行
testGeminiNano();
