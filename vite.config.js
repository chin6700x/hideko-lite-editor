import {
    defineConfig
} from 'vite';
import {
    resolve
} from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.js'),
            name: 'hidekomaxline',
            fileName: (format) => `hidekomaxline.${format === 'es' ? 'js' : 'umd.js'}`,
            formats: ['es', 'umd']
        },
        emptyOutDir: false,
        rollupOptions: {
            output: {
                exports: 'named'
            }
        }
    },
    test: {
        environment: 'jsdom'
    }
});