import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';

/**
 * Rollup ビルド設定
 *
 * 入力: widget/src/index.ts
 * 出力: public/widget.js (IIFE, gzip後 30KB 以下)
 *
 * 要件5 AC-11: gzip 後 30KB 以下
 */
export default {
  input: 'widget/src/index.ts',
  output: {
    file: 'public/widget.js',
    format: 'iife',
    name: 'KoeWidget',
    sourcemap: false,
  },
  plugins: [
    resolve({
      browser: true,
    }),
    typescript({
      tsconfig: './widget/tsconfig.json',
      compilerOptions: {
        declaration: false,
        declarationMap: false,
        noEmit: false,
      },
    }),
    terser({
      compress: {
        passes: 2,
        drop_console: false, // コンソールエラーは残す
        pure_funcs: ['console.log', 'console.debug'],
      },
      format: {
        comments: false,
      },
    }),
  ],
};
