const webpack = require("webpack");
const path = require("path");

const BUILD_DIR = path.resolve(__dirname, "public");
const APP_DIR = path.resolve(__dirname, "src");

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const config = {
  entry: [
    APP_DIR + "/index.jsx",
  ],
  output: {
    path: BUILD_DIR,
    filename: "oceannavigator.js",
    publicPath: "/public/"
  },
  module: {
    rules: [
      {
        test: /\.(t|j)sx?$/,
        exclude: [/node_modules/],
        loader: ["ts-loader"]
      },
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          "sass-loader"
        ]
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"]
      },
      {
        test: /\.(png|gif|svg|eot|woff2?|ttf|svg)(\?.*)?$/,
        loader: "file-loader",
        options: {
          name: "/[name].[ext]"
        }
      }
    ]
  },
  resolve: {
    alias: {
      "jquery-ui": "jquery-ui/ui/widgets",
      "jquery-ui-css": "jquery-ui/../../themes/base",
      "jquery-ui-month-picker": "jquery-ui-month-picker/src",
    },
    extensions: [".ts", ".tsx", ".js", ".jsx"]
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery",
    }),
    new webpack.DefinePlugin({
      "_": "this.props.t",
    }),
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": `"${process.env.NODE_ENV}"`
    }),
    new MiniCssExtractPlugin({
      filename: "oceannavigator.css",
      chunkFilename: "[name].css"
    }),
    new HtmlWebpackPlugin({
      filename: "index.html",
      hash: true,
      title: "Ocean Navigator",
      xhtml: true,
      template: "src/index.ejs",
    })
  ]
};

module.exports = config;
