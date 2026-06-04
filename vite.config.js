import { defineConfig } from 'vite';
import { resolve } from 'path';

const templateHtml = resolve(__dirname, 'template/konkursotron-template.html');

export default defineConfig({
	base: './',
	root: '.',
	publicDir: false,
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		manifest: true,
		modulePreload: false,
		cssCodeSplit: false,
		rollupOptions: {
			input: templateHtml,
			output: {
				format: 'iife',
				name: 'KTronBundle',
				inlineDynamicImports: true,
				entryFileNames: 'assets/konkursotron.js',
				assetFileNames: 'assets/konkursotron.[ext]',
			},
		},
	},
	server: {
		open: '/konkursotron.html',
	},
	plugins: [
		{
			name: 'konkursotron-html-alias',
			configureServer(server) {
				server.middlewares.use((req, _res, next) => {
					if (req.url === '/konkursotron.html' || req.url?.startsWith('/konkursotron.html?')) {
						req.url = '/template/konkursotron-template.html';
					}
					next();
				});
			},
		},
	],
});
