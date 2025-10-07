import { useRFIDReader } from '../hooks/useRFIDReader';
import AudioConfigPanel from '../components/panels/AudioConfigPanel';
import CameraConfigPanel from '../components/panels/CameraConfigPanel';
import NotificationMethodPanel from '../components/panels/NotificationMethodPanel';
import PageHeader from '../components/PageHeader';

export default function SettingsPage() {
  const { config, updateConfig } = useRFIDReader();

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Configurações"
        subtitle="Configure o comportamento do sistema"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AudioConfigPanel 
          soundEnabled={config.soundEnabled}
          onSoundToggle={(enabled) => updateConfig({ soundEnabled: enabled })}
        />
        <CameraConfigPanel />
        <NotificationMethodPanel />
      </div>
    </div>
  );
}

