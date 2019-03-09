import node from 'rollup-plugin-node-resolve';
import cjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';

export default {
    input: './src/app/index.js',
    output: [{
        file: './dist/app.js',
        format: 'iife',
        name: 'main',
        sourcemap: true
    }, {
        file: './dist/app-module.js',
        format: 'es',
        sourcemap: true
    }],
    plugins: [replace({
        delimiters: ['<@', '@>'],
        include: './src/conf/*.js',
        MAP_STYLE: process.env.NODE_ENV === 'production' ? 'mapbox://styles/lorenzofox/cjrryj82s4yyl2snsv6sixrxb' : 'http://localhost:8080/styles/klokantech-basic/style.json',
    }), replace({
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'dev')
    }), node(), cjs()]
};
