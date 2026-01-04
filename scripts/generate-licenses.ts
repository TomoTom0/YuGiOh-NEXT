#!/usr/bin/env bun
/**
 * THIRD-PARTY-LICENSES.md 自動生成スクリプト
 *
 * 使用方法:
 *   bun run license:generate
 *
 * 直接依存のみのライセンス情報を取得し、Markdown形式で出力します。
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface LicenseInfo {
  licenses: string;
  repository?: string;
  publisher?: string;
  email?: string;
  path: string;
  licenseFile?: string;
}

type LicenseData = Record<string, LicenseInfo>;

// 共通ライセンス本文
const LICENSE_TEXTS: Record<string, string> = {
  MIT: `The MIT License (MIT)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.`,

  ISC: `ISC License

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`,

  'Apache-2.0': `Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Definitions.

   "License" shall mean the terms and conditions for use, reproduction,
   and distribution as defined by Sections 1 through 9 of this document.

   "Licensor" shall mean the copyright owner or entity authorized by
   the copyright owner that is granting the License.

   "Legal Entity" shall mean the union of the acting entity and all
   other entities that control, are controlled by, or are under common
   control with that entity.

   "You" (or "Your") shall mean an individual or Legal Entity
   exercising permissions granted by this License.

   "Source" form shall mean the preferred form for making modifications,
   including but not limited to software source code, documentation
   source, and configuration files.

   "Object" form shall mean any form resulting from mechanical
   transformation or translation of a Source form.

   "Work" shall mean the work of authorship made available under the License.

   "Derivative Works" shall mean any work that is based on the Work.

   "Contribution" shall mean any work of authorship submitted to the Licensor.

   "Contributor" shall mean Licensor and any Legal Entity on behalf of whom
   a Contribution has been received by Licensor.

2. Grant of Copyright License.
   Subject to the terms of this License, each Contributor grants to You a
   perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable
   copyright license to reproduce, prepare Derivative Works of, publicly
   display, publicly perform, sublicense, and distribute the Work.

3. Grant of Patent License.
   Subject to the terms of this License, each Contributor grants to You a
   perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable
   patent license to make, have made, use, offer to sell, sell, import, and
   otherwise transfer the Work.

4. Redistribution.
   You may reproduce and distribute copies of the Work provided that You
   meet the following conditions:
   (a) Give any other recipients a copy of this License; and
   (b) Cause modified files to carry prominent notices stating changes; and
   (c) Retain all copyright notices from the Source form; and
   (d) Include a readable copy of the attribution notices.

5. Submission of Contributions.
   Any Contribution submitted for inclusion in the Work shall be under the
   terms of this License.

6. Trademarks.
   This License does not grant permission to use trade names, trademarks,
   or product names of the Licensor.

7. Disclaimer of Warranty.
   The Work is provided on an "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND.

8. Limitation of Liability.
   In no event shall any Contributor be liable for damages arising from
   the use of the Work.

9. Accepting Warranty or Additional Liability.
   You may offer additional warranty or liability obligations.

END OF TERMS AND CONDITIONS`,
};

function getLicenseData(): LicenseData {
  const output = execSync('bunx license-checker-rseidelsohn --production --direct 0 --json', {
    encoding: 'utf-8',
  });
  return JSON.parse(output);
}

/**
 * パッケージ名@バージョン形式の文字列からパッケージ名を抽出
 * @example getPackageName('@scope/pkg@1.2.3') // '@scope/pkg'
 * @example getPackageName('pkg@1.2.3') // 'pkg'
 */
function getPackageName(nameWithVersion: string): string {
  if (nameWithVersion.startsWith('@')) {
    // Scoped package: @scope/pkg@1.2.3 -> ['', 'scope/pkg', '1.2.3']
    return `@${nameWithVersion.split('@')[1]}`;
  }
  // Unscoped package: pkg@1.2.3 -> ['pkg', '1.2.3']
  return nameWithVersion.split('@')[0];
}

function generateMarkdown(data: LicenseData): string {
  const lines: string[] = [];
  const projectName = 'ygo-next';

  lines.push('# Third-Party Licenses');
  lines.push('');
  lines.push('This project uses the following open source libraries:');
  lines.push('');

  // ライセンス種別を集計
  const licenseTypes = new Set<string>();

  // 自分自身を除外してソート
  const entries = Object.entries(data)
    .filter(([name]) => !name.startsWith(projectName))
    .sort(([a], [b]) => a.localeCompare(b));

  for (const [nameVersion, info] of entries) {
    const displayName = getPackageName(nameVersion);

    lines.push('---');
    lines.push('');
    lines.push(`## ${displayName}`);
    lines.push('');
    lines.push(`**License:** ${info.licenses}`);
    if (info.publisher) {
      lines.push(`**Author:** ${info.publisher}${info.email ? ` <${info.email}>` : ''}`);
    }
    if (info.repository) {
      lines.push(`**Source:** ${info.repository}`);
    }
    lines.push('');

    licenseTypes.add(info.licenses);
  }

  // 共通ライセンス本文を追加
  lines.push('---');
  lines.push('');
  lines.push('# License Texts');
  lines.push('');

  for (const licenseType of Array.from(licenseTypes).sort()) {
    if (LICENSE_TEXTS[licenseType]) {
      lines.push(`## ${licenseType} License`);
      lines.push('');
      lines.push('```');
      lines.push(LICENSE_TEXTS[licenseType]);
      lines.push('```');
      lines.push('');
    }
  }

  // 全依存関係についての注記
  lines.push('---');
  lines.push('');
  lines.push('## Other Dependencies');
  lines.push('');
  lines.push('This project also uses various other open source libraries as transitive dependencies.');
  lines.push('For a complete list of all dependencies and their licenses, run:');
  lines.push('');
  lines.push('```bash');
  lines.push('bunx license-checker-rseidelsohn --summary');
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

interface ThirdPartyLibrary {
  name: string;
  license: string;
  copyright?: string;
}

function generateLibrariesJson(data: LicenseData): ThirdPartyLibrary[] {
  const projectName = 'ygo-next';

  // 自分自身を除外してソート
  const entries = Object.entries(data)
    .filter(([name]) => !name.startsWith(projectName))
    .sort(([a], [b]) => a.localeCompare(b));

  return entries.map(([nameVersion, info]) => {
    const displayName = getPackageName(nameVersion);

    const copyright = info.publisher
      ? `(c) ${info.publisher}`
      : undefined;

    return {
      name: displayName,
      license: info.licenses,
      copyright,
    };
  });
}

function main() {
  console.log('Generating license files...');

  const data = getLicenseData();

  // 1. THIRD-PARTY-LICENSES.md
  const markdown = generateMarkdown(data);
  const mdPath = path.join(process.cwd(), 'THIRD-PARTY-LICENSES.md');
  fs.writeFileSync(mdPath, markdown);
  console.log(`Generated: ${mdPath}`);

  // 2. src/generated/third-party-libraries.json (UI用)
  const libraries = generateLibrariesJson(data);
  const generatedDir = path.join(process.cwd(), 'src', 'generated');
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }
  const jsonPath = path.join(generatedDir, 'third-party-libraries.json');
  fs.writeFileSync(jsonPath, JSON.stringify(libraries, null, 2));
  console.log(`Generated: ${jsonPath}`);
}

main();
