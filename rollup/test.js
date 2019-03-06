import node from 'rollup-plugin-node-resolve';

export default {
    input: './test/unit/index.js',
    output: [{
        file: './test/dist/debug.js',
        format: 'iife',
        name: 'test',
        sourcemap: true
    }],
    plugins: [node({
        module: true
    })]
};
