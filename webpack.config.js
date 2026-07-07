/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = (_env, argv) => {
  const mode = argv.mode ?? "development";

  return {
    mode,
    entry: {
      main: [
        path.resolve(__dirname, "./scss/main.scss"),
        path.resolve(__dirname, "./src/main.ts"),
        path.resolve(__dirname, "./src/ui.ts"),
      ],
    },
    ignoreWarnings: [
      {
        module: /sass/,
      },
    ],
    output: {
      path: path.resolve(__dirname, "./public/dist"),
      filename: "[name].js",
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
      extensionAlias: {
        ".js": [".ts", ".js"],
      },
    },
    module: {
      rules: [
        {
          test: /\.(scss)$/,
          use: [
            MiniCssExtractPlugin.loader,
            { loader: "css-loader" },
            {
              loader: require.resolve("sass-loader"),
              options: { sassOptions: { quietDeps: true } },
            },
          ],
        },
        {
          test: /\.(woff2?|ttf|eot)$/i,
          type: "asset/resource",
          generator: {
            filename: "fonts/[name][ext]",
          },
        },
        {
          test: /\.(svg|png|jpe?g|gif)$/i,
          use: [
            {
              loader: "file-loader",
              options: {
                name: "[path]/[name].[ext]",
              },
            },
          ],
        },
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: "[name].css",
      }),
    ],
    optimization: {
      minimizer: mode === "production" ? ["...", new CssMinimizerPlugin()] : ["..."],
    },
  };
};
