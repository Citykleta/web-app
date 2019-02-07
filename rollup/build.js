import node from 'rollup-plugin-node-resolve';
import cjs from 'rollup-plugin-commonjs';

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
    plugins: [node(), cjs()]
};
