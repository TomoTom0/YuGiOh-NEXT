# CI (GitHub Actions)

`.github/workflows/ci.yml` が担当する。build、単体テスト、型検査を1 job (`build-and-test`) で実行する。

## 実行タイミング

- `main` / `dev` 向けの PR
- `main` / `dev` への push
- 手動実行 (`workflow_dispatch`)

同じ ref で走っている実行があるときは、前の実行を打ち切ってから始まる (`concurrency` の `cancel-in-progress: true`)。

## step

| step | 内容 |
|---|---|
| Checkout / Setup (pnpm, Node 22, uv) / Install dependencies | 依存を準備する。uv は `tests/unit/scripts/verify-conditions.test.ts` が `uv run python` で `scripts/design/verify-conditions.py` を起動するために必要 |
| Build (`id: build`) | `pnpm run build:prod` |
| Run unit tests (`id: unit-tests`) | `pnpm exec vitest run --reporter=verbose` |
| Type check (`id: type-check`) | `pnpm run type-check` |
| Upload build artifacts | `dist/` を artifact として保存する (`if: always()`) |
| Summary | `bash scripts/ci-summary.sh` を実行する (`if: always()`) |

## 失敗の伝播

- Build / Run unit tests / Type check に `continue-on-error` は付けない。失敗した step があると job は失敗になり、後続の step は skip される。Upload build artifacts と Summary は `if: always()` のため、失敗後も実行される。
- Summary は常に実行されるが、失敗を握りつぶさない。Build / Run unit tests / Type check の conclusion と job status がすべて `success` のときだけ exit 0 になり、それ以外 (failure / cancelled / timed_out / skipped / 未設定) は exit 1 になる。失敗した run では、失敗した step に加えて Summary step も失敗として表示される。
- Summary の結果は step の log と、run の Summary ページ (`GITHUB_STEP_SUMMARY`) に出る。
- 型検査は `scripts/vue-tsc-known-errors.json` に記載された既知のエラーを許容する。一覧にないエラー、または一覧にあるのに発生しなくなったエントリがあると Type check は失敗する。
- 必須 status check を含む保護ルールは [branch-protection.md](./branch-protection.md) を参照。

## ローカルでの再現

CI と同じ処理を手元で実行する:

```bash
mise run build:prod
mise run test:vitest
mise run type-check
```

Summary の判定だけを試す (終了コードを確認する):

```bash
JOB_STATUS=failure BUILD_CONCLUSION=failure UNIT_TESTS_CONCLUSION=skipped TYPE_CHECK_CONCLUSION=skipped \
  bash scripts/ci-summary.sh
```

## テスト

- `tests/unit/scripts/ci-summary.test.ts`: `scripts/ci-summary.sh` の終了コードと表示、`ci.yml` の配線
- 条件書: `tests/design/ci-summary/conditions.toml`、`tests/design/ci-workflow/conditions.toml`
