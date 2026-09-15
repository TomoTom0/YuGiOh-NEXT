#!/usr/bin/env python3
# verify-conditions.py: tests/design条件書（conditions.toml）の機械検証script（TASK-480）
#
# 要件の正本: docs/design/verify-conditions.md
#  - (a) dangling coversタグ検出（feature横断）
#  - (b) 網羅検査（全条件が無条件でcover必須。verified=falseも免除しない）
#  - (c) schema検証（meta/condition/excluded）
#  - (d) source_lines自動同期（行ベース部分書き換え・legacy形式は同期せずwarn）
#  - (e) [[excluded]]構造検証
#  - --bootstrap: 既存テストからtNN採番で条件書末尾へ追記する移行モード
#  - --verified: 検証pass前提でmetaへ検証記録を書く
#
# Python 3 標準ライブラリのみ使用（tomllib等）。サードパーティ依存なし。

import argparse
import hashlib
import os
import re
import stat
import sys
import tempfile
import tomllib
from datetime import date
from pathlib import Path

# --- 定数 ---

# coversタグ: 位置不問で収集。idはカンマ区切り複数指定可
TAG_RE = re.compile(r'\[covers:([a-zA-Z0-9_.,\- ]+?)\]')
# legacy source_lines形式（実装行番号参照）: "51" / "44-46" / "27-28,33" / "76-80, 91-93" 等
# （カンマ後の空白は実corpusに16件実在するため許容）
LEGACY_SOURCE_LINES_RE = re.compile(r'^[0-9]+(?:-[0-9]+)?(?:,\s*[0-9]+(?:-[0-9]+)?)*$')
# stable id形式（test-structure skill §2）: <area>.<kebab-topic>・小文字・区切りの.は1つ
STABLE_ID_RE = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*$')
# bootstrap移行互換のtNN id形式
TNN_ID_RE = re.compile(r'^([a-z0-9-]+)\.t([0-9]+)$')
# ヘッダ行: [meta] / [[condition]] / [[excluded]]（末尾コメント許容）
HEADER_RE = re.compile(r'^\s*\[\[?(meta|condition|excluded)\]\]?\s*(?:#.*)?$')
# キー・値行（行ベース書き戻しの解析用）
KEYVAL_RE = re.compile(r'^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$')
# 二重引用符の単行文字列値
QUOTED_VALUE_RE = re.compile(r'^"([^"]*)"$')
# 標準4種のexpect_キー（skill §3。以外のexpect_キー使用はfail）
STANDARD_EXPECT_KEYS = {
    'expect_return',
    'expect_return_shape',
    'expect_throw',
    'expect_no_throw',
}
# verified_byの規定値（--verifiedのchoicesと同じ3種）
VERIFIED_BY_VALUES = ('claude', 'human', 'codex')
# タグ走査対象のテストファイル拡張子
TEST_EXTS = {'.ts', '.tsx', '.js', '.cjs', '.mjs'}
# bootstrap: 単行のit/test呼び出しから説明文を抽出
IT_CALL_RE = re.compile(r'''^\s*(?:it|test)\s*\(\s*(?:(['"])((?:\\.|(?!\1).)*)\1)\s*,''')
# bootstrap: 修飾呼び出し（暗黙の取りこぼし防止のためfail）
MODIFIED_CALL_RE = re.compile(
    r'\b(?:it|test)\.(?:each|skip|only|todo|concurrent|fails|sequential)\b'
    r'|\b(?:xit|xtest)\s*\('
)
# bootstrap: it(/test( 呼び出し総数カウント（説明文抽出数との突合用）
IT_COUNT_RE = re.compile(r'\b(?:it|test)\s*\(')
# givenの実質無しとみなす値
GIVEN_ABSENT_VALUES = {'なし', '無し', 'none', 'n/a', '-', '—', '―'}
# bootstrap雛形の説明文接頭辞
BOOTSTRAP_DESC_PREFIX = 'テスト: '
# script位置から解決する既定のrepo root（<root>/scripts/design/verify-conditions.py）
DEFAULT_ROOT = Path(__file__).resolve().parents[2]


# --- 汎用ヘルパー ---


def split_ending(line):
    """1行を行本体と改行（CRLF/LF/CR/無し）に分解する。"""
    if line.endswith('\r\n'):
        return line[:-2], '\r\n'
    if line.endswith('\n'):
        return line[:-1], '\n'
    if line.endswith('\r'):
        return line[:-1], '\r'
    return line, ''


def toml_str(value):
    """TOML基本文字列（二重引用符）として安全に囲む。"""
    escaped = value.replace('\\', '\\\\').replace('"', '\\"')
    return f'"{escaped}"'


def git_blob_hash(path):
    """git blob hash（git hash-object と同一の値）を算出する。

    gitサブプロセスに依存せず同一アルゴリズムで計算する（fixtureなど
    git管理外ファイルでも取得失敗しない。対象ファイルの不在時は例外）。
    """
    data = path.read_bytes()
    header = f'blob {len(data)}'.encode('ascii') + b'\x00'
    return hashlib.sha1(header + data).hexdigest()


class WriteError(Exception):
    """条件書・テストファイルの書き戻し失敗（制御されたエラー報告・exit 2用）。"""


def write_text_preserve(path, text):
    """改行を改変せず書き戻す（newline=''でLF/CRLFをそのまま出力）。

    一時ファイルへ書いてos.replaceで置き換える（中断時の中間状態防止）。
    OSErrorはWriteErrorへ包み、呼び出し側（main）でexit 2として報告する。
    """
    try:
        directory = path.parent
        fd, tmp_name = tempfile.mkstemp(dir=directory, prefix=f'{path.name}.', suffix='.tmp')
        try:
            with os.fdopen(fd, 'w', encoding='utf-8', newline='') as f:
                f.write(text)
            try:
                os.chmod(tmp_name, stat.S_IMODE(path.stat().st_mode))
            except OSError:
                pass  # 既存ファイルのpermission引き継ぎ失敗は書き戻し自体を妨げない
            os.replace(tmp_name, path)
        except BaseException:
            try:
                os.unlink(tmp_name)
            except OSError:
                pass
            raise
    except OSError as exc:
        raise WriteError(f'{path}: {exc}') from exc


# --- 条件書1ファイル分の読み込み ---


def parse_blocks(lines):
    """行リストからブロック（[meta]/[[condition]]/[[excluded]]）構造を解析する。

    各ブロック: {kind, start, end, fields}
    fieldsは key -> [(行index, 生の値文字列), ...]（重複記載の検出用に全出現を保持）。
    """
    blocks = []
    current = None
    for i, line in enumerate(lines):
        body, _ = split_ending(line)
        header = HEADER_RE.match(body)
        if header:
            current = {'kind': header.group(1), 'start': i, 'end': len(lines), 'fields': {}}
            blocks.append(current)
            continue
        if current is None:
            continue
        keyval = KEYVAL_RE.match(body)
        if keyval:
            current['fields'].setdefault(keyval.group(2), []).append((i, keyval.group(3)))
    for j in range(len(blocks) - 1):
        blocks[j]['end'] = blocks[j + 1]['start']
    return blocks


class Doc:
    """conditions.toml1ファイル分（tomllibパース結果＋行構造）。"""

    def __init__(self, path, feature, text, parsed, blocks):
        self.path = path
        self.feature = feature
        self.text = text
        self.lines = text.splitlines(keepends=True)
        self.data = parsed
        self.blocks = blocks

    @classmethod
    def load(cls, path):
        feature = path.parent.name
        text = path.read_bytes().decode('utf-8')
        parsed = tomllib.loads(text)
        return cls(path, feature, text, parsed, parse_blocks(text.splitlines(keepends=True)))

# --- タグ走査・対象解決 ---


def scan_test_tags(root):
    """root配下のtests/**/*.{ts,tsx,js,cjs,mjs}を行走査しcoversタグを収集する。

    戻り値: (tagmap, comment_tag_lines)
      tagmap: id -> [(relpath, 行番号), ...]
      comment_tag_lines: 行頭//コメント行に[covers:が含まれた行（除外+warn対象）
    """
    tagmap = {}
    comment_lines = []
    tests_dir = root / 'tests'
    if not tests_dir.is_dir():
        return tagmap, comment_lines
    for path in sorted(tests_dir.rglob('*')):
        if not path.is_file() or path.suffix not in TEST_EXTS:
            continue
        rel = path.relative_to(root).as_posix()
        try:
            text = path.read_text(encoding='utf-8', errors='replace')
        except OSError:
            continue
        for lineno, line in enumerate(text.splitlines(), 1):
            if '[covers:' not in line:
                continue
            if line.lstrip().startswith('//'):
                comment_lines.append((rel, lineno))
                continue
            for match in TAG_RE.finditer(line):
                for tag_id in match.group(1).split(','):
                    tag_id = tag_id.strip()
                    if tag_id:
                        tagmap.setdefault(tag_id, []).append((rel, lineno))
    return tagmap, comment_lines


def discover_targets(root, names):
    """位置引数（feature名/toml path/ディレクトリ）をconditions.toml一覧へ解決する。

    解決できない対象が1つでもあればNone（呼び出し側でexit 2）。
    """
    targets = []
    for name in names:
        candidates = []
        raw = Path(name)
        if raw.is_absolute():
            candidates.append(raw)
        else:
            candidates.append(Path(name))
            candidates.append(root / name)
            candidates.append(root / 'tests' / 'design' / name / 'conditions.toml')
        resolved = None
        for cand in candidates:
            if cand.is_file():
                resolved = cand
                break
            if cand.is_dir() and (cand / 'conditions.toml').is_file():
                resolved = cand / 'conditions.toml'
                break
        if resolved is None:
            print(
                f'エラー: 対象を解決できません: {name}',
                file=sys.stderr,
            )
            return None
        targets.append(resolved)
    if not names:
        design_dir = root / 'tests' / 'design'
        if design_dir.is_dir():
            targets = sorted(p / 'conditions.toml' for p in design_dir.iterdir() if (p / 'conditions.toml').is_file())
    seen = set()
    unique = []
    for path in targets:
        key = str(path)
        if key not in seen:
            seen.add(key)
            unique.append(path)
    return unique


def build_expected_map(tagmap):
    """idごとの期待source_lines値（昇順・重複除去・カンマ連結）を作る。"""
    expected = {}
    for tag_id, refs in tagmap.items():
        unique = sorted(set(refs), key=lambda ref: (ref[0], ref[1]))
        expected[tag_id] = ','.join(f'{rel}:{lineno}' for rel, lineno in unique)
    return expected


def load_global_ids(root):
    """全corpus（tests/design/*/conditions.toml）のid一覧を作る。

    戻り値: (id -> set(relpath), パース失敗ファイル一覧)
    """
    global_ids = {}
    parse_failed = []
    design_dir = root / 'tests' / 'design'
    if not design_dir.is_dir():
        return global_ids, parse_failed
    for toml_path in sorted(design_dir.glob('*/conditions.toml')):
        rel = toml_path.relative_to(root).as_posix()
        try:
            doc = Doc.load(toml_path)
        except (OSError, UnicodeDecodeError, tomllib.TOMLDecodeError):
            parse_failed.append(rel)
            continue
        conds = doc.data.get('condition', [])
        if not isinstance(conds, list):
            continue
        for cond in conds:
            if isinstance(cond, dict) and isinstance(cond.get('id'), str) and cond['id']:
                global_ids.setdefault(cond['id'], set()).add(rel)
    return global_ids, parse_failed


class FileResult:
    """1ファイル分の検証結果。"""

    def __init__(self, doc):
        self.doc = doc
        self.fails = []  # (label, message)
        self.warns = []  # (label, message)
        self.synced = []  # 同期したid
        self.has_dup_id = False


# --- (c) schema検証 ---


def verify_schema(doc, result, config, global_ids):
    """meta/condition/excludedのschemaを検証しfail/warnをresultへ追加する。"""
    data = doc.data
    meta = data.get('meta')
    if not isinstance(meta, dict):
        result.fails.append(('meta', '[meta]ブロックが不在'))
        meta = {}
    else:
        for key in ('feature', 'source_file'):
            value = meta.get(key)
            if not isinstance(value, str) or not value.strip():
                result.fails.append(('meta', f'meta.{key}が欠落・空'))
        if meta.get('feature') != doc.feature:
            result.warns.append(
                ('meta', f'meta.feature({meta.get("feature")})がファイルstem({doc.feature})と不一致')
            )
        if meta.get('verified') is True:
            for key in ('verified_at', 'verified_by', 'test_command', 'source_hash'):
                value = meta.get(key)
                if not isinstance(value, str) or not value.strip():
                    result.fails.append(('meta', f'verified=trueだが{key}が空・欠落'))
            # 記録形式の手編集ミス検出（warn扱い。failは上記の空・欠落検査が担う）
            verified_by = meta.get('verified_by')
            if isinstance(verified_by, str) and verified_by and verified_by not in VERIFIED_BY_VALUES:
                result.warns.append(
                    ('meta', f'verified_byが規定値（{"|".join(VERIFIED_BY_VALUES)}）以外: {verified_by}')
                )
            verified_at = meta.get('verified_at')
            if (
                isinstance(verified_at, str)
                and verified_at
                and not re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}', verified_at)
            ):
                result.warns.append(('meta', f'verified_atがYYYY-MM-DD形式でない: {verified_at}'))
            source_hash = meta.get('source_hash')
            if (
                isinstance(source_hash, str)
                and source_hash
                and not re.fullmatch(r'[0-9a-f]{40}', source_hash)
            ):
                result.warns.append(('meta', f'source_hashが40桁hexでない: {source_hash}'))

    conds = data.get('condition', [])
    if not isinstance(conds, list):
        result.fails.append(('meta', 'conditionが配列でない'))
        return
    seen_ids = set()
    own_rel = doc.rel  # パイプライン側でroot相対pathを設定（無ければ絶対path）
    for index, cond in enumerate(conds):
        if not isinstance(cond, dict):
            result.fails.append((f'#{index + 1}', '条件がテーブルでない'))
            continue
        cid = cond.get('id')
        label = cid if isinstance(cid, str) and cid.strip() else f'#{index + 1}'
        if not isinstance(cid, str) or not cid.strip():
            result.fails.append((label, 'idが欠落・空'))
        else:
            if cid in seen_ids:
                result.fails.append((cid, 'idが同一ファイル内で重複'))
                result.has_dup_id = True
            seen_ids.add(cid)
            if not STABLE_ID_RE.match(cid):
                result.fails.append((cid, f'id形式がstable id形式（skill §2）と不一致: {cid}'))
            others = global_ids.get(cid, set()) - {own_rel}
            if others:
                result.fails.append(
                    (cid, f'idがfeature横断で重複（他ファイル: {", ".join(sorted(others))}）')
                )
                result.has_dup_id = True
        expect_keys = [key for key in cond if key.startswith('expect_')]
        meaningful = [
            key
            for key in expect_keys
            if not (isinstance(cond[key], str) and cond[key].strip() == '')
        ]
        # false/0/空配列は正当な期待値のため空文字のみfail対象
        if not meaningful:
            result.fails.append((label, 'expect_プレフィックスのキーが無い、または値が空文字'))
        for key in meaningful:
            if key not in STANDARD_EXPECT_KEYS:
                result.fails.append((label, f'標準4種以外のexpect_キーを使用: {key}'))
        given = cond.get('given')
        if (
            not isinstance(given, str)
            or not given.strip()
            or given.strip() in GIVEN_ABSENT_VALUES
        ):
            result.warns.append((label, 'givenが欠落・空・実質無し'))
        for key in ('description', 'target_function'):
            value = cond.get(key)
            if not isinstance(value, str) or not value.strip():
                result.warns.append((label, f'{key}が欠落・空'))
        source = cond.get('source')
        if not isinstance(source, str) or not source.strip():
            message = 'sourceが欠落・空'
            if config.strict_source:
                result.fails.append((label, message))
            else:
                result.warns.append((label, message))
        if cond.get('verified') is False:
            reason = cond.get('unverifiable_reason')
            if not isinstance(reason, str) or not reason.strip():
                result.fails.append((label, 'verified=falseだがunverifiable_reasonが空・欠落'))

    excluded = data.get('excluded', [])
    if not isinstance(excluded, list):
        result.fails.append(('excluded', 'excludedが配列でない'))
        return
    for index, entry in enumerate(excluded):
        if not isinstance(entry, dict):
            result.fails.append((f'excluded#{index + 1}', '除外entryがテーブルでない'))
            continue
        for key in ('item', 'source', 'reason'):
            value = entry.get(key)
            if not isinstance(value, str) or not value.strip():
                result.fails.append((f'excluded#{index + 1}', f'[[excluded]]の{key}が空欄'))


# --- (b) 網羅検査 ---


def verify_coverage(doc, result, tagmap):
    """全条件がcoverされているか検証する（verified=falseも無条件でcover必須）。"""
    conds = doc.data.get('condition', [])
    if not isinstance(conds, list):
        return
    for cond in conds:
        if not isinstance(cond, dict):
            continue
        cid = cond.get('id')
        if not isinstance(cid, str) or not cid.strip():
            continue
        covered = cid in tagmap
        if cond.get('verified') is False and covered:
            # cover必須に免除は無い。coverされている検証不能条件は情報としてwarn
            result.warns.append((cid, 'verified=false（検証不能）条件にcoverタグが存在'))
        if not covered:
            result.fails.append((cid, 'coverタグが1つも無い（未cover）'))


# --- (d) source_lines自動同期 ---


def plan_sync(doc, expected_map):
    """行ベースの同期計画を作る。

    戻り値: (ops, fails, warns)
      ops: [('replace'|'insert', 行index, 新行, id), ...]（文書の後ろから前へ構築）
      fails: 書き戻し前提を崩す構造（設計判断15）。1つでもあれば当該ファイルの書き戻しをスキップ
      warns: legacy形式のため同期対象外
    """
    ops = []
    fails = []
    warns = []
    cond_blocks = [block for block in doc.blocks if block['kind'] == 'condition']
    conds = doc.data.get('condition', [])
    if not isinstance(conds, list) or len(conds) != len(cond_blocks):
        # パース結果と行構造が対応しない場合は同期しない（fail報告はschema側で出ている）
        return ops, fails, warns
    for block, cond in zip(reversed(cond_blocks), reversed(conds)):
        if not isinstance(cond, dict):
            continue
        cid = cond.get('id')
        if not isinstance(cid, str) or not cid.strip():
            continue
        entries = block['fields'].get('source_lines', [])
        if len(entries) > 1:
            fails.append((cid, 'source_linesが1ブロックに重複記載（書き戻し前提違反）'))
            continue
        cur_index = None
        cur_value = None
        if entries:
            cur_index, raw = entries[0]
            if raw.startswith("'"):
                fails.append((cid, f'source_linesが単引用符値のため書き戻し不可: {raw}'))
                continue
            quoted = QUOTED_VALUE_RE.match(raw)
            if not quoted:
                fails.append(
                    (cid, f'source_linesが想定外形式（inline comment・複数行値等）のため書き戻し不可: {raw}')
                )
                continue
            cur_value = quoted.group(1)
        expected = expected_map.get(cid)
        if expected is None:
            # cover無し: coverage検査がfail報告するため同期しない
            continue
        if cur_value is not None and LEGACY_SOURCE_LINES_RE.match(cur_value):
            warns.append((cid, f'source_linesがlegacy形式（{cur_value}）のため同期対象外'))
            continue
        if cur_value == expected:
            continue
        if cur_index is not None:
            body, ending = split_ending(doc.lines[cur_index])
            indent = re.match(r'^(\s*)', body).group(1)
            ops.append(('replace', cur_index, f'{indent}source_lines = {toml_str(expected)}{ending}', cid))
        else:
            id_entries = block['fields'].get('id', [])
            if not id_entries:
                continue
            id_index = id_entries[0][0]
            body, ending = split_ending(doc.lines[id_index])
            if ending == '':
                # id行が改行無しの最終行: id行へ改行を補い、挿入行を改行なしの
                # 新最終行にする（末尾改行の有無を変えない）
                doc.lines[id_index] = body + '\n'
                ending = ''
            ops.append(('insert', id_index, f'source_lines = {toml_str(expected)}{ending}', cid))
    return ops, fails, warns


def apply_sync(doc, ops):
    """同期計画をlinesへ適用し、変更があれば書き戻す。変更件数を返す。"""
    if not ops:
        return 0
    for kind, index, new_line, _cid in ops:
        if kind == 'replace':
            doc.lines[index] = new_line
        else:
            doc.lines.insert(index + 1, new_line)
    write_text_preserve(doc.path, ''.join(doc.lines))
    return len(ops)


# --- --verified用のmeta書き込み ---


def write_verified_meta(doc, verified_by, test_command, source_hash):
    """[meta]ブロックへ検証記録を行ベースで書く（他の行は改変しない）。"""
    meta_blocks = [block for block in doc.blocks if block['kind'] == 'meta']
    if not meta_blocks:
        return False
    block = meta_blocks[0]
    updates = {
        'verified': 'true',  # TOML真偽値のため引用符なし
        'verified_at': toml_str(date.today().isoformat()),
        'verified_by': toml_str(verified_by),
        'test_command': toml_str(test_command),
        'source_hash': toml_str(source_hash),
    }
    found = set()
    for i in range(block['start'] + 1, block['end']):
        body, ending = split_ending(doc.lines[i])
        keyval = KEYVAL_RE.match(body)
        if keyval and keyval.group(2) in updates and keyval.group(2) not in found:
            key = keyval.group(2)
            doc.lines[i] = f'{keyval.group(1)}{key} = {updates[key]}{ending}'
            found.add(key)
    insert_at = block['start'] + 1
    for key in updates:
        if key not in found:
            doc.lines.insert(insert_at, f'{key} = {updates[key]}\n')
            insert_at += 1
    write_text_preserve(doc.path, ''.join(doc.lines))
    return True


# --- --bootstrap（移行限定モード） ---


def test_file_stem(path):
    """テストファイル名からstemを得る（example.test.ts -> example）。"""
    match = re.match(r'^(.+)\.test\.(?:ts|tsx|js|cjs|mjs)$', path.name)
    if match:
        return match.group(1)
    return path.stem


def extract_it_calls(text):
    """テストファイル本文から単行のit/test呼び出しを抽出する。

    戻り値: (plain, tagged, modified, total_calls)
      plain: [(説明文strip済, 行番号), ...]（coversタグ無し）
      tagged: [(タグ除去済説明文, 行番号), ...]（coversタグ付き）
      modified: [(行番号, 行), ...]（it.each等の修飾呼び出し）
      total_calls: it(/test(呼び出し総数（コメント行を除く）
    """
    plain = []
    tagged = []
    modified = []
    total_calls = 0
    for lineno, line in enumerate(text.splitlines(), 1):
        if line.lstrip().startswith('//'):
            continue
        if MODIFIED_CALL_RE.search(line):
            modified.append((lineno, line.strip()))
        total_calls += len(IT_COUNT_RE.findall(line))
        match = IT_CALL_RE.match(line)
        if not match:
            continue
        desc = match.group(2).replace("\\'", "'").replace('\\"', '"')
        if '[covers:' in desc:
            stripped = TAG_RE.sub('', desc).strip()
            tagged.append((stripped, lineno))
        else:
            plain.append((desc.strip(), lineno))
    return plain, tagged, modified, total_calls


def bootstrap_block_text(stem, number, description, rel, lineno):
    """追記する[[condition]]ブロック1件分のテキスト（末尾改行付き）。"""
    fields = [
        '[[condition]]',
        f'id = {toml_str(f"{stem}.t{number:02d}")}',
        'target_function = ""',
        'source = ""',
        f'description = {toml_str(BOOTSTRAP_DESC_PREFIX + description)}',
        'given = ""',
        'expect_no_throw = true',
        f'source_lines = {toml_str(f"{rel}:{lineno}")}',
    ]
    return '\n'.join(fields) + '\n'


def append_blocks(original, block_texts):
    """既存本文を一切書き換えず、ブロックをファイル末尾へ追記する。"""
    base = original
    if not base.endswith('\n'):
        base += '\n'
    if not base.endswith('\n\n'):
        base += '\n'
    return base + ''.join(text + '\n' for text in block_texts)


def resolve_input_path(root, arg):
    """位置引数のpathを解決する（--root相対）。

    通常モード（discover_targets）と同様に、引数がそのまま存在すればそれを
    用い、無ければroot相対候補（root / 引数）を試す。絶対pathはそのまま返す。
    """
    raw = Path(arg)
    if raw.is_absolute() or raw.exists():
        return raw
    return root / raw


def bootstrap_mode(root, toml_arg, test_arg):
    """--bootstrap: タグ無しitをtNN採番で条件書末尾へ追記する。"""
    toml_path = resolve_input_path(root, toml_arg)
    test_path = resolve_input_path(root, test_arg)
    if not test_path.is_file():
        print(f'エラー: テストファイルが存在しません: {test_arg}', file=sys.stderr)
        return 2
    stem = test_file_stem(test_path)
    try:
        rel = test_path.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        rel = str(test_path)
    text = test_path.read_text(encoding='utf-8', errors='replace')
    plain, tagged, modified, total_calls = extract_it_calls(text)
    if modified:
        for lineno, line in modified:
            print(f'FAIL {stem} bootstrap: 修飾呼び出しを検出（行{lineno}: {line}）')
        return 1
    warns = []
    if total_calls != len(plain) + len(tagged):
        warns.append(
            f'it/test呼び出し総数（{total_calls}）と抽出+タグ付き件数（{len(plain) + len(tagged)}）が不一致'
            '（複数行it等の可能性）'
        )

    if toml_path.is_file():
        try:
            doc = Doc.load(toml_path)
        except (OSError, UnicodeDecodeError, tomllib.TOMLDecodeError) as exc:
            print(f'エラー: TOMLパース失敗: {toml_path}: {exc}', file=sys.stderr)
            return 2
        conds = doc.data.get('condition', [])
        if not isinstance(conds, list):
            print(f'エラー: conditionが配列でない: {toml_path}', file=sys.stderr)
            return 2
        existing_descs = {}
        max_number = 0
        for cond in conds:
            if not isinstance(cond, dict):
                continue
            cid = cond.get('id')
            match = TNN_ID_RE.match(cid) if isinstance(cid, str) else None
            if not (match and match.group(1) == stem):
                print(
                    f'SKIP {toml_path}: tNN形式（{stem}.tNN）以外のid（{cid}）を含むため'
                    'bootstrap対象外（stable id付き条件書は上書きしない）'
                )
                return 0
            max_number = max(max_number, int(match.group(2)))
            desc = cond.get('description')
            if isinstance(desc, str):
                key = desc.strip()
                if key.startswith(BOOTSTRAP_DESC_PREFIX):
                    key = key[len(BOOTSTRAP_DESC_PREFIX):].strip()
                existing_descs.setdefault(key, cid)
    else:
        doc = None
        existing_descs = {}
        max_number = 0

    new_items = []
    for desc, lineno in plain:
        if desc in existing_descs:
            warns.append(f'説明文が既存条件（{existing_descs[desc]}）と重複のため既存扱い: {desc}')
            continue
        max_number += 1
        new_items.append((max_number, desc, lineno))

    matched_descs = {desc for desc, _ in plain} | {desc for desc, _ in tagged}
    for desc, cid in existing_descs.items():
        if desc not in matched_descs:
            warns.append(f'対応するitが消失（削除せず維持）: {cid}（{BOOTSTRAP_DESC_PREFIX}{desc}）')

    for message in warns:
        print(f'WARN {stem} bootstrap: {message}')

    if not new_items and doc is not None:
        print(f'{stem}: 追記対象の新規it無し（{len(existing_descs)}条件維持）')
        return 0

    block_texts = [
        bootstrap_block_text(stem, number, desc, rel, lineno)
        for number, desc, lineno in new_items
    ]
    if doc is None:
        toml_path.parent.mkdir(parents=True, exist_ok=True)
        meta_text = (
            '[meta]\n'
            f'feature = {toml_str(toml_path.parent.name)}\n'
            'source_file = ""\n'
            'verified = false\n'
            'verified_at = ""\n'
            'verified_by = ""\n'
            'test_command = ""\n'
            'source_hash = ""\n\n'
        )
        write_text_preserve(toml_path, append_blocks(meta_text, block_texts))
    else:
        write_text_preserve(toml_path, append_blocks(doc.text, block_texts))
    print(f'{stem}: {len(new_items)}件を末尾追記（{toml_path}）')
    return 0


# --- 検証パイプライン・出力 ---


def run_pipeline(root, targets, config):
    """タグ走査・全corpus id収集・schema/coverage検証・同期までを実行する。"""
    tagmap, comment_lines = scan_test_tags(root)
    global_ids, global_parse_failed = load_global_ids(root)
    expected_map = build_expected_map(tagmap)
    results = []
    parse_errors = []
    for path in targets:
        try:
            doc = Doc.load(path)
        except (OSError, UnicodeDecodeError, tomllib.TOMLDecodeError) as exc:
            parse_errors.append((path, str(exc)))
            continue
        try:
            doc.rel = path.resolve().relative_to(root.resolve()).as_posix()
        except ValueError:
            doc.rel = str(path)
        result = FileResult(doc)
        verify_schema(doc, result, config, global_ids)
        verify_coverage(doc, result, tagmap)
        ops, sync_fails, sync_warns = plan_sync(doc, expected_map)
        result.fails.extend(sync_fails)
        result.warns.extend(sync_warns)
        # id重複・書き戻し前提違反のあるファイルは同期しない（設計判断15）
        if result.has_dup_id or sync_fails:
            ops = []
        if not config.no_sync and ops:
            apply_sync(doc, ops)
            result.synced = [cid for _kind, _index, _line, cid in ops]
        results.append(result)
    return results, parse_errors, tagmap, comment_lines, global_parse_failed, global_ids


def collect_all_ids(global_ids, results):
    """dangling判定に使う既知id全体（corpus全体＋対象ファイル）を集める。"""
    ids = set(global_ids)
    for result in results:
        conds = result.doc.data.get('condition', [])
        if not isinstance(conds, list):
            continue
        for cond in conds:
            if isinstance(cond, dict) and isinstance(cond.get('id'), str) and cond['id']:
                ids.add(cond['id'])
    return ids


def print_report(results, tagmap, comment_lines, global_parse_failed, all_ids):
    """fail/warn/syncを出力し、最終サマリ行を表示する。fail総数を返す。"""
    fails = 0
    warns = 0
    synced = 0
    conditions = 0
    for result in results:
        for label, message in result.fails:
            print(f'FAIL {result.doc.feature} {label}: {message}')
            fails += 1
        for label, message in result.warns:
            print(f'WARN {result.doc.feature} {label}: {message}')
            warns += 1
        for cid in result.synced:
            print(f'SYNC {result.doc.feature} {cid}: source_linesをタグ位置へ同期')
            synced += 1
        conds = result.doc.data.get('condition', [])
        if isinstance(conds, list):
            conditions += len(conds)
    for tag_id in sorted(set(tagmap) - all_ids):
        refs = ', '.join(f'{rel}:{lineno}' for rel, lineno in tagmap[tag_id][:3])
        print(f'FAIL dangling {tag_id}: coversタグが全conditions.tomlのどのidにも一致しない ({refs})')
        fails += 1
    for rel, lineno in comment_lines:
        print(f'WARN scan {rel}:{lineno}: コメント行の[covers:はタグ走査から除外')
        warns += 1
    for rel in global_parse_failed:
        print(f'WARN corpus {rel}: パース失敗のためid収集対象から除外')
        warns += 1
    print(
        f'{len(results)} files / {conditions} conditions / {fails} fail / {warns} warn / {synced} synced'
    )
    return fails


def local_dangling_fails(tagmap, all_ids, results):
    """対象featureのテストファイル由来のdanglingタグfail一覧を作る。

    dangling判定自体はprint_reportと同じ（全corpusのidに一致しないタグ）。
    うち「対象tomlの条件をcoverするテストファイル」内に出所があるものは
    対象featureの品質問題（typoタグ等）のため検証記録をブロックする。
    """
    cover_files = set()
    for result in results:
        conds = result.doc.data.get('condition', [])
        if not isinstance(conds, list):
            continue
        for cond in conds:
            if not (isinstance(cond, dict) and isinstance(cond.get('id'), str) and cond['id']):
                continue
            for rel, _lineno in tagmap.get(cond['id'], []):
                cover_files.add(rel)
    fails = []
    for tag_id in sorted(set(tagmap) - all_ids):
        local_refs = [(rel, lineno) for rel, lineno in tagmap[tag_id] if rel in cover_files]
        if local_refs:
            refs = ', '.join(f'{rel}:{lineno}' for rel, lineno in local_refs[:3])
            fails.append(
                (f'dangling {tag_id}', f'対象featureのテストファイル内でcoversタグがどのidにも一致しない ({refs})')
            )
    return fails


def verified_mode(root, targets, args):
    """--verified: 検証全passを確認してからmetaへ検証記録を書く（原子的）。"""
    results, parse_errors, tagmap, comment_lines, global_parse_failed, global_ids = run_pipeline(
        root, targets, args
    )
    if parse_errors:
        for path, message in parse_errors:
            print(f'エラー: TOMLパース失敗: {path}: {message}', file=sys.stderr)
        return 2
    all_ids = collect_all_ids(global_ids, results)
    print_report(results, tagmap, comment_lines, global_parse_failed, all_ids)
    # ブロック条件は対象toml自身のfail＋対象featureのテストファイル由来dangling。
    # danglingはfeature横断検出のため対象外featureのテスト起因で常に出うる
    # （他featureの条件書未作成等）が、対象featureの条件をcoverするテストファイル内の
    # danglingタグ（typo等）は対象featureの品質問題のためブロック対象とする
    dangling_fails = local_dangling_fails(tagmap, all_ids, results)
    for label, message in dangling_fails:
        print(f'FAIL {label}: {message}')
    local_fails = sum(len(result.fails) for result in results) + len(dangling_fails)
    if local_fails > 0 or parse_errors:
        print('検証failがあるため検証記録（meta）は書かない', file=sys.stderr)
        return 1
    # 複数対象の原子性: 全対象のsource_file解決・hash計算を先に完了し、
    # 全て成功してから一括で書き込む（一部だけverified=trueになる状態を作らない）
    writes = []
    ok = True
    for result in results:
        meta = result.doc.data.get('meta')
        source_file = meta.get('source_file') if isinstance(meta, dict) else None
        target = Path(source_file) if isinstance(source_file, str) and source_file else None
        if target is not None and not target.is_absolute():
            target = root / target
        if target is None or not target.is_file():
            print(f'FAIL {result.doc.feature} meta: source_hash計算失敗（source_file不在）: {source_file}')
            ok = False
            continue
        try:
            digest = git_blob_hash(target)
        except OSError as exc:
            print(f'FAIL {result.doc.feature} meta: source_hash計算失敗: {exc}')
            ok = False
            continue
        writes.append((result.doc, digest))
    if not ok:
        print('source_hash計算失敗があるため検証記録（meta）は書かない', file=sys.stderr)
        return 1
    for doc, digest in writes:
        write_verified_meta(doc, args.verified, args.test_command, digest)
        print(f'SYNC {doc.feature} meta: 検証記録を記載（verified_by={args.verified}）')
    return 0


# --- CLI ---


def parse_args(argv):
    parser = argparse.ArgumentParser(
        prog='verify-conditions.py',
        description='tests/design条件書（conditions.toml）の機械検証（id対応・網羅・schema・除外構造・source_lines同期）',
    )
    parser.add_argument(
        'targets',
        nargs='*',
        metavar='対象',
        help='feature名 / conditions.tomlのpath / それを含むディレクトリ（無指定なら全corpus）',
    )
    parser.add_argument('--strict-source', action='store_true', help='source欄の欠落・空をfailにする')
    parser.add_argument('--no-sync', action='store_true', help='source_lines自動同期を無効化（読み取り専用）')
    parser.add_argument('--root', metavar='DIR', help='repo root（デフォルト: script位置から解決）')
    parser.add_argument(
        '--bootstrap', action='store_true', help='移行モード: 対象1=conditions.toml、対象2=テストファイル'
    )
    parser.add_argument(
        '--verified',
        choices=['claude', 'human', 'codex'],
        metavar='BY',
        help='検証全pass前提でmetaへ検証記録を書く（--bootstrapと併用不可）',
    )
    parser.add_argument('--test-command', metavar='CMD', help='--verified併用時のtest_command値（必須）')
    return parser.parse_args(argv)


def main(argv=None):
    try:
        return _run(argv)
    except WriteError as exc:
        # 書き戻し失敗はtracebackを出さず制御されたエラー報告とする（exit 2）
        print(f'エラー: 書き戻し失敗: {exc}', file=sys.stderr)
        return 2


def _run(argv):
    args = parse_args(argv)
    if args.bootstrap and args.verified:
        print('エラー: --bootstrapと--verifiedは併用不可', file=sys.stderr)
        return 2
    if args.verified and not args.test_command:
        print('エラー: --verifiedには--test-commandが必須', file=sys.stderr)
        return 2
    root = Path(args.root).resolve() if args.root else DEFAULT_ROOT
    if args.bootstrap:
        if len(args.targets) != 2:
            print('エラー: --bootstrapは<conditions.toml> <テストファイル>の2引数が必要', file=sys.stderr)
            return 2
        return bootstrap_mode(root, args.targets[0], args.targets[1])
    targets = discover_targets(root, args.targets)
    if targets is None:
        return 2
    if not targets:
        print('エラー: 検証対象が0件です', file=sys.stderr)
        return 2
    if args.verified:
        return verified_mode(root, targets, args)
    results, parse_errors, tagmap, comment_lines, global_parse_failed, global_ids = run_pipeline(
        root, targets, args
    )
    all_ids = collect_all_ids(global_ids, results)
    fails = print_report(results, tagmap, comment_lines, global_parse_failed, all_ids)
    if parse_errors:
        # パース失敗はシステムエラー（exit 2）。他ファイルの検証結果も併せて報告済み
        for path, message in parse_errors:
            print(f'エラー: TOMLパース失敗: {path}: {message}', file=sys.stderr)
        return 2
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
