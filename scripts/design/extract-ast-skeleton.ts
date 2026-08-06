/**
 * AST骨格抽出スクリプト（Phase1.5, TASK-325 / Phase1.6, TASK-326で対応範囲拡張 /
 * TASK-319でPiniaストアのSetup Store形式に対応）
 *
 * tests/design/README.md 3節で規定した最小限のAST抽出を行う。
 * - 対象ファイルのexport関数一覧（トップレベルのexport function、export classの各メソッド、
 *   export const代入のアロー関数/関数式、Piniaストア（Setup Store形式）のreturnで公開される
 *   ローカル関数を含む）
 * - 各関数内のthrow文・return文・if/switch分岐点の一覧（骨格のみ、given/expectは付けない）
 * - conditions.tomlのtarget_functionに対応する条件が1件も無いexport関数の検出
 *
 * 既知の限界: Piniaの Options Store形式（`defineStore(id, {state, actions})`）や、
 * factory関数の戻り値がオブジェクトリテラルでない場合は検出できない。
 *
 * 使い方:
 *   tsx scripts/design/extract-ast-skeleton.ts <対象.tsファイル> [--conditions <conditions.tomlファイル>]
 *
 * 例:
 *   tsx scripts/design/extract-ast-skeleton.ts src/content/parser/deck-detail-parser.ts \
 *     --conditions tests/design/deck-detail-parser/conditions.toml
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

export interface ParamInfo {
  name: string;
  hasDefault: boolean;
  defaultText?: string;
}

export interface ThrowInfo {
  line: number;
  text: string;
}

export interface ReturnInfo {
  line: number;
  text: string;
}

export interface BranchInfo {
  kind: 'if' | 'switch' | 'case';
  line: number;
  text: string;
}

export interface FunctionSkeleton {
  name: string;
  line: number;
  params: ParamInfo[];
  throws: ThrowInfo[];
  returns: ReturnInfo[];
  branches: BranchInfo[];
}

function truncate(text: string, max = 100): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  return collapsed.length > max ? `${collapsed.slice(0, max)}...` : collapsed;
}

function lineOf(node: ts.Node, sourceFile: ts.SourceFile): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function hasExportModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) {
    return false;
  }
  const modifiers = ts.getModifiers(node);
  return modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

/**
 * name/line/params/bodyを持つ関数相当のノード（FunctionDeclaration/MethodDeclaration/
 * ArrowFunction/FunctionExpression）から骨格を収集する。
 */
function collectFromFunctionLike(
  name: string,
  nameNode: ts.Node,
  params: readonly ts.ParameterDeclaration[],
  body: ts.Node | undefined,
  sourceFile: ts.SourceFile
): FunctionSkeleton {
  const paramInfos: ParamInfo[] = params.map(p => ({
    name: p.name.getText(sourceFile),
    hasDefault: p.initializer !== undefined,
    defaultText: p.initializer ? truncate(p.initializer.getText(sourceFile), 40) : undefined,
  }));

  const throws: ThrowInfo[] = [];
  const returns: ReturnInfo[] = [];
  const branches: BranchInfo[] = [];

  function walk(node: ts.Node) {
    if (ts.isThrowStatement(node)) {
      throws.push({ line: lineOf(node, sourceFile), text: truncate(node.expression.getText(sourceFile)) });
    } else if (ts.isReturnStatement(node)) {
      returns.push({
        line: lineOf(node, sourceFile),
        text: node.expression ? truncate(node.expression.getText(sourceFile)) : '(値なし)',
      });
    } else if (ts.isIfStatement(node)) {
      branches.push({ kind: 'if', line: lineOf(node, sourceFile), text: truncate(node.expression.getText(sourceFile)) });
    } else if (ts.isSwitchStatement(node)) {
      branches.push({
        kind: 'switch',
        line: lineOf(node, sourceFile),
        text: truncate(node.expression.getText(sourceFile)),
      });
    } else if (ts.isCaseClause(node)) {
      branches.push({ kind: 'case', line: lineOf(node, sourceFile), text: truncate(node.expression.getText(sourceFile)) });
    }
    ts.forEachChild(node, walk);
  }

  if (body) {
    walk(body);
  }

  return {
    name,
    line: lineOf(nameNode, sourceFile),
    params: paramInfos,
    throws,
    returns,
    branches,
  };
}

/** 対象ソースからexport関数・exportクラスの各メソッド・export const関数の骨格一覧を抽出する */
export function extractSkeleton(sourceCode: string, fileName: string): FunctionSkeleton[] {
  const sourceFile = ts.createSourceFile(fileName, sourceCode, ts.ScriptTarget.Latest, true);
  const results: FunctionSkeleton[] = [];

  function visitTop(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name && hasExportModifier(node)) {
      // export function foo() {}
      results.push(collectFromFunctionLike(node.name.getText(sourceFile), node.name, node.parameters, node.body, sourceFile));
    } else if (ts.isClassDeclaration(node) && node.name && hasExportModifier(node)) {
      // export class Foo { method() {} / static method() {} }
      const className = node.name.getText(sourceFile);
      for (const member of node.members) {
        if (ts.isMethodDeclaration(member) && member.name && member.body) {
          const isStatic = ts.canHaveModifiers(member)
            ? (ts.getModifiers(member)?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) ?? false)
            : false;
          const qualifiedName = `${className}.${member.name.getText(sourceFile)}`;
          results.push(
            collectFromFunctionLike(
              isStatic ? qualifiedName : `${className}#${member.name.getText(sourceFile)}`,
              member.name,
              member.parameters,
              member.body,
              sourceFile
            )
          );
        }
      }
    } else if (
      ts.isVariableStatement(node) &&
      hasExportModifier(node) &&
      node.declarationList.declarations.length === 1
    ) {
      // export const foo = (...) => {} / export const foo = function(...) {}
      const decl = node.declarationList.declarations[0];
      const init = decl.initializer;
      if (init && ts.isIdentifier(decl.name) && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
        results.push(
          collectFromFunctionLike(decl.name.getText(sourceFile), decl.name, init.parameters, init.body, sourceFile)
        );
      } else if (
        init &&
        ts.isIdentifier(decl.name) &&
        ts.isCallExpression(init) &&
        ts.isIdentifier(init.expression) &&
        init.expression.text === 'defineStore'
      ) {
        // export const useFooStore = defineStore(id, () => {...}) (Pinia Setup Store)
        results.push(...collectPiniaStoreActions(decl.name.getText(sourceFile), init, sourceFile));
      }
    }
    ts.forEachChild(node, visitTop);
  }

  visitTop(sourceFile);
  return results;
}

/**
 * PiniaのSetup Store形式（`defineStore(id, () => { const foo = () => {...}; return {foo} })`）から、
 * factory関数内でローカル定義され、returnオブジェクトで公開される関数を
 * "useFooStore#actionName"として検出する。
 *
 * 対象外: Options Store形式（`defineStore(id, {state, actions})`）や、
 * factory関数の戻り値がオブジェクトリテラルでない場合。
 */
function collectPiniaStoreActions(
  storeName: string,
  callExpr: ts.CallExpression,
  sourceFile: ts.SourceFile
): FunctionSkeleton[] {
  const factory = callExpr.arguments[callExpr.arguments.length - 1];
  if (!factory || (!ts.isArrowFunction(factory) && !ts.isFunctionExpression(factory))) {
    return [];
  }
  const body = factory.body;
  if (!body || !ts.isBlock(body)) {
    return [];
  }

  const localFunctions = new Map<
    string,
    { params: readonly ts.ParameterDeclaration[]; fnBody: ts.Node | undefined; nameNode: ts.Node }
  >();
  let returnObject: ts.ObjectLiteralExpression | undefined;

  for (const stmt of body.statements) {
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        const init = decl.initializer;
        if (init && ts.isIdentifier(decl.name) && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
          localFunctions.set(decl.name.getText(sourceFile), {
            params: init.parameters,
            fnBody: init.body,
            nameNode: decl.name,
          });
        }
      }
    } else if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      // function foo() {}（非export関数宣言）もSetup Store内では公開アクションになりうる
      localFunctions.set(stmt.name.getText(sourceFile), {
        params: stmt.parameters,
        fnBody: stmt.body,
        nameNode: stmt.name,
      });
    } else if (ts.isReturnStatement(stmt) && stmt.expression && ts.isObjectLiteralExpression(stmt.expression)) {
      returnObject = stmt.expression;
    }
  }

  if (!returnObject) {
    return [];
  }

  const results: FunctionSkeleton[] = [];
  for (const prop of returnObject.properties) {
    let exposedName: string | undefined;
    let sourceName: string | undefined;
    if (ts.isShorthandPropertyAssignment(prop)) {
      exposedName = prop.name.getText(sourceFile);
      sourceName = exposedName;
    } else if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name) && ts.isIdentifier(prop.initializer)) {
      exposedName = prop.name.getText(sourceFile);
      sourceName = prop.initializer.getText(sourceFile);
    }
    if (!exposedName || !sourceName) {
      continue;
    }

    const local = localFunctions.get(sourceName);
    if (!local) {
      continue;
    }

    results.push(
      collectFromFunctionLike(`${storeName}#${exposedName}`, local.nameNode, local.params, local.fnBody, sourceFile)
    );
  }

  return results;
}

/** conditions.tomlのtarget_function一覧を抽出する（最小実装: 行単位の正規表現走査） */
export function extractCoveredFunctions(tomlContent: string): Set<string> {
  const covered = new Set<string>();
  const re = /^\s*target_function\s*=\s*"([^"]+)"/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tomlContent)) !== null) {
    covered.add(m[1]);
  }
  return covered;
}

/** target_functionが1件も無いexport関数を検出する */
export function findUncoveredFunctions(functions: FunctionSkeleton[], covered: Set<string>): FunctionSkeleton[] {
  return functions.filter(f => !covered.has(f.name));
}

function printReport(sourcePath: string, functions: FunctionSkeleton[]): void {
  console.log(`=== export関数一覧: ${sourcePath} (${functions.length}件) ===\n`);

  for (const fn of functions) {
    const paramText = fn.params
      .map(p => (p.hasDefault ? `${p.name} = ${p.defaultText}` : p.name))
      .join(', ');
    console.log(`--- ${fn.name}(${paramText}) (L${fn.line}) ---`);

    if (fn.throws.length > 0) {
      console.log(`  throw (${fn.throws.length}件):`);
      for (const t of fn.throws) {
        console.log(`    L${t.line}: ${t.text}`);
      }
    }
    if (fn.returns.length > 0) {
      console.log(`  return (${fn.returns.length}件):`);
      for (const r of fn.returns) {
        console.log(`    L${r.line}: ${r.text}`);
      }
    }
    if (fn.branches.length > 0) {
      console.log(`  branch (${fn.branches.length}件):`);
      for (const b of fn.branches) {
        console.log(`    L${b.line} ${b.kind}: ${b.text}`);
      }
    }
    console.log('');
  }
}

function printCoverageReport(functions: FunctionSkeleton[], covered: Set<string>, uncovered: FunctionSkeleton[]): void {
  console.log('=== conditions.toml未カバー検出 ===\n');
  console.log(`export関数: ${functions.length}件 / target_function登場: ${covered.size}件`);
  if (uncovered.length === 0) {
    console.log('未カバーのexport関数: なし（全export関数がconditions.tomlのtarget_functionでカバーされています）');
  } else {
    console.log(`未カバーのexport関数 (${uncovered.length}件):`);
    for (const fn of uncovered) {
      console.log(`  - ${fn.name} (L${fn.line})`);
    }
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const sourceArg = args.find(a => !a.startsWith('--'));
  const conditionsIdx = args.indexOf('--conditions');
  const conditionsArg = conditionsIdx !== -1 ? args[conditionsIdx + 1] : undefined;

  if (!sourceArg) {
    console.error('使い方: tsx scripts/design/extract-ast-skeleton.ts <対象.tsファイル> [--conditions <conditions.tomlファイル>]');
    process.exit(1);
  }

  const sourcePath = path.resolve(sourceArg);
  const sourceCode = fs.readFileSync(sourcePath, 'utf-8');
  const functions = extractSkeleton(sourceCode, sourcePath);

  printReport(sourceArg, functions);

  if (conditionsArg) {
    const tomlContent = fs.readFileSync(path.resolve(conditionsArg), 'utf-8');
    const covered = extractCoveredFunctions(tomlContent);
    const uncovered = findUncoveredFunctions(functions, covered);
    console.log('');
    printCoverageReport(functions, covered, uncovered);
  }
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPathSafe(import.meta.url));

function fileURLToPathSafe(url: string): string {
  return url.startsWith('file://') ? new URL(url).pathname : url;
}

if (isMainModule) {
  main();
}
