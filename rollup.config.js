
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import strip from '@rollup/plugin-strip';
import css from 'rollup-plugin-import-css';

const {BUILD} = process.env;
const production = BUILD === 'production';


const nodeResolve = resolve({
	browser: true,
	preferBuiltins: false
});

export default {
	input: ['build/main.js'],
	output: {
		name: 'cyclemaps',
		file: 'dist/cyclemaps.js',
		format: 'esm',
		indent: false,
		banner: '/* MIT License Copyright (c) 2023 Contributors */',
	},
	plugins: production ?
		[nodeResolve, css(), strip(), terser(), commonjs()] :
		[nodeResolve, css(), commonjs()],
};

