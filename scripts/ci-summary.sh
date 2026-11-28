#!/usr/bin/env bash
# CI ワークフロー (.github/workflows/ci.yml) の Summary step 本体 (TASK-654 (A))
#
# Build / Run unit tests / Type check は continue-on-error を持たないため、失敗した step が
# あれば job は失敗する。この script は always() で起動される Summary step から呼ばれ、
# 各 step の conclusion と job status を並べて表示し、1つでも success 以外があれば
# 0 以外で終了して、失敗を Summary step にも反映する。
#
# 入力 (ci.yml の Summary step の env で渡す。未設定は success 以外として扱う):
#   JOB_STATUS             ${{ job.status }}
#   BUILD_CONCLUSION       ${{ steps.build.conclusion }}
#   UNIT_TESTS_CONCLUSION  ${{ steps.unit-tests.conclusion }}
#   TYPE_CHECK_CONCLUSION  ${{ steps.type-check.conclusion }}
#   GITHUB_STEP_SUMMARY    設定時はこの file へ結果表を追記する (任意)
#
# 終了コード: 上記4つがすべて success なら 0、それ以外は 1
# テスト: tests/unit/scripts/ci-summary.test.ts
set -euo pipefail

names=()
values=()

# $1: 表示名、$2: conclusion (未設定可)。未設定は (unset) と表示する
record() {
  local name="$1"
  local value="${2:-}"
  names+=("${name}")
  if [ -z "${value}" ]; then
    values+=("(unset)")
  else
    values+=("${value}")
  fi
}

record "Build" "${BUILD_CONCLUSION:-}"
record "Run unit tests" "${UNIT_TESTS_CONCLUSION:-}"
record "Type check (vue-tsc)" "${TYPE_CHECK_CONCLUSION:-}"
record "Job status" "${JOB_STATUS:-}"

passed=true
for value in "${values[@]}"; do
  if [ "${value}" != "success" ]; then
    passed=false
  fi
done

if [ "${passed}" = true ]; then
  result="passed"
  exit_code=0
else
  result="failed"
  exit_code=1
fi

lines=()
for i in "${!names[@]}"; do
  lines+=("- ${names[i]}: ${values[i]}")
done
printf '%s\n' "CI summary" "${lines[@]}" "CI result: ${result}"

# 表示の失敗 (追記先に書けない等) が本来の結果を上書きしないようにする
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "## CI results"
    echo ""
    echo "| item | result |"
    echo "|---|---|"
    for i in "${!names[@]}"; do
      echo "| ${names[i]} | ${values[i]} |"
    done
    echo ""
    echo "CI result: ${result}"
  } >> "${GITHUB_STEP_SUMMARY}" 2>/dev/null || true
fi

exit "${exit_code}"
