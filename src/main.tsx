import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

async function startSidecarServer() {
  try {
    // Lazy import to avoid SSR issues
    const { Command } = await import('@tauri-apps/plugin-shell');
    const { resourceDir, appDataDir } = await import('@tauri-apps/api/path');
    const resDir = await resourceDir();
    const dataDir = await appDataDir();
    const serverDir = `${resDir}server`;
    const cmd = Command.sidecar('bin/node', ['server.js'], {
      cwd: serverDir,
      env: {
        ECOLAV_DATA_DIR: dataDir,
      },
    });
    // Não aguardar término; apenas spawn
    cmd.spawn();
  } catch (e) {
    console.error('Falha ao iniciar servidor sidecar:', e);
  }
}

function Bootstrap() {
  useEffect(() => {
    startSidecarServer();
  }, []);
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Bootstrap />
  </React.StrictMode>,
)
