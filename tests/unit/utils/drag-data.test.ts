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
  it('DragEventインスタンスかつdataTransferが存在する場合はtrueを返す [covers:is_drag_event.true_when_instance_and_data_transfer_present]', () => {
    const event = withDataTransfer(new DragEvent('drop'), new DataTransfer());

    expect(isDragEvent(event)).toBe(true);
  });

  it('DragEventインスタンスだがdataTransferがnullの場合はfalseを返す [covers:is_drag_event.false_when_data_transfer_null]', () => {
    const event = withDataTransfer(new DragEvent('drop'), null);

    expect(isDragEvent(event)).toBe(false);
  });
});

describe('setDragData', () => {
  it('dataTransferがnullの場合はsetDataを呼ばずreturnする [covers:set_drag_data.no_data_transfer_no_op]', () => {
    const event = withDataTransfer(new DragEvent('dragstart'), null);

    expect(() => setDragData(event, { foo: 'bar' })).not.toThrow();
  });

  it('dataTransferが存在する場合はJSON.stringifyした文字列をtext/plainでsetDataする [covers:set_drag_data.sets_json_stringified_data]', () => {
    const dataTransfer = new DataTransfer();
    const event = withDataTransfer(new DragEvent('dragstart'), dataTransfer);
    const data = { sectionType: 'main', index: 0, card: {}, uuid: 'u1' };

    setDragData(event, data);

    expect(dataTransfer.getData('text/plain')).toBe(JSON.stringify(data));
  });
});

describe('parseDragData', () => {
  it('dataTransferがnullの場合はnullを返す [covers:parse_drag_data.no_data_transfer_returns_null]', () => {
    const event = withDataTransfer(new DragEvent('drop'), null);

    expect(parseDragData(event)).toBeNull();
  });

  it('getDataが空文字列の場合はnullを返す [covers:parse_drag_data.empty_raw_returns_null]', () => {
    const dataTransfer = new DataTransfer();
    const event = withDataTransfer(new DragEvent('drop'), dataTransfer);

    expect(parseDragData(event)).toBeNull();
  });

  it('正当なJSON文字列の場合はパースした値を返す [covers:parse_drag_data.valid_json_returns_parsed_value]', () => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', JSON.stringify({ a: 1 }));
    const event = withDataTransfer(new DragEvent('drop'), dataTransfer);

    expect(parseDragData(event)).toEqual({ a: 1 });
  });

  it('不正なJSON文字列の場合は例外を投げずnullを返す [covers:parse_drag_data.invalid_json_caught_returns_null]', () => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', 'not-json{');
    const event = withDataTransfer(new DragEvent('drop'), dataTransfer);

    expect(() => parseDragData(event)).not.toThrow();
    expect(parseDragData(event)).toBeNull();
  });
});

describe('isPracticeDragData', () => {
  it('オブジェクトでない場合はfalseを返す [covers:is_practice_drag_data.non_object_false]', () => {
    expect(isPracticeDragData('not-an-object')).toBe(false);
  });

  it('nullの場合はfalseを返す [covers:is_practice_drag_data.null_false]', () => {
    expect(isPracticeDragData(null)).toBe(false);
  });

  it('cardIdが欠落または文字列以外の場合はfalseを返す [covers:is_practice_drag_data.missing_or_non_string_cardid_false]', () => {
    expect(isPracticeDragData({ zone: 'hand' })).toBe(false);
    expect(isPracticeDragData({ cardId: 1, zone: 'hand' })).toBe(false);
  });

  it('zoneが欠落または文字列以外の場合はfalseを返す [covers:is_practice_drag_data.missing_or_non_string_zone_false]', () => {
    expect(isPracticeDragData({ cardId: 'c1' })).toBe(false);
    expect(isPracticeDragData({ cardId: 'c1', zone: 1 })).toBe(false);
  });

  it('cardId/zoneが両方とも文字列の場合はtrueを返す [covers:is_practice_drag_data.valid_true]', () => {
    expect(isPracticeDragData({ cardId: 'c1', zone: 'hand' })).toBe(true);
  });
});

describe('isDeckDragData', () => {
  it('オブジェクトでない場合はfalseを返す [covers:is_deck_drag_data.non_object_false]', () => {
    expect(isDeckDragData(123)).toBe(false);
  });

  it('nullの場合はfalseを返す [covers:is_deck_drag_data.null_false]', () => {
    expect(isDeckDragData(null)).toBe(false);
  });

  it('sectionTypeが欠落または文字列以外の場合はfalseを返す [covers:is_deck_drag_data.missing_or_non_string_sectiontype_false]', () => {
    expect(isDeckDragData({ card: {} })).toBe(false);
    expect(isDeckDragData({ sectionType: 1, card: {} })).toBe(false);
  });

  it('cardがnull/undefinedの場合はfalseを返す [covers:is_deck_drag_data.card_nullish_false]', () => {
    expect(isDeckDragData({ sectionType: 'main', card: null })).toBe(false);
    expect(isDeckDragData({ sectionType: 'main' })).toBe(false);
  });

  it('sectionTypeが文字列でcardがnull/undefinedでない場合はtrueを返す [covers:is_deck_drag_data.valid_true]', () => {
    expect(isDeckDragData({ sectionType: 'main', index: 0, card: { id: 1 }, uuid: 'u1' })).toBe(
      true
    );
  });
});
