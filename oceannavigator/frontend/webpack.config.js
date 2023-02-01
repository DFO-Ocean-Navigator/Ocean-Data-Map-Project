const webpack = require("webpack");
const path = require("path");

const BUILD_DIR = path.resolve(__dirname, "public");
const APP_DIR = path.resolve(__dirname, "src");

const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: [
      APP_DIR + "/index.jsx",
  ],
  output: {
      path: BUILD_DIR,
      filename: "oceannavigator.js",
      publicPath: "/public/"
    },
  plugins: [
    new webpack.DefinePlugin({
      "_": "this.props.t",
    }),
    new HtmlWebpackPlugin({
      filename: "index.html",
      hash: true,
      title: "Ocean Navigator",
      xhtml: true,
      template: "src/index.ejs",
    }),
  ],
  devServer: {
    port: 3030, // you can change the port
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/, // .js and .jsx files
        exclude: /node_modules/, // excluding the node_modules folder
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.(sa|sc|c)ss$/, // styles files
        use: ["style-loader", "css-loader", "sass-loader"],
      },
      {
        test: /\.(png|woff|woff2|eot|ttf|svg)$/, // to import images and fonts
        loader: "url-loader",
        options: { limit: false },
      },
    ],
  },
  resolve: {
    alias: {
      "axios/lib": path.resolve(__dirname, "./node_modules/axios/lib"),
    }
  }
};