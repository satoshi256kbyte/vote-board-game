import * as esbuild from 'esbuild';
import { readFileSync, rmSync } from 'fs';

// 古いビルドファイルをクリーンアップ
try {
  rmSync('dist', { recursive: true, force: true });
} catch (error) {
  // ディレクトリが存在しない場合は無視
}

const sharedPackageJson = JSON.parse(
  readFileSync(new URL('../shared/package.json', import.meta.url), 'utf-8')
);

// AWS SDK v3 と shared パッケージは external に指定
const externalDeps = ['@aws-sdk/*', ...Object.keys(sharedPackageJson.dependencies || {})];

// Lambda handler のビルド
await esbuild.build({
  entryPoints: ['src/lambda.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/lambda.mjs',
  external: externalDeps,
  sourcemap: true,
  minify: false,
  banner: {
    js: `
// AWS Lambda ESM handler
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`.trim(),
  },
});

// Batch handler のビルド
await esbuild.build({
  entryPoints: ['src/batch.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/batch.mjs',
  external: externalDeps,
  sourcemap: true,
  minify: false,
  banner: {
    js: `
// AWS Lambda ESM handler
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`.trim(),
  },
});

console.log('✅ Build completed successfully');
