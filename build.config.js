import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  bundle: true,
  minify: !isWatch,
  sourcemap: isWatch,
  target: 'es2020',
  format: 'esm',
  platform: 'browser',
};

// Ensure public directory exists
const publicDir = join(__dirname, 'public');
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

// Build background service worker
async function buildBackground() {
  await esbuild.build({
    ...buildOptions,
    entryPoints: ['src/background/index.ts'],
    outfile: 'public/background.js',
    format: 'iife',
    bundle: true,
    minify: !isWatch,
    sourcemap: isWatch,
    target: 'es2020',
    platform: 'browser',
    define: {
      'process.env.NODE_ENV': isWatch ? '"development"' : '"production"',
    },
  });
  console.log('✓ Built background.js');
}

// Build popup React app
async function buildPopup() {
  await esbuild.build({
    ...buildOptions,
    entryPoints: ['src/popup/index.tsx'],
    outfile: 'public/popup.js',
    format: 'iife',
    bundle: true,
    minify: !isWatch,
    sourcemap: isWatch,
    target: 'es2020',
    platform: 'browser',
    jsx: 'transform',
    loader: {
      '.tsx': 'tsx',
      '.ts': 'ts',
    },
    define: {
      'process.env.NODE_ENV': isWatch ? '"development"' : '"production"',
    },
  });
  console.log('✓ Built popup.js');
}

// Copy static files
function copyStaticFiles() {
  // Copy manifest.json
  copyFileSync('manifest.json', 'public/manifest.json');
  console.log('✓ Copied manifest.json');
  
  // Copy popup.html
  copyFileSync('src/popup.html', 'public/popup.html');
  console.log('✓ Copied popup.html');
}

async function build() {
  try {
    console.log('Building extension...\n');
    await Promise.all([buildBackground(), buildPopup()]);
    copyStaticFiles();
    console.log('\n✓ Build complete!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

if (isWatch) {
  console.log('Watching for changes...\n');
  
  // Initial build
  copyStaticFiles();
  
  // Watch background
  const bgCtx = await esbuild.context({
    ...buildOptions,
    entryPoints: ['src/background/index.ts'],
    outfile: 'public/background.js',
    format: 'iife',
    define: {
      'process.env.NODE_ENV': '"development"',
    },
  });
  
  // Watch popup
  const popupCtx = await esbuild.context({
    ...buildOptions,
    entryPoints: ['src/popup/index.tsx'],
    outfile: 'public/popup.js',
    format: 'iife',
    jsx: 'transform',
    define: {
      'process.env.NODE_ENV': '"development"',
    },
  });
  
  await Promise.all([
    bgCtx.watch(),
    popupCtx.watch(),
  ]);
  
  console.log('Watching for changes... (Note: rebuild manually if you change manifest.json or popup.html)');
} else {
  build();
}

