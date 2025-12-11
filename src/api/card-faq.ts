import { CardFAQ, CardFAQList } from '@/types/card';
import { detectCardGameType } from '@/utils/page-detector';
import { buildApiUrl } from '@/utils/url-builder';
import { queuedFetch } from '@/utils/request-queue';
import { safeQueryAs, isHTMLInputElement } from '@/utils/type-guards';

/**
 * カードQA一覧を取得する
 *
 * @param cardId カードID (cid)
 * @returns カードQA一覧情報、取得失敗時はnull
 *
 * @example
 * ```typescript
 * const faqList = await getCardFAQList('4335'); // ブラック・マジシャン
 * console.log(`Found ${faqList.faqs.length} FAQs`);
 * ```
 */
export async function getCardFAQList(cardId: string): Promise<CardFAQList | null> {
  try {
    // URLパラメータを別の辞書として buildApiUrl に渡す
    const gameType = detectCardGameType();
    const params = new URLSearchParams({
      ope: '4',
      cid: cardId
    });
    const url = buildApiUrl('faq_search.action', gameType, params);

    const response = await queuedFetch(url, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // タイトルからカード名を抽出
    // タイトル形式: "カード名 | カードに関連するＱ＆Ａ | 遊戯王ニューロン..."
    const titleElem = doc.querySelector('title');
    const title = titleElem?.textContent || '';
    const cardName = title.split('|')[0]?.trim() || '';

    // 補足情報を取得（カードテキスト用）
    let supplementInfo: string | undefined = undefined;
    let supplementDate: string | undefined = undefined;

    // 補足情報を取得（ペンデュラムテキスト用）
    let pendulumSupplementInfo: string | undefined = undefined;
    let pendulumSupplementDate: string | undefined = undefined;

    // 全ての.supplement要素を取得
    const supplementElems = doc.querySelectorAll('.supplement');

    supplementElems.forEach(supplementElem => {
      // テキスト要素のIDで判別
      const textElem = supplementElem.querySelector('.text');
      if (!textElem) return;

      const textId = textElem.id;

      // 日付を取得
      const dateElem = supplementElem.querySelector('.title .update');
      const date = dateElem?.textContent?.trim() || undefined;

      // テキストを取得（改行を保持、カードリンクをテンプレート形式に変換）
      const text = convertCardLinksToTemplate(textElem as HTMLElement) || undefined;

      // IDで判別して適切なフィールドに格納
      if (textId === 'pen_supplement') {
        // ペンデュラムテキストの補足情報
        pendulumSupplementInfo = text;
        pendulumSupplementDate = date;
      } else if (textId === 'supplement') {
        // カードテキストの補足情報
        supplementInfo = text;
        supplementDate = date;
      }
    });

    // FAQ一覧をパース
    const faqs: CardFAQ[] = [];
    const rows = doc.querySelectorAll('.t_row');

    rows.forEach(row => {
      const rowElement = row as HTMLElement;

      // 質問文を取得
      const questionElem = rowElement.querySelector('.dack_name span.name');
      const question = questionElem?.textContent?.trim();

      if (!question) {
        return; // 質問がない場合はスキップ
      }

      // FAQ IDを取得
      const linkValueInput = safeQueryAs('input.link_value', isHTMLInputElement, rowElement);
      if (!linkValueInput?.value) {
        return;
      }

      // "/yugiohdb/faq_search.action?ope=5&fid=115&keyword=&tag=-1" から fid を抽出
      const match = linkValueInput.value.match(/[?&]fid=(\d+)/);
      if (!match || !match[1]) {
        return;
      }
      const faqId = match[1];

      // 更新日を取得（オプション）
      const dateElem = rowElement.querySelector('.div.date');
      const updatedAt = dateElem?.textContent?.trim().replace('更新日:', '').trim() || undefined;

      faqs.push({
        faqId,
        question,
        answer: '', // 一覧ページには回答は含まれない
        updatedAt
      });
    });

    return {
      cardId,
      cardName,
      supplementInfo,
      supplementDate,
      pendulumSupplementInfo,
      pendulumSupplementDate,
      faqs
    };
  } catch (error) {
    console.error('Failed to get card FAQ list:', error);
    return null;
  }
}

/**
 * HTMLElement内のカードリンクを {{カード名|cid}} 形式のテンプレートに変換
 *
 * @param element 変換対象のHTMLElement
 * @returns 変換後のテキスト
 *
 * @example
 * ```html
 * <div>「<a href="faq_search.action?ope=4&cid=5533">王家の眠る谷－ネクロバレー</a>」の効果</div>
 * ```
 * ↓
 * ```
 * 「{{王家の眠る谷－ネクロバレー|5533}}」の効果
 * ```
 */
function convertCardLinksToTemplate(element: HTMLElement): string {
  const cloned = element.cloneNode(true) as HTMLElement;

  // <br>を改行に変換
  cloned.querySelectorAll('br').forEach(br => {
    br.replaceWith('\n');
  });

  // カードリンク <a href="...?cid=5533">カード名</a> を {{カード名|5533}} に変換
  cloned.querySelectorAll('a[href*="cid="]').forEach(link => {
    const href = link.getAttribute('href') || '';
    const match = href.match(/[?&]cid=(\d+)/);
    if (match && match[1]) {
      const cardId = match[1];
      const cardName = link.textContent?.trim() || '';
      // {{カード名|cid}} 形式に変換
      link.replaceWith(`{{${cardName}|${cardId}}}`);
    }
  });

  return cloned.textContent?.trim() || '';
}

/**
 * 個別QA詳細を取得する
 *
 * @param faqId FAQ ID (fid)
 * @returns QA情報、取得失敗時はnull
 *
 * @example
 * ```typescript
 * const faq = await getFAQDetail('115');
 * console.log('Q:', faq.question);
 * console.log('A:', faq.answer);
 * // 質問や回答に含まれるカードリンクは {{カード名|cid}} 形式で保存される
 * ```
 */
export async function getFAQDetail(faqId: string): Promise<CardFAQ | null> {
  try {
    // URLパラメータを別の辞書として buildApiUrl に渡す
    const gameType = detectCardGameType();
    const params = new URLSearchParams({
      ope: '5',
      fid: faqId
    });
    const url = buildApiUrl('faq_search.action', gameType, params);
    const response = await queuedFetch(url, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 質問文を取得（#question_text から）カードリンクをテンプレート形式に変換
    const questionElem = doc.querySelector('#question_text');
    if (!questionElem) {
      return null; // 質問が取得できない場合は失敗
    }
    const question = convertCardLinksToTemplate(questionElem as HTMLElement);

    if (!question) {
      return null;
    }

    // 回答を取得（#answer_text から）カードリンクをテンプレート形式に変換
    const answerElem = doc.querySelector('#answer_text');
    let answer = '';
    if (answerElem) {
      answer = convertCardLinksToTemplate(answerElem as HTMLElement);
    }

    // 更新日を取得（オプション）
    const dateElem = doc.querySelector('#tag_update .date');
    const updatedAt = dateElem?.textContent?.trim() || undefined;

    return {
      faqId,
      question,
      answer,
      updatedAt
    };
  } catch (error) {
    console.error('Failed to get FAQ detail:', error);
    return null;
  }
}
