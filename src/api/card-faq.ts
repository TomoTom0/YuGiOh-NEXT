import { CardFAQ, CardFAQList } from '@/types/card';

const FAQ_SEARCH_URL = 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action';

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
    // URLパラメータを構築
    const params = new URLSearchParams({
      ope: '4',
      cid: cardId,
      request_locale: 'ja'
    });

    const response = await fetch(`${FAQ_SEARCH_URL}?${params.toString()}`, {
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
    
    // カードテキストを取得
    const cardTextElem = doc.querySelector('.cardtext, .card_text');
    const cardText = cardTextElem?.textContent?.trim() || undefined;
    
    // 補足情報を取得
    const supplementElem = doc.querySelector('.supplement');
    let supplementInfo: string | undefined = undefined;
    let supplementDate: string | undefined = undefined;
    
    if (supplementElem) {
      // 日付を取得
      const dateElem = supplementElem.querySelector('.title .update');
      supplementDate = dateElem?.textContent?.trim() || undefined;
      
      // テキストを取得（改行を保持）
      const textElem = supplementElem.querySelector('.text');
      if (textElem) {
        const cloned = textElem.cloneNode(true) as HTMLElement;
        cloned.querySelectorAll('br').forEach(br => {
          br.replaceWith('\n');
        });
        supplementInfo = cloned.textContent?.trim() || undefined;
      }
    }

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
      const linkValueInput = rowElement.querySelector('input.link_value') as HTMLInputElement;
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
      cardText,
      supplementInfo,
      supplementDate,
      faqs
    };
  } catch (error) {
    console.error('Failed to get card FAQ list:', error);
    return null;
  }
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
 * ```
 */
export async function getFAQDetail(faqId: string): Promise<CardFAQ | null> {
  try {
    // URLパラメータを構築
    const params = new URLSearchParams({
      ope: '5',
      fid: faqId,
      request_locale: 'ja'
    });

    const response = await fetch(`${FAQ_SEARCH_URL}?${params.toString()}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 質問文を取得（#question_text から）
    const questionElem = doc.querySelector('#question_text');
    const question = questionElem?.textContent?.trim();

    if (!question) {
      return null; // 質問が取得できない場合は失敗
    }

    // 回答を取得（#answer_text から）改行を保持
    const answerElem = doc.querySelector('#answer_text');
    let answer = '';
    if (answerElem) {
      // <br>を改行に変換
      const cloned = answerElem.cloneNode(true) as HTMLElement;
      cloned.querySelectorAll('br').forEach(br => {
        br.replaceWith('\n');
      });
      answer = cloned.textContent?.trim() || '';
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
