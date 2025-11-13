/**
 * 動画撮影用のCDPヘルパー
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Chrome CDPに接続して動画撮影機能を提供
 */
function connectCDP() {
  const wsUrl = fs.readFileSync('.chrome_playwright_ws', 'utf8').trim();
  const ws = new WebSocket(wsUrl);
  let messageId = 1;

  const helper = {
    ws,
    messageId: () => messageId++,

    /**
     * CDPコマンドを送信
     */
    sendCommand(method, params = {}) {
      return new Promise((resolve) => {
        const id = this.messageId();
        const handler = (data) => {
          const message = JSON.parse(data);
          if (message.id === id) {
            ws.off('message', handler);
            resolve(message);
          }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    },

    /**
     * JavaScriptを評価（戻り値あり）
     */
    async evaluate(expression) {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression,
        returnByValue: true
      });
      return result.result && result.result.result ? result.result.result.value : undefined;
    },

    /**
     * ページに移動
     */
    async navigate(url) {
      await this.sendCommand('Page.navigate', { url });
    },

    /**
     * 待機（ミリ秒）
     */
    async wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * 動画を撮影（領域指定可能）
     * @param {string} outputPath - 出力先のファイルパス（.mp4）
     * @param {number} duration - 撮影時間（ミリ秒）
     * @param {object} clip - 撮影領域 {x, y, width, height}（省略時は全画面）
     * @param {number} fps - フレームレート（デフォルト: 30）
     */
    async recordVideo(outputPath, duration, clip = null, fps = 30) {
      console.log(`Recording video to: ${outputPath}`);
      console.log(`Duration: ${duration}ms, FPS: ${fps}`);

      // libx264のため、幅と高さを偶数に調整
      if (clip) {
        clip.width = Math.floor(clip.width / 2) * 2;
        clip.height = Math.floor(clip.height / 2) * 2;
        console.log(`Clip: x=${clip.x}, y=${clip.y}, width=${clip.width}, height=${clip.height}`);
      } else {
        // 全画面録画の場合、ビューポートサイズを取得して偶数に調整
        const viewport = await this.evaluate(`
          (() => {
            return {
              width: window.innerWidth,
              height: window.innerHeight
            };
          })()
        `);
        clip = {
          x: 0,
          y: 0,
          width: Math.floor(viewport.width / 2) * 2,
          height: Math.floor(viewport.height / 2) * 2
        };
        console.log(`Full screen (adjusted): width=${clip.width}, height=${clip.height}`);
      }

      const frameInterval = 1000 / fps; // ミリ秒
      const frames = [];
      const tempDir = path.join(path.dirname(outputPath), '.temp_frames');

      // 一時ディレクトリ作成
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const startTime = Date.now();
      let frameCount = 0;

      // フレームを連続撮影
      while (Date.now() - startTime < duration) {
        const result = await this.sendCommand('Page.captureScreenshot', {
          format: 'png',
          clip: clip ? { ...clip, scale: 1 } : undefined
        });

        if (result.result && result.result.data) {
          const buffer = Buffer.from(result.result.data, 'base64');
          const framePath = path.join(tempDir, `frame_${String(frameCount).padStart(5, '0')}.png`);
          fs.writeFileSync(framePath, buffer);
          frames.push(framePath);
          frameCount++;
        }

        // 次のフレームまで待機
        const elapsed = Date.now() - startTime;
        const nextFrameTime = (frameCount + 1) * frameInterval;
        const waitTime = Math.max(0, nextFrameTime - elapsed);
        if (waitTime > 0) {
          await this.wait(waitTime);
        }
      }

      console.log(`Captured ${frameCount} frames`);

      // ffmpegで動画作成
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 指定されたdurationに合わせて入力フレームレートを調整
      // （スクリーンショットキャプチャが遅いため、実際のフレーム数は少ない）
      const targetDuration = duration / 1000; // 秒
      const inputFps = frameCount / targetDuration;
      console.log(`Adjusting framerate: ${inputFps.toFixed(2)} fps to match ${targetDuration}s duration`);

      const cmd = `ffmpeg -y -framerate ${inputFps} -i "${tempDir}/frame_%05d.png" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 "${outputPath}"`;
      console.log('Creating video with ffmpeg...');
      await execAsync(cmd);

      // 一時ファイル削除
      fs.rmSync(tempDir, { recursive: true, force: true });

      console.log(`✅ Video saved: ${outputPath}`);
      return outputPath;
    },

    /**
     * 要素の領域を取得
     * @param {string} selector - CSSセレクタ
     * @param {number} padding - パディング（デフォルト: 0）
     */
    async getElementClip(selector, padding = 0) {
      const rect = await this.evaluate(`
        (() => {
          const el = document.querySelector('${selector}');
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height
          };
        })()
      `);

      if (!rect) {
        throw new Error(`Element not found: ${selector}`);
      }

      return {
        x: Math.max(0, rect.x - padding),
        y: Math.max(0, rect.y - padding),
        width: rect.width + padding * 2,
        height: rect.height + padding * 2
      };
    },

    /**
     * 接続を閉じる
     */
    close() {
      ws.close();
    }
  };

  return new Promise((resolve) => {
    ws.on('open', () => {
      resolve(helper);
    });
  });
}

/**
 * 動画をアニメーションGIFに変換
 * @param {string} inputPath - 入力動画パス
 * @param {string} outputPath - 出力GIFパス
 * @param {object} options - オプション
 */
async function convertToGif(inputPath, outputPath, options = {}) {
  const fps = options.fps || 10;
  const scale = options.scale || -1; // -1 = 元のサイズ
  const colors = options.colors || 256;

  console.log(`Converting ${path.basename(inputPath)} to GIF...`);
  console.log(`FPS: ${fps}, Scale: ${scale === -1 ? 'original' : scale}, Colors: ${colors}`);

  // パレット生成（高品質GIF用）
  const paletteFile = path.join(path.dirname(outputPath), '.palette.png');
  const scaleFilter = scale === -1 ? '' : `scale=${scale}:-1:flags=lanczos,`;

  const paletteCmd = `ffmpeg -y -i "${inputPath}" -vf "${scaleFilter}fps=${fps},palettegen=max_colors=${colors}" "${paletteFile}"`;
  await execAsync(paletteCmd);

  // GIF生成
  const gifCmd = `ffmpeg -y -i "${inputPath}" -i "${paletteFile}" -filter_complex "${scaleFilter}fps=${fps}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5" "${outputPath}"`;
  await execAsync(gifCmd);

  // パレットファイル削除
  fs.unlinkSync(paletteFile);

  // ファイルサイズを取得
  const stats = fs.statSync(outputPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

  console.log(`✅ GIF saved: ${outputPath} (${sizeMB} MB)`);
  return outputPath;
}

module.exports = { connectCDP, convertToGif };
