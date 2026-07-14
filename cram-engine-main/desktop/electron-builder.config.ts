import type { Configuration } from 'electron-builder';

const config: Configuration = {
  appId: 'com.cramengine.desktop',
  productName: 'Cram Engine Desktop',
  directories: {
    output: 'release'
  },
  files: ['dist/**', 'dist-electron/**'],
  asar: true,
  win: {
    target: ['nsis']
  }
};

export default config;
