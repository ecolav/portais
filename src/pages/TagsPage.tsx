import { useRFIDReader } from '../hooks/useRFIDReader';
import PageHeader from '../components/PageHeader';
import { Tag, Package } from 'lucide-react';

export default function TagsPage() {
  const { readings } = useRFIDReader();
  
  // Agrupar por TID/EPC único
  const uniqueTagsMap = new Map();
  readings.forEach(reading => {
    const key = reading.tid || reading.epc;
    if (!uniqueTagsMap.has(key)) {
      uniqueTagsMap.set(key, {
        tid: reading.tid,
        epc: reading.epc,
        count: 1,
        firstSeen: reading.timestamp,
        lastSeen: reading.timestamp
      });
    } else {
      const tag = uniqueTagsMap.get(key);
      tag.count++;
      tag.lastSeen = reading.timestamp;
    }
  });

  const uniqueTags = Array.from(uniqueTagsMap.values());

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Tags Únicas"
        subtitle={`${uniqueTags.length} tags diferentes detectadas`}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Tags Únicas</span>
            <Tag className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{uniqueTags.length}</p>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total de Leituras</span>
            <Package className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{readings.length}</p>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Média por Tag</span>
            <Package className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {uniqueTags.length > 0 ? (readings.length / uniqueTags.length).toFixed(1) : '0'}
          </p>
        </div>
      </div>

      {/* Tags List */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lista de Tags</h3>
        
        {uniqueTags.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Tag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Nenhuma tag detectada ainda</p>
            <p className="text-sm">Inicie a leitura RFID para ver as tags</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {uniqueTags.map((tag, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg border hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold text-gray-900">
                      {tag.tid || tag.epc}
                    </p>
                    {tag.tid && tag.epc && (
                      <p className="font-mono text-xs text-gray-500 mt-1">EPC: {tag.epc}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {tag.count} {tag.count === 1 ? 'leitura' : 'leituras'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Primeira: {tag.firstSeen}
                    </div>
                    <div className="text-xs text-gray-500">
                      Última: {tag.lastSeen}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

