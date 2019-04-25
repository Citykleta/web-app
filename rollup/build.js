import node from 'rollup-plugin-node-resolve';
import cjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';
import {terser} from 'rollup-plugin-terser';

const plugins = [replace({
    delimiters: ['<@', '@>'],
    include: './src/conf/*.js',
    MAP_STYLE: process.env.NODE_ENV === 'production' ? 'mapbox://styles/lorenzofox/cjrryj82s4yyl2snsv6sixrxb' : 'http://localhost:8080/styles/klokantech-basic/style.json',
    MAPBOX_PUBLIC_TOKEN: process.env.MAPBOX_PUBLIC_TOKEN || 'pk.eyJ1IjoibG9yZW56b2ZveCIsImEiOiJjanFwYWs3NXAyeG94NDhxanE5NHJodDZvIn0.hSLz7F4CLkY5jOdnf03PEw'
}), replace({
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'dev')
}), node({}), cjs()];

if (process.env.NODE_ENV === 'production') {
    plugins.push(terser());
}

export default {
    input: ['./src/app/elements/index.js', './src/app/map/index.js'],
    output: [{
        dir: './dist/',
        sourcemap: true,
        format: 'es'
    }],
    plugins
};
