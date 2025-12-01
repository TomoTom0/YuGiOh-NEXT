const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'inline-source-map',

    // ES Module出力を有効化（チャンク用）
    experiments: {
      outputModule: true,
    },

    // ESM環境であることを明示
    target: ['web', 'es2020'],

    entry: {
      content: './src/content/index.ts',
      background: './src/background/main.ts',
      popup: './src/popup/index.ts',
      options: './src/options/index.ts',
    },

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      chunkFilename: '[name].chunk.js',
      // publicPathは実行時に__webpack_public_path__で動的設定するため空に
      publicPath: '',
      // チャンクの読み込み方式をネイティブimportに変更（チャンクのみES module）
      chunkFormat: 'module',
      clean: true,
    },

    module: {
      rules: [
        {
          test: /\.vue$/,
          loader: 'vue-loader',
        },
        {
          test: /\.ts$/,
          loader: 'ts-loader',
          exclude: [/node_modules/, /__tests__/],
          options: {
            appendTsSuffixTo: [/\.vue$/],
            transpileOnly: false,
            compilerOptions: {
              noUnusedParameters: false,  // Vueの自動生成コードのため
              noImplicitAny: false,  // Vueのrefコールバックのため
              noUncheckedIndexedAccess: false,  // Vue配列操作の型エラー回避
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.scss$/,
          use: ['style-loader', 'css-loader', 'sass-loader'],
        },
      ],
    },

    resolve: {
      extensions: ['.ts', '.js', '.vue'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
      fallback: {
        // Node.jsモジュールはブラウザで使用しないため無視
        "path": false,
        "url": false,
        "https": false,
        "fs": false,
      },
    },

    plugins: [
      new VueLoaderPlugin(),

      // public/ディレクトリ（manifest.json含む）と画像をコピー
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'public',
            to: '.',
            globOptions: {
              ignore: ['**/.gitkeep'],
            },
            noErrorOnMissing: true,
          },
          {
            from: 'src/images',
            to: 'images',
            noErrorOnMissing: true,
          },
          {
            from: 'src/popup/popup.css',
            to: 'popup.css',
          },
        ],
      }),

      // Popup HTMLを生成
      new HtmlWebpackPlugin({
        template: './src/popup/index.html',
        filename: 'popup.html',
        chunks: ['popup'],
      }),

      // Options HTMLを生成（ES Moduleスクリプト対応）
      new HtmlWebpackPlugin({
        template: './src/options/index.html',
        filename: 'options.html',
        chunks: ['options'],
        scriptLoading: 'module',
      }),
    ],

    optimization: {
      minimize: isProduction,
      splitChunks: false,
    },
  };
};
