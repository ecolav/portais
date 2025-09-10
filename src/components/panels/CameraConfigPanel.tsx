import { useState, useEffect, useRef } from 'react';
import { Camera, Monitor } from 'lucide-react';

export default function CameraConfigPanel() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [resolution, setResolution] = useState<string>('1280x720');
  const [quality, setQuality] = useState<number>(80);
  const [isStreaming, setIsStreaming] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Verificar se o navegador suporta MediaDevices
  const isMediaDevicesSupported = () => {
    return !!(navigator && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices);
  };

  // Função para buscar dispositivos de câmera
  const getDevices = async () => {
    if (!isMediaDevicesSupported()) {
      console.warn('MediaDevices não é suportado neste navegador');
      return;
    }

    try {
      // Solicitar permissão de câmera primeiro
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      
      if (videoDevices.length > 0 && !selectedDevice) {
        setSelectedDevice(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Erro ao buscar dispositivos de câmera:', error);
    }
  };

  // Função para iniciar stream de vídeo
  const startStream = async () => {
    if (!selectedDevice || !videoRef.current) return;

    try {
      const [width, height] = resolution.split('x').map(Number);
      
      const constraints = {
        video: {
          deviceId: selectedDevice,
          width: { ideal: width },
          height: { ideal: height }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      setIsStreaming(true);
    } catch (error) {
      console.error('Erro ao iniciar stream:', error);
    }
  };

  // Função para parar stream
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreaming(false);
  };

  // Carregar dispositivos quando o componente montar
  useEffect(() => {
    if (isMediaDevicesSupported()) {
      getDevices();
    }
  }, []);

  // Limpar stream quando o componente desmontar
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  // Resoluções disponíveis
  const resolutions = [
    '640x480',
    '1280x720',
    '1920x1080',
    '2560x1440',
    '3840x2160'
  ];

  if (!isMediaDevicesSupported()) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <Camera className="w-6 h-6 text-red-600" />
          <h2 className="text-xl font-semibold text-gray-800">Configuração de Câmera</h2>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-sm font-medium text-yellow-800">Navegador não suportado</span>
          </div>
          <p className="text-sm text-yellow-700 mt-2">
            Seu navegador não suporta acesso à câmera. Tente usar um navegador mais recente 
            ou verifique se as permissões estão habilitadas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <Camera className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">Configuração de Câmera</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configurações */}
        <div className="space-y-6">
          {/* Seleção de Dispositivo */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Dispositivo de Câmera
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {devices.length === 0 ? (
                <option value="">Carregando dispositivos...</option>
              ) : (
                devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Câmera ${device.deviceId.slice(0, 8)}...`}
                  </option>
                ))
              )}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {devices.length} dispositivo(s) encontrado(s)
            </p>
          </div>

          {/* Resolução */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Resolução
            </label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {resolutions.map((res) => (
                <option key={res} value={res}>{res}</option>
              ))}
            </select>
          </div>

          {/* Qualidade */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Qualidade da Imagem
            </label>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Baixa</span>
                <span>{quality}%</span>
                <span>Alta</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>

          {/* Controles */}
          <div className="flex gap-3">
            {!isStreaming ? (
              <button
                onClick={startStream}
                disabled={!selectedDevice}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Camera className="w-4 h-4" />
                Iniciar Câmera
              </button>
            ) : (
              <button
                onClick={stopStream}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Camera className="w-4 h-4" />
                Parar Câmera
              </button>
            )}
          </div>
        </div>

        {/* Preview da Câmera */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-gray-500" />
            <h3 className="font-medium text-gray-700">Preview</h3>
          </div>
          
          <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video">
            {isStreaming ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Clique em "Iniciar Câmera" para ver o preview</p>
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className={isStreaming ? 'text-green-600' : 'text-gray-500'}>
              {isStreaming ? 'Câmera ativa' : 'Câmera inativa'}
            </span>
          </div>
        </div>
      </div>

      {/* Informações */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-sm font-medium text-blue-800">Configuração de Câmera</span>
        </div>
        <p className="text-sm text-blue-700">
          Configure a câmera para captura de imagens. Selecione o dispositivo, 
          ajuste a resolução e qualidade conforme necessário.
        </p>
      </div>
    </div>
  );
}
