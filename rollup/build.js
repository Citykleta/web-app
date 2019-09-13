import node from 'rollup-plugin-node-resolve';
import cjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';
import {terser} from 'rollup-plugin-terser';

const isProduction = process.env.NODE_ENV === 'production';

const plugins = [replace({
    delimiters: ['<@', '@>'],
    include: './src/conf/*.js',
    MAP_STYLE: isProduction ? process.env.MAPBOX_STYLE : 'http://localhost:8080/styles/osm-bright/style.json',
    API_ENDPOINT: isProduction ? 'https://api.citykleta-test.com' : 'http://localhost:3000',
    MAPBOX_PUBLIC_TOKEN: process.env.MAPBOX_PUBLIC_TOKEN || 'pk.eyJ1IjoibG9yZW56b2ZveCIsImEiOiJjanFwYWs3NXAyeG94NDhxanE5NHJodDZvIn0.hSLz7F4CLkY5jOdnf03PEw'
}), replace({
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'dev')
}), node({}), cjs()];

if (isProduction) {
    plugins.push(terser());
}

export default {
    input: {
        app: './src/index.js',
        settings: './src/app/settings/module.js',
        search: './src/app/search/module.js',
        itinerary: './src/app/itinerary/module.js',
        leisure: './src/app/leisure/module.js',
        map: './src/app/map/index.js'
    },
    output: [{
        dir: './dist/',
        sourcemap: true,
        format: 'es'
    }],
    plugins
};
