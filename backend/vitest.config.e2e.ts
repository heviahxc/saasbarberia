import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    swc.vite({
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
      module: {
        type: 'es6',
      },
    }),
  ],
  test: {
    globals: true,
    root: './',
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup-env.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});