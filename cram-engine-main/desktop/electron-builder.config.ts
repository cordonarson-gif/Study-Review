import type { Configuration } from 'electron-builder';

const config: Configuration = {
  appId: 'com.cramengine.desktop',
  productName: 'Cram Engine Desktop',
  directories: {
    output: 'release-staging'
  },
  files: [
    'dist/**',
    'dist-electron/**/*.cjs',
    '!**/*.test.*',
    '!**/test/**',
    '!**/tests/**',
    '!**/__tests__/**',
    '!**/fixtures/**',
    '!**/mocks/**',
    '!**/*.log',
    '!**/*.map',
    '!**/*.d.ts',
    '!**/*.d.cts',
    '!**/.env*',
    '!**/*.{pem,pfx,p12,key,crt}'
  ],
  extraResources: [
    {
      from: 'build/miktex-bootstrap.ps1',
      to: 'miktex-bootstrap.ps1'
    }
  ],
  electronDownload: {
    checksums: {
      'electron-v36.9.5-win32-x64.zip': 'fb8b47aff266bb2483aabf1c6442d519e27c68b4bf432b8e84fd6823e2515e3c'
    }
  },
  asar: true,
  win: {
    target: ['nsis'],
    artifactName: 'Cram-Engine-Desktop-Setup-1.2.0-x64.${ext}'
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
