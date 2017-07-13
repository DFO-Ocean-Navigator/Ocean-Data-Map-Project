var webpack = require('webpack');
var path = require('path');

var BUILD_DIR = path.resolve(__dirname, 'public');
var APP_DIR = path.resolve(__dirname, 'src');

var ExtractTextPlugin = require("extract-text-webpack-plugin");
var HtmlWebpackPlugin = require('html-webpack-plugin');

var config = {
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
        loaders: [
            {
                test: /\.jsx?$/,
                include: APP_DIR,
                loaders: ['babel-loader']
            },
            {
                test: /\.scss$/,
                // loaders: ['style', 'css', 'sass']
                loader: ExtractTextPlugin.extract({fallback: "style-loader", use: "css-loader!sass-loader"})
            },
            {
                test: /\.css$/,
                // loaders: ['style', 'css']
                loader: ExtractTextPlugin.extract({fallback: "style-loader", use: "css-loader"})
            },
            {
                test: /\.(png|gif|svg|eot|woff2?|ttf|svg)(\?.*)?$/,
                loaders: ['file-loader?name=/[name].[ext]']
            },
            {
                test: /\.json$/,
                loaders: ['json-loader']
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
        // new webpack.ProvidePlugin({
        //     i18n: "i18next",
        // }),
        new webpack.DefinePlugin({
            '_': "i18n.t",
        }),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': `"${process.env.NODE_ENV}"`
        }),
        new ExtractTextPlugin("oceannavigator.css"),
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
