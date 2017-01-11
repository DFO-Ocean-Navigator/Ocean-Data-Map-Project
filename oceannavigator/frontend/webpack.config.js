var webpack = require('webpack');
var path = require('path');

var BUILD_DIR = path.resolve(__dirname, 'public');
var APP_DIR = path.resolve(__dirname, 'src');

var ExtractTextPlugin = require("extract-text-webpack-plugin");

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
                loaders: ['babel']
            },
            {
                test: /\.scss$/,
                // loaders: ['style', 'css', 'sass']
                loader: ExtractTextPlugin.extract("style-loader", "css-loader!sass-loader")
            },
            {
                test: /\.css$/,
                // loaders: ['style', 'css']
                loader: ExtractTextPlugin.extract("style-loader", "css-loader")
            },
            {
                test: /\.(png|gif|svg|eot|woff2?|ttf|svg)(\?.*)?$/,
                loaders: ['file?name=/[name].[ext]']
            },
            {
                test: /\.json$/,
                loaders: ['json']
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
        new ExtractTextPlugin("oceannavigator.css")
    ]
};

module.exports = config;
