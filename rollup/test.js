import node from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import cjs from 'rollup-plugin-commonjs';

export default {
    input: './test/unit/index.js',
    output: [{
        file: './test/dist/debug.js',
        format: 'iife',
        name: 'test',
        sourcemap: true
    }],
    plugins: [
        replace({
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'dev')
        }),
        node(),
        cjs()
    ]
};
