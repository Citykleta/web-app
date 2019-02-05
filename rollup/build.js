import node from 'rollup-plugin-node-resolve';
import cjs from 'rollup-plugin-commonjs';

export default {
    input: './src/index.js',
    output: [{
        file: './dist/index.js',
        format: 'iife',
        name: 'main',
        sourcemap: true
    }],
    plugins: [node(), cjs()]
};
