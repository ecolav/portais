import { useRFIDReader } from '../hooks/useRFIDReader';
import ReaderConfigPanel from '../components/panels/ReaderConfigPanel';
import ControlPanel from '../components/panels/ControlPanel';
import StatsPanel from '../components/panels/StatsPanel';
import AudioConfigPanel from '../components/panels/AudioConfigPanel';
import CameraConfigPanel from '../components/panels/CameraConfigPanel';
import NotificationMethodPanel from '../components/panels/NotificationMethodPanel';

export default function DashboardPage() {
  const {
    config,
    readings,
    status,
    error,
    connectToReader,
    disconnectFromReader,
    startContinuousReading,
    stopContinuousReading,
    readSingleTag,
    clearReadings,
    updateConfig,
    clearError
  } = useRFIDReader();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Dashboard - Controle do Sistema
          </h1>
          <p className="text-gray-600">
            Configure, controle e monitore o sistema RFID
          </p>
        </div>

        {/* Painel de Erros */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-red-800 font-medium">Erro do Sistema</span>
              </div>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
            <p className="text-red-700 mt-2">{error}</p>
          </div>
        )}

        {/* Seção 1: Configuração e Controle do Leitor */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">📡 Leitor RFID</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReaderConfigPanel 
              config={config} 
              onConfigChange={updateConfig} 
            />
            <ControlPanel
              status={status}
              onConnect={connectToReader}
              onDisconnect={disconnectFromReader}
              onStartReading={startContinuousReading}
              onStopReading={stopContinuousReading}
              onReadSingle={readSingleTag}
              onClearReadings={clearReadings}
            />
          </div>
        </div>

        {/* Seção 2: Estatísticas e Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">📊 Estatísticas do Sistema</h2>
          <StatsPanel 
            totalReadings={status.totalReadings}
            uniqueTIDs={status.uniqueTIDs || 0}
            isConnected={status.isConnected}
            isReading={status.isReading}
            readings={readings}
          />
        </div>

        {/* Seção 3: Configurações do Sistema */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">⚙️ Configurações do Sistema</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AudioConfigPanel 
              soundEnabled={config.soundEnabled}
              onSoundToggle={(enabled) => updateConfig({ soundEnabled: enabled })}
            />
            <CameraConfigPanel />
            <NotificationMethodPanel />
          </div>
        </div>

        {/* Status do Sistema */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${status.isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span>Leitor: {status.isConnected ? 'Conectado' : 'Desconectado'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${status.isReading ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
              <span>Leitura: {status.isReading ? 'Ativa' : 'Parada'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Total: {status.totalReadings} leituras</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span>TIDs: {new Set(readings.map(r => r.tid || r.epc)).size} únicos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
