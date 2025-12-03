import { describe, it, expect } from 'vitest';
import { mappingManager } from '../../../src/utils/mapping-manager';

describe('MappingManager - Dynamic Mapping Reversal', () => {

  it('should reverse monsterType mappings correctly', () => {
    // 동적 마핑을 메모리에 저장하여 테스트
    const dynamicMapping = {
      race: {
        'dragon': '드래곤족',
        'fiend': '악마족'
      },
      monsterType: {
        'normal': '일반',
        'effect': '효과',
        'synchro': '싱크로',
        'tuner': '튜너'
      },
      attribute: {
        'water': '물',
        'fire': '화염'
      },
      spellEffect: {},
      trapEffect: {}
    };

    // MappingManager의 dynamicMappings에 직접 저장
    (mappingManager as any).dynamicMappings.set('ko-test', dynamicMapping);

    // 테스트: text-to-ID 변환이 정상인지 확인
    const typeMap = mappingManager.getMonsterTypeTextToId('ko-test');

    console.log('\n=== MonsterType Mapping Reversal ===');
    console.log('Expected (text -> id):');
    console.log('  "일반" -> "normal"');
    console.log('  "효과" -> "effect"');
    console.log('  "튜너" -> "tuner"');

    console.log('\nActual:');
    Object.entries(typeMap).forEach(([text, id]) => {
      console.log(`  "${text}" -> "${id}"`);
    });

    // Assertions
    expect(typeMap['일반']).toBe('normal');
    expect(typeMap['효과']).toBe('effect');
    expect(typeMap['싱크로']).toBe('synchro');
    expect(typeMap['튜너']).toBe('tuner');

    console.log('\n✅ MonsterType reversal successful!');
  });

  it('should reverse attribute mappings correctly', () => {
    const dynamicMapping = {
      race: {},
      monsterType: {},
      attribute: {
        'water': '물',
        'fire': '화염',
        'light': '빛'
      },
      spellEffect: {},
      trapEffect: {}
    };

    (mappingManager as any).dynamicMappings.set('ko-attr-test', dynamicMapping);

    const attrMap = mappingManager.getAttributeTextToId('ko-attr-test');

    console.log('\n=== Attribute Mapping Reversal ===');
    console.log('Expected (text -> id):');
    console.log('  "물" -> "water"');
    console.log('  "화염" -> "fire"');

    console.log('\nActual:');
    Object.entries(attrMap).forEach(([text, id]) => {
      console.log(`  "${text}" -> "${id}"`);
    });

    expect(attrMap['물']).toBe('water');
    expect(attrMap['화염']).toBe('fire');
    expect(attrMap['빛']).toBe('light');

    console.log('\n✅ Attribute reversal successful!');
  });

  it('should handle empty mappings gracefully', () => {
    const emptyMapping = {
      race: {},
      monsterType: {},
      attribute: {},
      spellEffect: {},
      trapEffect: {}
    };

    (mappingManager as any).dynamicMappings.set('ko-empty', emptyMapping);

    const typeMap = mappingManager.getMonsterTypeTextToId('ko-empty');
    const attrMap = mappingManager.getAttributeTextToId('ko-empty');

    expect(Object.keys(typeMap).length).toBe(0);
    expect(Object.keys(attrMap).length).toBe(0);

    console.log('\n✅ Empty mapping handling successful!');
  });
});
