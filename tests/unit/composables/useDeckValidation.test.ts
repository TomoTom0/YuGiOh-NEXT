import { describe, it, expect } from 'vitest';
import { canMoveCard } from '../../../src/composables/deck/useDeckValidation';
import type { CardInfo } from '../../../src/types/card';

// テスト用のカードデータ
const normalMonster: CardInfo = {
  cardId: '1',
  ciid: 0,
  imgs: '1_0',
  name: '通常モンスター',
  cardType: 'monster',
  attribute: 'dark',
  level: 4,
  race: 'warrior',
  atkDef: '1800/1000',
  monsterTypes: ['normal']
};

const fusionMonster: CardInfo = {
  cardId: '2',
  ciid: 0,
  imgs: '2_0',
  name: '融合モンスター',
  cardType: 'monster',
  attribute: 'dark',
  level: 8,
  race: 'warrior',
  atkDef: '2500/2000',
  monsterTypes: ['fusion'],
  types: ['fusion']
};

const synchroMonster: CardInfo = {
  cardId: '3',
  ciid: 0,
  imgs: '3_0',
  name: 'シンクロモンスター',
  cardType: 'monster',
  attribute: 'dark',
  level: 8,
  race: 'warrior',
  atkDef: '2800/2000',
  monsterTypes: ['synchro'],
  types: ['synchro']
};

const xyzMonster: CardInfo = {
  cardId: '4',
  ciid: 0,
  imgs: '4_0',
  name: 'エクシーズモンスター',
  cardType: 'monster',
  attribute: 'dark',
  rank: 4,
  race: 'warrior',
  atkDef: '2000/1500',
  monsterTypes: ['xyz'],
  types: ['xyz']
};

const linkMonster: CardInfo = {
  cardId: '5',
  ciid: 0,
  imgs: '5_0',
  name: 'リンクモンスター',
  cardType: 'monster',
  attribute: 'dark',
  race: 'warrior',
  atkDef: '1800/-',
  monsterTypes: ['link'],
  types: ['link']
};

const spellCard: CardInfo = {
  cardId: '6',
  ciid: 0,
  imgs: '6_0',
  name: '魔法カード',
  cardType: 'spell',
  spellType: 'normal'
};

const trapCard: CardInfo = {
  cardId: '7',
  ciid: 0,
  imgs: '7_0',
  name: '罠カード',
  cardType: 'trap',
  trapType: 'normal'
};

describe('useDeckValidation', () => {
  describe('searchからの移動', () => {
    it('searchからtrashへは移動不可', () => {
      expect(canMoveCard('search', 'trash', normalMonster)).toBe(false);
    });

    describe('searchからmainへ', () => {
      it('通常モンスターは可', () => {
        expect(canMoveCard('search', 'main', normalMonster)).toBe(true);
      });

      it('融合モンスターは不可', () => {
        expect(canMoveCard('search', 'main', fusionMonster)).toBe(false);
      });

      it('シンクロモンスターは不可', () => {
        expect(canMoveCard('search', 'main', synchroMonster)).toBe(false);
      });

      it('エクシーズモンスターは不可', () => {
        expect(canMoveCard('search', 'main', xyzMonster)).toBe(false);
      });

      it('リンクモンスターは不可', () => {
        expect(canMoveCard('search', 'main', linkMonster)).toBe(false);
      });

      it('魔法カードは可', () => {
        expect(canMoveCard('search', 'main', spellCard)).toBe(true);
      });

      it('罠カードは可', () => {
        expect(canMoveCard('search', 'main', trapCard)).toBe(true);
      });
    });

    describe('searchからextraへ', () => {
      it('通常モンスターは不可', () => {
        expect(canMoveCard('search', 'extra', normalMonster)).toBe(false);
      });

      it('融合モンスターは可', () => {
        expect(canMoveCard('search', 'extra', fusionMonster)).toBe(true);
      });

      it('シンクロモンスターは可', () => {
        expect(canMoveCard('search', 'extra', synchroMonster)).toBe(true);
      });

      it('エクシーズモンスターは可', () => {
        expect(canMoveCard('search', 'extra', xyzMonster)).toBe(true);
      });

      it('リンクモンスターは可', () => {
        expect(canMoveCard('search', 'extra', linkMonster)).toBe(true);
      });
    });

    describe('searchからsideへは常に許可', () => {
      it('通常モンスター', () => {
        expect(canMoveCard('search', 'side', normalMonster)).toBe(true);
      });

      it('融合モンスター', () => {
        expect(canMoveCard('search', 'side', fusionMonster)).toBe(true);
      });

      it('魔法カード', () => {
        expect(canMoveCard('search', 'side', spellCard)).toBe(true);
      });
    });
  });

  describe('trashへの移動は全て不可', () => {
    it('mainからtrashへは移動不可', () => {
      expect(canMoveCard('main', 'trash', normalMonster)).toBe(false);
    });

    it('extraからtrashへは移動不可', () => {
      expect(canMoveCard('extra', 'trash', fusionMonster)).toBe(false);
    });

    it('sideからtrashへは移動不可', () => {
      expect(canMoveCard('side', 'trash', spellCard)).toBe(false);
    });
  });

  describe('trashからの移動は全て許可', () => {
    it('trashからmainへは許可', () => {
      expect(canMoveCard('trash', 'main', normalMonster)).toBe(true);
    });

    it('trashからextraへは許可', () => {
      expect(canMoveCard('trash', 'extra', fusionMonster)).toBe(true);
    });

    it('trashからsideへは許可', () => {
      expect(canMoveCard('trash', 'side', spellCard)).toBe(true);
    });
  });

  describe('main/extra/side間の移動', () => {
    describe('mainへ', () => {
      it('extraからmainへ - 通常モンスターは可', () => {
        expect(canMoveCard('extra', 'main', normalMonster)).toBe(true);
      });

      it('extraからmainへ - 融合モンスターは不可', () => {
        expect(canMoveCard('extra', 'main', fusionMonster)).toBe(false);
      });

      it('sideからmainへ - 魔法カードは可', () => {
        expect(canMoveCard('side', 'main', spellCard)).toBe(true);
      });
    });

    describe('extraへ', () => {
      it('mainからextraへ - 通常モンスターは不可', () => {
        expect(canMoveCard('main', 'extra', normalMonster)).toBe(false);
      });

      it('mainからextraへ - 融合モンスターは可', () => {
        expect(canMoveCard('main', 'extra', fusionMonster)).toBe(true);
      });

      it('sideからextraへ - リンクモンスターは可', () => {
        expect(canMoveCard('side', 'extra', linkMonster)).toBe(true);
      });
    });

    describe('sideへは常に許可', () => {
      it('mainからsideへは常に許可', () => {
        expect(canMoveCard('main', 'side', normalMonster)).toBe(true);
      });

      it('extraからsideへは常に許可', () => {
        expect(canMoveCard('extra', 'side', fusionMonster)).toBe(true);
      });
    });
  });
});
