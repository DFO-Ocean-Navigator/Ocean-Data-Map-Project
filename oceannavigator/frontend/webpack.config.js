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
    new HtmlWebpackPlugin({
      filename: "index.html",
      hash: true,
      title: "Ocean Navigator",
      xhtml: true,
      template: "src/index.ejs",
    }),
    new webpack.DefinePlugin({
      "process.env.LOGGER_LEVEL": JSON.stringify('info')
    })
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
        test: /\.(png|gif|svg|eot|woff2?|ttf|svg)(\?.*)?$/,
        loader: "file-loader",
        options: {
          name: "/[name].[ext]"
        }
      }
    ],
  },
  resolve: {
    alias: {
      "axios/lib": path.resolve(__dirname, "./node_modules/axios/lib"),
    }
  }
};