interface StatsPanelProps {
  totalReadings: number;
  uniqueTags: number;
  isConnected: boolean;
  isReading: boolean;
  readings: any[];
}

export default function StatsPanel({ totalReadings, uniqueTags }: StatsPanelProps) {
  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas</h2>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded">
          <div className="text-3xl font-bold text-blue-600">{uniqueTags}</div>
          <div className="text-sm text-gray-600 mt-1">TIDs Únicos</div>
        </div>
        
        <div className="text-center p-4 bg-gray-50 rounded">
          <div className="text-3xl font-bold text-green-600">{totalReadings}</div>
          <div className="text-sm text-gray-600 mt-1">Total Leituras</div>
        </div>
        
        <div className="text-center p-4 bg-gray-50 rounded">
          <div className="text-3xl font-bold text-purple-600">
            {uniqueTags > 0 ? (totalReadings / uniqueTags).toFixed(1) : '0'}
          </div>
          <div className="text-sm text-gray-600 mt-1">Média/TID</div>
        </div>
      </div>
    </div>
  );
}
