import { useState } from 'react';
import { useRFIDReader } from '../hooks/useRFIDReader';
import ReaderConfigPanel from '../components/panels/ReaderConfigPanel';
import ControlPanel from '../components/panels/ControlPanel';
import PowerDiagnosticsPanel from '../components/panels/PowerDiagnosticsPanel';
import PageHeader from '../components/PageHeader';
import { API_CONFIG, apiRequest } from '../config/api';

export default function ReaderPage() {
  const {
    config,
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

  const [isApplyingPower, setIsApplyingPower] = useState(false);

  const handlePowerChange = (power: number) => {
    updateConfig({ power });
  };

  const handleApplyPower = async (power: number) => {
    setIsApplyingPower(true);
    try {
      await apiRequest(API_CONFIG.ENDPOINTS.POWER, {
        method: 'POST',
        body: JSON.stringify({ power }),
      });
      updateConfig({ power });
    } catch (err) {
      console.error('Erro ao aplicar potência:', err);
    } finally {
      setIsApplyingPower(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Leitor RFID"
        subtitle="Configure e controle o leitor RFID Chainway"
      />

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex justify-between items-center">
            <span className="text-red-800 font-medium">{error}</span>
            <button onClick={clearError} className="text-red-500 hover:text-red-700 font-bold">✕</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReaderConfigPanel config={config} onConfigChange={updateConfig} />
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

      {/* Painel de Diagnóstico de Potência */}
      <PowerDiagnosticsPanel 
        currentPower={config.power} 
        onPowerChange={handlePowerChange}
        onApplyPower={handleApplyPower}
        isApplying={isApplyingPower}
      />
    </div>
  );
}

