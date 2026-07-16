import type { Configuration } from 'electron-builder';

const config: Configuration = {
  appId: 'com.cramengine.desktop',
  productName: 'Cram Engine Desktop',
  directories: {
    output: 'release'
  },
  files: ['dist/**', 'dist-electron/**'],
  extraResources: [
    {
      from: 'build/miktex-bootstrap.ps1',
      to: 'miktex-bootstrap.ps1'
    }
  ],
  asar: true,
  win: {
    target: ['nsis']
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowElevation: true,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Cram Engine',
    include: 'build/installer.nsh'
  },
  publish: null
};

export default config;
