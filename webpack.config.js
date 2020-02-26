const path = require('path');
const webpack = require('webpack');
const pkgJson = require('./package.json');

const sourcePath = path.resolve(__dirname, 'lib/');
const distPath = path.resolve(__dirname, 'dist/');
const importHelper = require('@babel/helper-module-imports');

/* Allow to customise builds through env-vars */
const env = process.env;
const addSubtitleSupport = !!env.SUBTITLE || !!env.USE_SUBTITLES;
const addAltAudioSupport = !!env.ALT_AUDIO || !!env.USE_ALT_AUDIO;
const addEMESupport = !!env.EME_DRM || !!env.USE_EME_DRM;

const createDefinePlugin = (type) => {
  const buildConstants = {
    __VERSION__: JSON.stringify(pkgJson.version),
    __USE_SUBTITLES__: JSON.stringify(type === 'main' || addSubtitleSupport),
    __USE_ALT_AUDIO__: JSON.stringify(type === 'main' || addAltAudioSupport),
    __USE_EME_DRM__: JSON.stringify(type === 'main' || addEMESupport)
  };
  return new webpack.DefinePlugin(buildConstants);
};
module.exports = () => {
    let nodeEnv = 'production';
    if (env && env.NODE_ENV === 'development') {
        nodeEnv = 'development';
    }

    const isDev = nodeEnv === 'development';

    const plugins = [
        createDefinePlugin('main')
    ];

    if (!isDev) {
        plugins.push(
            new webpack.LoaderOptionsPlugin({
                minimize: true,
                debug: false,
            }),
            new webpack.optimize.UglifyJsPlugin({
                compress: {
                    warnings: false,
                    screw_ie8: true,
                    conditionals: true,
                    unused: true,
                    comparisons: true,
                    sequences: true,
                    dead_code: true,
                    evaluate: true,
                    if_return: true,
                    join_vars: true,
                    pure_funcs: ['console.log', 'console.info', 'console.warn'],
                },
                mangle: true,
                output: {
                    comments: false,
                },
            })
        );
    }

    return {
        devtool: isDev && 'inline-source-map',
        entry: path.resolve(sourcePath, 'main.js'),
        target: 'web',
        output: {
            path: distPath,
            filename: isDev ? 'videojs-hlsjs-plugin-full.js' : 'videojs-hlsjs-plugin.js',
            publicPath: '/dist',
            library: 'videojs-hlsjs-plugin',
            libraryTarget: 'umd',
        },
        resolve: {
            // Add `.ts` as a resolvable extension.
            extensions: ['.ts', '.js']
        },        
        module: {
            rules: [{
                test: /\.(ts|js)$/,
                loader: 'babel-loader',
                options: {
                  babelrc: false,
                  presets: [
                    '@babel/preset-typescript',
                    ['@babel/preset-env', {
                      loose: true,
                      modules: false,
                      targets: {
                        browsers: [
                          'chrome >= 47',
                          'firefox >= 51',
                          'ie >= 11',
                          'safari >= 8',
                          'ios >= 8',
                          'android >= 4'
                        ]
                      }
                    }]
                  ],
                  plugins: [
                    ['@babel/plugin-proposal-class-properties', {
                      loose: true
                    }],
                    '@babel/plugin-proposal-object-rest-spread',
                    {
                      visitor: {
                        CallExpression: function (espath) {
                          if (espath.get('callee').matchesPattern('Number.isFinite')) {
                            espath.node.callee = importHelper.addNamed(espath, 'isFiniteNumber', path.resolve('src/polyfills/number-isFinite'));
                          }
                        }
                      }
                    }
                  ]
                }
              }],
        },

        plugins,

        performance: !isDev && {
            hints: 'warning',
        },

        stats: {
            colors: {
                green: '\u001b[32m',
            },
        },
    };
};
