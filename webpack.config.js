const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'inline-source-map',

    entry: {
      content: './src/content/index.ts',
      background: './src/background/main.ts',
      popup: './src/popup/index.ts',
    },

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },

    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: [/node_modules/, /__tests__/],
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },

    resolve: {
      extensions: ['.ts', '.js'],
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
      // manifest.jsonをコピー
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'src/manifest.json',
            to: 'manifest.json',
          },
          {
            from: 'src/options.html',
            to: 'options.html',
          },
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
        ],
      }),

      // Popup HTMLを生成
      new HtmlWebpackPlugin({
        template: './src/popup/index.html',
        filename: 'popup.html',
        chunks: ['popup'],
      }),
    ],

    optimization: {
      minimize: isProduction,
    },
  };
};
