
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import strip from '@rollup/plugin-strip';
import css from 'rollup-plugin-import-css';
import dotenv from 'rollup-plugin-dotenv';

const {BUILD} = process.env;
const production = BUILD === 'production';


const nodeResolve = resolve({
	browser: true,
	preferBuiltins: false
});

const cssOptions = {output: 'cyclemaps.css'};

export default {
	input: ['build/main.js'],
	output: {
		name: 'cyclemaps',
		file: 'dist/cyclemaps.js',
		format: 'esm',
		indent: false,
		banner: '/* MIT License Copyright (c) 2024 Contributors */',
	},
	plugins: production ?
		[nodeResolve, css(cssOptions), strip({functions: ['console.log', 'assert.*']}), terser(), commonjs(), dotenv()] :
		[nodeResolve, css(cssOptions), commonjs(), dotenv()],
};

