import { useRFIDReader } from '../hooks/useRFIDReader';
import RFIDReadingsPanel from '../components/panels/RFIDReadingsPanel';
import PageHeader from '../components/PageHeader';

export default function ReadingsPage() {
  const { readings, status, clearReadings } = useRFIDReader();

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Leituras RFID"
        subtitle={`${status.totalReadings} leituras realizadas`}
      />

      <RFIDReadingsPanel readings={readings} onClearReadings={clearReadings} />
    </div>
  );
}

