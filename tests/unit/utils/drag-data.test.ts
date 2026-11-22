import { describe, it, expect } from 'vitest';
import {
  isDragEvent,
  setDragData,
  parseDragData,
  isPracticeDragData,
  isDeckDragData,
} from '../../../src/utils/drag-data';

/**
 * drag-data.ts のユニットテスト。
 *
 * tests/design/drag-data/conditions.toml の各[[condition]]をカバーする。
 * [covers:<id>]タグでconditions.tomlのidと対応させる。
 *
 * happy-domではDragEvent.dataTransferがreadonlyプロパティのため、直接代入はできない
 * （TS上も"Cannot assign to 'dataTransfer' because it is a read-only property"となる）。
 * useDragQuarter.test.ts と同様に Object.defineProperty の getter で値をセットする。
 *
 * また、happy-domではwindow.DragEventがEventクラスへの単純なエイリアスのため、
 * new Event(...)で作ったインスタンスもinstanceof DragEventがtrueになってしまう。
 * そのためisDragEventの「event instanceof DragEventがfalseになる」分岐はテスト環境上
 * 再現できない（conditions.tomlでverified=falseとして記載）。
 */

function withDataTransfer(event: DragEvent, dataTransfer: DataTransfer | null): DragEvent {
  Object.defineProperty(event, 'dataTransfer', { configurable: true, get: () => dataTransfer });
  return event;
}

describe('isDragEvent', () => {
  it('DragEventインスタンスかつdataTransferが存在する場合はtrueを返す [covers:is-drag-event.true-when-instance-and-data-transfer-present]', () => {
    const event = withDataTransfer(new DragEvent('drop'), new DataTransfer());

    expect(isDragEvent(event)).toBe(true);
  });

  it('DragEventインスタンスだがdataTransferがnullの場合はfalseを返す [covers:is-drag-event.false-when-data-transfer-null]', () => {
    const event = withDataTransfer(new DragEvent('drop'), null);

    expect(isDragEvent(event)).toBe(false);
  });

  it('happy-domではDragEventがEventのエイリアスのため、DragEventでないEventを弾く分岐は検証不能 [covers:is-drag-event.false-when-not-drag-event-instance]', () => {
    // 当該条件の unverifiable_reason の前提そのものを固定する。
    // 環境が変わってこのテストが失敗したら、分岐の実検証へ切り替える合図になる
    expect(window.DragEvent).toBe(window.Event);
  });
});

describe('setDragData', () => {
  it('dataTransferがnullの場合はsetDataを呼ばずreturnする [covers:set-drag-data.no-data-transfer-no-op]', () => {
    const event = withDataTransfer(new DragEvent('dragstart'), null);

    expect(() => setDragData(event, { foo: 'bar' })).not.toThrow();
  });

  it('dataTransferが存在する場合はJSON.stringifyした文字列をtext/plainでsetDataする [covers:set-drag-data.sets-json-stringified-data]', () => {
    const dataTransfer = new DataTransfer();
    const event = withDataTransfer(new DragEvent('dragstart'), dataTransfer);
    const data = { sectionType: 'main', index: 0, card: {}, uuid: 'u1' };

    setDragData(event, data);

    expect(dataTransfer.getData('text/plain')).toBe(JSON.stringify(data));
  });
});

describe('parseDragData', () => {
  it('dataTransferがnullの場合はnullを返す [covers:parse-drag-data.no-data-transfer-returns-null]', () => {
    const event = withDataTransfer(new DragEvent('drop'), null);

    expect(parseDragData(event)).toBeNull();
  });

  it('getDataが空文字列の場合はnullを返す [covers:parse-drag-data.empty-raw-returns-null]', () => {
    const dataTransfer = new DataTransfer();
    const event = withDataTransfer(new DragEvent('drop'), dataTransfer);

    expect(parseDragData(event)).toBeNull();
  });

  it('正当なJSON文字列の場合はパースした値を返す [covers:parse-drag-data.valid-json-returns-parsed-value]', () => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', JSON.stringify({ a: 1 }));
    const event = withDataTransfer(new DragEvent('drop'), dataTransfer);

    expect(parseDragData(event)).toEqual({ a: 1 });
  });

  it('不正なJSON文字列の場合は例外を投げずnullを返す [covers:parse-drag-data.invalid-json-caught-returns-null]', () => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', 'not-json{');
    const event = withDataTransfer(new DragEvent('drop'), dataTransfer);

    expect(() => parseDragData(event)).not.toThrow();
    expect(parseDragData(event)).toBeNull();
  });
});

describe('isPracticeDragData', () => {
  it('オブジェクトでない場合はfalseを返す [covers:is-practice-drag-data.non-object-false]', () => {
    expect(isPracticeDragData('not-an-object')).toBe(false);
  });

  it('nullの場合はfalseを返す [covers:is-practice-drag-data.null-false]', () => {
    expect(isPracticeDragData(null)).toBe(false);
  });

  it('cardIdが欠落または文字列以外の場合はfalseを返す [covers:is-practice-drag-data.missing-or-non-string-cardid-false]', () => {
    expect(isPracticeDragData({ zone: 'hand' })).toBe(false);
    expect(isPracticeDragData({ cardId: 1, zone: 'hand' })).toBe(false);
  });

  it('zoneが欠落または文字列以外の場合はfalseを返す [covers:is-practice-drag-data.missing-or-non-string-zone-false]', () => {
    expect(isPracticeDragData({ cardId: 'c1' })).toBe(false);
    expect(isPracticeDragData({ cardId: 'c1', zone: 1 })).toBe(false);
  });

  it('cardId/zoneが両方とも文字列の場合はtrueを返す [covers:is-practice-drag-data.valid-true]', () => {
    expect(isPracticeDragData({ cardId: 'c1', zone: 'hand' })).toBe(true);
  });
});

describe('isDeckDragData', () => {
  it('オブジェクトでない場合はfalseを返す [covers:is-deck-drag-data.non-object-false]', () => {
    expect(isDeckDragData(123)).toBe(false);
  });

  it('nullの場合はfalseを返す [covers:is-deck-drag-data.null-false]', () => {
    expect(isDeckDragData(null)).toBe(false);
  });

  it('sectionTypeが欠落または文字列以外の場合はfalseを返す [covers:is-deck-drag-data.missing-or-non-string-sectiontype-false]', () => {
    expect(isDeckDragData({ card: { cardId: '100', ciid: '1' } })).toBe(false);
    expect(isDeckDragData({ sectionType: 1, card: { cardId: '100', ciid: '1' } })).toBe(false);
  });

  it('cardがnull/undefinedの場合はfalseを返す [covers:is-deck-drag-data.card-nullish-false]', () => {
    expect(isDeckDragData({ sectionType: 'main', card: null })).toBe(false);
    expect(isDeckDragData({ sectionType: 'main' })).toBe(false);
  });

  it('cardがオブジェクトでない場合はfalseを返す [covers:is-deck-drag-data.card-non-object-false]', () => {
    expect(isDeckDragData({ sectionType: 'main', card: 'card' })).toBe(false);
    expect(isDeckDragData({ sectionType: 'main', card: 42 })).toBe(false);
    expect(isDeckDragData({ sectionType: 'main', card: [] })).toBe(false);
  });

  it('cardに識別子（cardId/cid）が無い、または識別子として使えない値の場合はfalseを返す [covers:is-deck-drag-data.card-missing-identifier-false]', () => {
    expect(isDeckDragData({ sectionType: 'main', card: { ciid: '1' } })).toBe(false);
    expect(isDeckDragData({ sectionType: 'main', card: { cardId: null, ciid: '1' } })).toBe(false);
    expect(isDeckDragData({ sectionType: 'main', card: { cardId: '', ciid: '1' } })).toBe(false);
    expect(isDeckDragData({ sectionType: 'main', card: { cardId: true, ciid: '1' } })).toBe(false);
    // cardIdが存在するが使えない値の場合、消費側の ?? はcidへ進まないためcidが有効でもfalse
    expect(isDeckDragData({ sectionType: 'main', card: { cardId: '', cid: '100', ciid: '1' } })).toBe(
      false
    );
    expect(
      isDeckDragData({ sectionType: 'main', card: { cardId: true, cid: '100', ciid: '1' } })
    ).toBe(false);
  });

  it('cardのciidが欠落、または識別子として使えない値の場合はfalseを返す [covers:is-deck-drag-data.card-missing-or-invalid-ciid-false]', () => {
    expect(isDeckDragData({ sectionType: 'main', card: { cardId: '100' } })).toBe(false);
    expect(isDeckDragData({ sectionType: 'main', card: { cid: '100', ciid: null } })).toBe(false);
    expect(isDeckDragData({ sectionType: 'main', card: { cardId: '100', ciid: '' } })).toBe(false);
  });

  it('sectionTypeが文字列でcardにcardIdとciidがある場合はtrueを返す [covers:is-deck-drag-data.valid-true]', () => {
    expect(
      isDeckDragData({
        sectionType: 'main',
        index: 0,
        card: { cardId: '100', ciid: '1' },
        uuid: 'u1',
      })
    ).toBe(true);
  });

  it('cardの識別子がcidのみの場合もtrueを返す [covers:is-deck-drag-data.valid-true-with-cid-only]', () => {
    expect(
      isDeckDragData({
        sectionType: 'main',
        index: 0,
        card: { cid: '100', ciid: '1' },
        uuid: 'u1',
      })
    ).toBe(true);
    // cardIdがnullの場合も、消費側の ?? がcidへ進むためtrue
    expect(
      isDeckDragData({ sectionType: 'main', card: { cardId: null, cid: '100', ciid: '1' } })
    ).toBe(true);
  });

  it('識別子とciidが数値の場合もtrueを返す（文字列化は消費側の責務） [covers:is-deck-drag-data.valid-true-with-numeric-ids]', () => {
    expect(isDeckDragData({ sectionType: 'main', card: { cardId: 100, ciid: 1 } })).toBe(true);
  });
});
