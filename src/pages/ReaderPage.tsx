import { useRFIDReader } from '../hooks/useRFIDReader';
import ReaderConfigPanel from '../components/panels/ReaderConfigPanel';
import ControlPanel from '../components/panels/ControlPanel';
import PageHeader from '../components/PageHeader';

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
    </div>
  );
}

