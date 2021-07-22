const webpack = require('webpack');
const path = require('path');

const BUILD_DIR = path.resolve(__dirname, 'public');
const APP_DIR = path.resolve(__dirname, 'src');

const ExtractTextPlugin = require("extract-text-webpack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');

const config = {
    entry: [
        'babel-polyfill',
        APP_DIR + '/index.jsx',
    ],
    output: {
        path: BUILD_DIR,
        filename: 'oceannavigator.js',
        publicPath: '/public/'
    },
    module: {
        noParse: /node_modules\/openlayers\/dist\/.*/,
        rules: [
            {
                test: /\.jsx?$/,
                include: APP_DIR,
                loader: 'babel-loader'
            },
            {
                test: /\.scss$/,
                loader: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use: [
                        'css-loader',
                        'sass-loader'
                    ]
                })
            },
            {
                test: /\.css$/,
                loader: ExtractTextPlugin.extract({fallback: "style-loader", use: "css-loader"})
            },
            {
                test: /\.(png|gif|svg|eot|woff2?|ttf|svg)(\?.*)?$/,
                loader: 'file-loader',
                options: {
                    name: '/[name].[ext]'
                }
            }
        ]
    },
    resolve: {
        alias: {
            'jquery-ui': 'jquery-ui/ui/widgets',
            'jquery-ui-css': 'jquery-ui/../../themes/base',
            'jquery-ui-month-picker': 'jquery-ui-month-picker/src',
        }
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
        }),
        new webpack.DefinePlugin({
            '_': "i18n.t",
        }),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': `"${process.env.NODE_ENV}"`
        }),
        new ExtractTextPlugin({
            filename: 'oceannavigator.css'
        }),
        new HtmlWebpackPlugin({
            'filename': 'index.html',
            'hash': true,
            'title': "Ocean Navigator",
            'xhtml': true,
            'template': 'src/index.ejs'
        })
    ]
};

module.exports = config;
