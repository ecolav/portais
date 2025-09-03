import React from 'react';
import { useRFIDReader } from '../hooks/useRFIDReader';
import ReaderConfigPanel from './panels/ReaderConfigPanel';
import ControlPanel from './panels/ControlPanel';
import RFIDReadingsPanel from './panels/RFIDReadingsPanel';
import StatsPanel from './panels/StatsPanel';
import ExcelUploadPanel from './panels/ExcelUploadPanel';
import AudioConfigPanel from './panels/AudioConfigPanel';
import CameraConfigPanel from './panels/CameraConfigPanel';
import NotificationMethodPanel from './panels/NotificationMethodPanel';

export default function Dashboard() {
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
            Portal RFID - Sistema Atualizado
          </h1>
          <p className="text-gray-600">
            Leitor Chainway com protocolo A5 5A - IP: {config.ip}:{config.port}
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

        {/* Grid Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Esquerda - Configuração e Controle */}
          <div className="space-y-6">
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

          {/* Coluna Central - Leituras e Estatísticas */}
          <div className="space-y-6">
            <RFIDReadingsPanel 
              readings={readings} 
              onClearReadings={clearReadings} 
            />
            <StatsPanel 
              totalReadings={status.totalReadings}
              uniqueEPCs={status.uniqueEPCs || 0}
              isConnected={status.isConnected}
              isReading={status.isReading}
              readings={readings}
            />
          </div>

          {/* Coluna Direita - Configurações Adicionais */}
          <div className="space-y-6">
            <ExcelUploadPanel />
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
              <span>Tags: {new Set(readings.map(r => r.epc)).size} únicas</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
