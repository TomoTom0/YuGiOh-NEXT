import { describe, it, expect } from 'vitest';
import {
  extractSkeleton,
  extractCoveredFunctions,
  findUncoveredFunctions,
} from '../../../scripts/design/extract-ast-skeleton';

describe('extractSkeleton', () => {
  it('exportされた関数のみを対象とし、非export関数は無視する', () => {
    const src = `
      function internalHelper(): void {}
      export function foo(a: string, b: number = 1): void {}
    `;
    const result = extractSkeleton(src, 'test.ts');
    expect(result.map(f => f.name)).toEqual(['foo']);
  });

  it('引数のデフォルト値を検出する', () => {
    const src = `
      export function foo(a: string, b: number = 1): void {}
    `;
    const result = extractSkeleton(src, 'test.ts');
    expect(result[0].params).toEqual([
      { name: 'a', hasDefault: false, defaultText: undefined },
      { name: 'b', hasDefault: true, defaultText: '1' },
    ]);
  });

  it('throw文を行番号とメッセージ付きで検出する', () => {
    const src = `
      export function foo(x: number): void {
        if (x < 0) {
          throw new Error("negative");
        }
      }
    `;
    const result = extractSkeleton(src, 'test.ts');
    expect(result[0].throws).toHaveLength(1);
    expect(result[0].throws[0].text).toContain('negative');
  });

  it('return文を検出する（値あり・値なし両方）', () => {
    const src = `
      export function foo(x: number): number | void {
        if (x < 0) {
          return;
        }
        return x * 2;
      }
    `;
    const result = extractSkeleton(src, 'test.ts');
    expect(result[0].returns).toHaveLength(2);
    expect(result[0].returns[0].text).toBe('(値なし)');
    expect(result[0].returns[1].text).toBe('x * 2');
  });

  it('if/switch/caseの分岐点を検出する', () => {
    const src = `
      export function foo(x: number): string {
        if (x === 1) {
          return "one";
        }
        switch (x) {
          case 2:
            return "two";
          default:
            return "other";
        }
      }
    `;
    const result = extractSkeleton(src, 'test.ts');
    const kinds = result[0].branches.map(b => b.kind);
    expect(kinds).toEqual(['if', 'switch', 'case']);
  });

  it('ネストしたコールバック関数内の分岐も同一のexport関数に帰属させる', () => {
    const src = `
      export function foo(items: number[]): void {
        items.forEach((item) => {
          if (item < 0) {
            throw new Error("negative item");
          }
        });
      }
    `;
    const result = extractSkeleton(src, 'test.ts');
    expect(result[0].throws).toHaveLength(1);
    expect(result[0].branches).toHaveLength(1);
  });

  it('exportクラスのstaticメソッドを"ClassName.methodName"として検出する', () => {
    const src = `
      export class Foo {
        static bar(x: number): number {
          if (x < 0) {
            throw new Error("negative");
          }
          return x;
        }
      }
    `;
    const result = extractSkeleton(src, 'test.ts');
    expect(result.map(f => f.name)).toEqual(['Foo.bar']);
    expect(result[0].throws).toHaveLength(1);
  });

  it('exportクラスのインスタンスメソッドを"ClassName#methodName"として検出する', () => {
    const src = `
      export class Foo {
        bar(x: number): number {
          return x;
        }
      }
    `;
    const result = extractSkeleton(src, 'test.ts');
    expect(result.map(f => f.name)).toEqual(['Foo#bar']);
  });

  it('export const代入のアロー関数を検出する', () => {
    const src = `
      export const foo = (x: number): number => {
        if (x < 0) {
          throw new Error("negative");
        }
        return x;
      };
    `;
    const result = extractSkeleton(src, 'test.ts');
    expect(result.map(f => f.name)).toEqual(['foo']);
    expect(result[0].throws).toHaveLength(1);
  });

  it('PiniaストアのdefineStore内でreturnされるローカル関数を"useFooStore#name"として検出する', () => {
    const src = `
      export const useFooStore = defineStore('foo', () => {
        const count = ref(0);
        const bar = () => {
          if (true) {
            throw new Error("unreachable");
          }
        };
        return { count, bar };
      });
    `;
    const result = extractSkeleton(src, 'test.ts');
    // countはref（関数ではない）なので検出対象外、barのみ検出される
    expect(result.map(f => f.name)).toEqual(['useFooStore#bar']);
    expect(result[0].throws).toHaveLength(1);
  });

  it('Piniaストアで"function foo() {}"形式（非export関数宣言）のアクションも検出する', () => {
    // src/stores/settings.ts, practice.ts, deck-edit.tsで実際に使われている書き方。
    // const foo = () => {} だけでなくfunction宣言も検出できないと大半のアクションが漏れる。
    const src = `
      export const useFooStore = defineStore('foo', () => {
        function setTheme(theme: string): void {
          if (theme === 'invalid') {
            throw new Error("invalid theme");
          }
        }
        return { setTheme };
      });
    `;
    const result = extractSkeleton(src, 'test.ts');
    expect(result.map(f => f.name)).toEqual(['useFooStore#setTheme']);
    expect(result[0].throws).toHaveLength(1);
  });

  it('PiniaストアのreturnにないローカルヘルパーはtargetFunction一覧に含まれない', () => {
    const src = `
      export const useFooStore = defineStore('foo', () => {
        const internalHelper = () => 1;
        const bar = () => internalHelper();
        return { bar };
      });
    `;
    const result = extractSkeleton(src, 'test.ts');
    expect(result.map(f => f.name)).toEqual(['useFooStore#bar']);
  });

  it('Piniaストアでreturn文がオブジェクトリテラルでない場合は検出しない', () => {
    const src = `
      export const useFooStore = defineStore('foo', () => {
        const bar = () => 1;
        return bar;
      });
    `;
    const result = extractSkeleton(src, 'test.ts');
    expect(result).toEqual([]);
  });

  it('Pinia Options Store形式（factoryがオブジェクトリテラル）は検出しない（既知の限界）', () => {
    const src = `
      export const useFooStore = defineStore('foo', {
        state: () => ({ count: 0 }),
        actions: {
          increment() { this.count++; },
        },
      });
    `;
    const result = extractSkeleton(src, 'test.ts');
    expect(result).toEqual([]);
  });
});

describe('extractCoveredFunctions', () => {
  it('target_function行からexport関数名の集合を抽出する', () => {
    const toml = `
      [[condition]]
      id = "a.1"
      target_function = "foo"

      [[condition]]
      id = "a.2"
      target_function = "foo"

      [[condition]]
      id = "b.1"
      target_function = "bar"
    `;
    const covered = extractCoveredFunctions(toml);
    expect(covered).toEqual(new Set(['foo', 'bar']));
  });

  it('target_functionが無い場合は空集合を返す', () => {
    const covered = extractCoveredFunctions('[meta]\nfeature = "x"\n');
    expect(covered.size).toBe(0);
  });
});

describe('findUncoveredFunctions', () => {
  it('conditions.tomlのtarget_functionに1件も対応が無いexport関数を検出する', () => {
    const src = `
      export function foo(): void {}
      export function bar(): void {}
    `;
    const functions = extractSkeleton(src, 'test.ts');
    const covered = extractCoveredFunctions('target_function = "foo"');
    const uncovered = findUncoveredFunctions(functions, covered);
    expect(uncovered.map(f => f.name)).toEqual(['bar']);
  });

  it('全てカバーされている場合は空配列を返す', () => {
    const src = `
      export function foo(): void {}
    `;
    const functions = extractSkeleton(src, 'test.ts');
    const covered = extractCoveredFunctions('target_function = "foo"');
    const uncovered = findUncoveredFunctions(functions, covered);
    expect(uncovered).toEqual([]);
  });
});
