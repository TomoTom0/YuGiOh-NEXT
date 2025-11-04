import { detectCardType } from '../detector';

/**
 * カードタイプ検出関数のテスト
 *
 * DOM属性ベースの検出方法を使用：
 * - img要素のsrc属性に 'attribute_icon_spell.png' → 魔法
 * - img要素のsrc属性に 'attribute_icon_trap.png' → 罠
 * - img要素のsrc属性に 'attribute_icon_(light|dark|water|fire|earth|wind|divine).png' → モンスター
 */
describe('detectCardType', () => {
  describe('魔法カードの検出', () => {
    it('attribute_icon_spell.png を含むimg要素から魔法カードを検出できる', () => {
      // Arrange
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="box_card_attribute">
          <img src="https://www.db.yugioh-card.com/yugiohdb/icon/attribute_icon_spell.png" alt="魔法">
        </div>
      `;
      const row = container.firstElementChild as HTMLElement;

      // Act
      const cardType = detectCardType(row);

      // Assert
      expect(cardType).toBe('魔法');
    });

    it('相対パスのattribute_icon_spell.pngからも検出できる', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="box_card_attribute">
          <img src="/yugiohdb/icon/attribute_icon_spell.png">
        </div>
      `;
      const row = container.firstElementChild as HTMLElement;

      const cardType = detectCardType(row);
      expect(cardType).toBe('魔法');
    });
  });

  describe('罠カードの検出', () => {
    it('attribute_icon_trap.png を含むimg要素から罠カードを検出できる', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="box_card_attribute">
          <img src="https://www.db.yugioh-card.com/yugiohdb/icon/attribute_icon_trap.png" alt="罠">
        </div>
      `;
      const row = container.firstElementChild as HTMLElement;

      const cardType = detectCardType(row);
      expect(cardType).toBe('罠');
    });
  });

  describe('モンスターカードの検出', () => {
    it('attribute_icon_light.png を含むimg要素から光属性モンスターを検出できる', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="box_card_attribute">
          <img src="https://www.db.yugioh-card.com/yugiohdb/icon/attribute_icon_light.png" alt="光">
        </div>
      `;
      const row = container.firstElementChild as HTMLElement;

      const cardType = detectCardType(row);
      expect(cardType).toBe('モンスター');
    });

    it('attribute_icon_dark.png を含むimg要素から闇属性モンスターを検出できる', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="box_card_attribute">
          <img src="/yugiohdb/icon/attribute_icon_dark.png">
        </div>
      `;
      const row = container.firstElementChild as HTMLElement;

      const cardType = detectCardType(row);
      expect(cardType).toBe('モンスター');
    });

    it('attribute_icon_water.png を含むimg要素から水属性モンスターを検出できる', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="box_card_attribute">
          <img src="/yugiohdb/icon/attribute_icon_water.png">
        </div>
      `;
      const row = container.firstElementChild as HTMLElement;

      const cardType = detectCardType(row);
      expect(cardType).toBe('モンスター');
    });

    it('attribute_icon_fire.png を含むimg要素から炎属性モンスターを検出できる', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="box_card_attribute">
          <img src="/yugiohdb/icon/attribute_icon_fire.png">
        </div>
      `;
      const row = container.firstElementChild as HTMLElement;

      const cardType = detectCardType(row);
      expect(cardType).toBe('モンスター');
    });

    it('attribute_icon_earth.png を含むimg要素から地属性モンスターを検出できる', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="box_card_attribute">
          <img src="/yugiohdb/icon/attribute_icon_earth.png">
        </div>
      `;
      const row = container.firstElementChild as HTMLElement;

      const cardType = detectCardType(row);
      expect(cardType).toBe('モンスター');
    });

    it('attribute_icon_wind.png を含むimg要素から風属性モンスターを検出できる', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="box_card_attribute">
          <img src="/yugiohdb/icon/attribute_icon_wind.png">
        </div>
      `;
      const row = container.firstElementChild as HTMLElement;

      const cardType = detectCardType(row);
      expect(cardType).toBe('モンスター');
    });

    it('attribute_icon_divine.png を含むimg要素から神属性モンスターを検出できる', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="box_card_attribute">
          <img src="/yugiohdb/icon/attribute_icon_divine.png">
        </div>
      `;
      const row = container.firstElementChild as HTMLElement;

      const cardType = detectCardType(row);
      expect(cardType).toBe('モンスター');
    });
  });

  describe('エラーケース', () => {
    it('img要素が見つからない場合はnullを返す', () => {
      const container = document.createElement('div');
      container.innerHTML = `<div class="box_card_attribute"></div>`;
      const row = container.firstElementChild as HTMLElement;

      const cardType = detectCardType(row);
      expect(cardType).toBeNull();
    });

    it('src属性が空の場合はnullを返す', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="box_card_attribute">
          <img src="">
        </div>
      `;
      const row = container.firstElementChild as HTMLElement;

      const cardType = detectCardType(row);
      expect(cardType).toBeNull();
    });

    it('認識できないsrc属性の場合はnullを返す', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="box_card_attribute">
          <img src="/yugiohdb/icon/unknown_icon.png">
        </div>
      `;
      const row = container.firstElementChild as HTMLElement;

      const cardType = detectCardType(row);
      expect(cardType).toBeNull();
    });

    it('.box_card_attribute要素が見つからない場合はnullを返す', () => {
      const container = document.createElement('div');
      container.innerHTML = `<div><img src="/yugiohdb/icon/attribute_icon_spell.png"></div>`;
      const row = container.firstElementChild as HTMLElement;

      const cardType = detectCardType(row);
      expect(cardType).toBeNull();
    });
  });
});
