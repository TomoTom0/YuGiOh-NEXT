#!/bin/bash
# configs/browser.toml 読み取り・解決の共通ライブラリ
#
# scripts/debug/setup/ 配下のスクリプトから source して使用する。
# tomlq 等の外部TOMLパーサに依存せず、sed で [section] key = "value" 形式を読み取る
# （tests/browser/cdp-helper.cjs の readBrowserConfig と同じ方式）。
#
# source 側の前提:
#   - PROJECT_ROOT にプロジェクトルートの絶対パスが設定されていること
#   - BROWSER_CONFIG に configs/browser.toml のパスが設定されていること

# エラー終了（メッセージはstderrへ）
die() {
  echo "[ERROR] $*" >&2
  exit 1
}

# 必須コマンドの存在チェック
require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "必須コマンド '$1' が見つかりません（installするかPATHを通してください）"
}

# configs/browser.toml から値を読み取る
# 使い方: read_cfg <section> <key>  （例: read_cfg chrome debug_port）
# 出力: 値（文字列・数値・boolとも文字列として出力）。未定義なら空文字列
# 対応形式: key = "value" / key = 123 / key = true / 行末の # コメント
read_cfg() {
  local section="$1" key="$2" val
  [ -f "$BROWSER_CONFIG" ] || die "設定ファイルが見つかりません: ${BROWSER_CONFIG}"
  # 対象セクションの範囲（次の [section] 行まで）を抽出し、key行から値部分を取り出す
  val=$(sed -n "/^\[${section}\][[:space:]]*$/,/^\[/p" "$BROWSER_CONFIG" \
    | sed -n "s/^${key}[[:space:]]*=//p" | head -1)
  # 行末コメント除去（クォート外の # 以降。現状の値に # は含まれない前提）
  val="${val%%\#*}"
  # 前後の空白とクォートを除去（"value" と 'value' の両方に対応）
  val="${val#"${val%%[![:space:]]*}"}"
  val="${val%"${val##*[![:space:]]}"}"
  val="${val%\"}"
  val="${val#\"}"
  val="${val%\'}"
  val="${val#\'}"
  printf '%s' "$val"
}

# Chromiumバイナリを解決してstdoutへ出力する
# 候補順:
#   1. configs/browser.toml の chrome.binary（明示指定。~とプロジェクトルート相対に対応）
#   2. Playwright同梱Chromium（~/.cache/ms-playwright/chromium-* のバージョン最新）
#   3. /usr/bin/chromium-browser
#   4. /snap/bin/chromium
#   5. PATH上の chromium
resolve_binary() {
  local configured candidate bin
  configured=$(read_cfg chrome binary)
  if [ -n "$configured" ]; then
    case "$configured" in
      "~"*) configured="${HOME}${configured#\~}" ;;
      /*) ;;
      *) configured="${PROJECT_ROOT}/${configured}" ;;
    esac
    [ -x "$configured" ] || die "chrome.binary に指定されたバイナリが実行可能ではありません: ${configured}"
    printf '%s' "$configured"
    return 0
  fi
  # Playwright同梱Chromium（バージョン番号が最大のもの）
  candidate=$(ls -1 "${HOME}"/.cache/ms-playwright/chromium-*/chrome-linux*/chrome 2>/dev/null | sort -V | tail -1)
  for bin in "$candidate" /usr/bin/chromium-browser /snap/bin/chromium "$(command -v chromium 2>/dev/null)"; do
    if [ -n "$bin" ] && [ -x "$bin" ]; then
      printf '%s' "$bin"
      return 0
    fi
  done
  die "Chromiumバイナリが見つかりません。configs/browser.toml の chrome.binary にパスを指定してください"
}

# 拡張機能ディレクトリを解決してstdoutへ出力する
# 候補順:
#   1. configs/browser.toml の chrome.extension_dir（明示指定）
#   2. .env の RSYNC_PATH（build-deploy のデプロイ先。~展開に対応）
resolve_extension_dir() {
  local configured env_val
  configured=$(read_cfg chrome extension_dir)
  if [ -n "$configured" ]; then
    case "$configured" in
      "~"*) configured="${HOME}${configured#\~}" ;;
      /*) ;;
      *) configured="${PROJECT_ROOT}/${configured}" ;;
    esac
    [ -d "$configured" ] || die "chrome.extension_dir に指定されたディレクトリが存在しません: ${configured}"
    printf '%s' "$configured"
    return 0
  fi
  [ -f "${PROJECT_ROOT}/.env" ] || die ".env が見つかりません（${PROJECT_ROOT}/.env）。chrome.extension_dir を指定してください"
  env_val=$(sed -n 's/^RSYNC_PATH=//p' "${PROJECT_ROOT}/.env" | head -1 | tr -d '"' | tr -d "'")
  [ -n "$env_val" ] || die ".env の RSYNC_PATH が空です。chrome.extension_dir を指定してください"
  # 先頭の ~ をホームディレクトリに展開
  env_val="${env_val/#\~/$HOME}"
  printf '%s' "$env_val"
}

# 指定ポートをlistenするプロセスのみを終了する（他プロセスを巻き込まない）
# 使い方: stop_port <port> [<signal>]
stop_port() {
  local port="$1" signal="${2:-TERM}" pids
  require_cmd lsof
  pids=$(lsof -ti:"${port}" 2>/dev/null)
  [ -z "$pids" ] && return 1
  echo "$pids" | xargs -r kill -s "$signal"
  return 0
}

# CDPの /json から page 型ターゲットの WebSocket URL を取得してファイルへ書き込む
# 使い方: fetch_ws_url <debug_port> <ws_file> <timeout_sec>（1秒間隔でポーリング）
# 成功時は0、タイムアウト時は1を返す
fetch_ws_url() {
  local port="$1" ws_file="$2" timeout="$3" waited=0 url
  require_cmd curl
  require_cmd jq
  while [ "$waited" -lt "$timeout" ]; do
    url=$(curl -sf "http://localhost:${port}/json" 2>/dev/null \
      | jq -r '.[] | select(.type=="page") | .webSocketDebuggerUrl' 2>/dev/null | head -1)
    if [ -n "$url" ]; then
      mkdir -p "$(dirname "$ws_file")"
      printf '%s' "$url" > "$ws_file"
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done
  return 1
}
