
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import strip from '@rollup/plugin-strip';
import css from 'rollup-plugin-import-css';
import dotenv from 'rollup-plugin-dotenv';
import copy from 'rollup-plugin-copy';

const {BUILD} = process.env;
const production = BUILD === 'production';


const nodeResolve = resolve({
	browser: true,
	preferBuiltins: false
});

const cssResolve = css({output: 'cyclemaps.css'});

const maplibreCopyWorker = copy({
	targets: [{
		src: ['node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', 'node_modules/maplibre-gl/dist/maplibre-gl-shared.mjs'],
		dest: 'dist',
	}]
});

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
		[maplibreCopyWorker, nodeResolve, cssResolve, strip({functions: ['console.log', 'assert.*']}), terser(), commonjs(), dotenv()] :
		[maplibreCopyWorker, nodeResolve, cssResolve, commonjs(), dotenv()],
};

