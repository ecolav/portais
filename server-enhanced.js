const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Usar a biblioteca melhorada
const { chainwayApi } = require('./chainway-enhanced/dist/index.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configuração CORS
app.use(cors());
app.use(express.json());

// Configuração do Multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos Excel são permitidos (.xlsx, .xls)'), false);
    }
  }
});

// Configuração padrão do leitor RFID
let rfidConfig = {
  ip: '192.168.99.201',
  port: 8888,
  power: 20,
  antennas: [1, 2, 3, 4],
  soundEnabled: true,
  matchSoundEnabled: true
};

const PORT = 3001;

// Variáveis globais para controle
let isConnected = false;
let isReading = false;
let totalReadings = 0;
let uniqueTIDs = new Set();
let readings = [];

// Sistema de armazenamento de planilhas Excel
let excelData = [];
let excelIndexByUHF = new Map();
let excelUhfColumnName = null;
let excelMetadata = {
  fileName: '',
  uploadDate: null,
  totalItems: 0,
  columns: []
};

// Sistema para evitar notificações duplicadas
let notifiedMatches = new Map(); // Usar Map com timestamp para cooldown
const NOTIFICATION_COOLDOWN = 30000; // 30 segundos

// Sistema de proteção contra loops
let comparisonCount = 0;
let lastComparisonReset = Date.now();
const MAX_COMPARISONS_PER_SECOND = 100;

console.log('🚀 Servidor RFID Enhanced rodando na porta', PORT);
console.log('📡 Configuração padrão:', `${rfidConfig.ip}:${rfidConfig.port}`);

// Conectar ao leitor RFID usando a biblioteca melhorada
async function connectToRFIDReader() {
  try {
    console.log(`🔌 Conectando ao leitor RFID: ${rfidConfig.ip}:${rfidConfig.port}`);
    
    await chainwayApi.connect(rfidConfig.ip, rfidConfig.port, {
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 2000,
      keepAlive: true,
      keepAliveInterval: 30000
    });

    isConnected = true;

    // Configurar eventos da biblioteca melhorada
    chainwayApi.on('connected', (data) => {
      console.log('✅ Conectado ao leitor RFID:', data);
      isConnected = true;
      io.emit('connection-status', { 
        isConnected: true,
        isReading: isReading,
        totalReadings: totalReadings,
        uniqueTIDs: uniqueTIDs.size,
        config: rfidConfig
      });
    });

    chainwayApi.on('disconnected', (data) => {
      console.log('🔌 Desconectado do leitor RFID:', data);
      isConnected = false;
      isReading = false;
      io.emit('connection-status', { 
        isConnected: false,
        isReading: false,
        totalReadings: totalReadings,
        uniqueTIDs: uniqueTIDs.size,
        config: rfidConfig
      });
    });

    chainwayApi.on('error', (error) => {
      console.error('❌ Erro na biblioteca RFID:', error);
      isConnected = false;
      isReading = false;
    });

    chainwayApi.on('scanStarted', () => {
      console.log('🟢 Leitura iniciada');
      isReading = true;
      io.emit('reading-status', { isReading: true });
    });

    chainwayApi.on('scanStopped', () => {
      console.log('🛑 Leitura parada');
      isReading = false;
      io.emit('reading-status', { isReading: false });
    });

    chainwayApi.on('keepAlive', (data) => {
      console.log('💓 Keep-alive check:', data);
    });

    // Configurar callback de dados RFID
    chainwayApi.received((data) => {
      try {
        const epcValue = (data && data.epc) ? String(data.epc).toUpperCase() : '';
        const tidValue = (data && data.tid) ? String(data.tid).toUpperCase() : '';
        
        if (tidValue) {
          uniqueTIDs.add(tidValue);
        }

        const reading = {
          id: Date.now(),
          epc: epcValue,
          tid: tidValue,
          rssi: typeof data.rssi === 'string' ? parseInt(data.rssi, 16) : 0,
          antenna: typeof data.ant === 'number' ? data.ant : 0,
          timestamp: new Date().toISOString(),
          rawData: ''
        };

        readings.push(reading);
        totalReadings++;
        
        // Manter apenas últimas 100 leituras
        if (readings.length > 100) {
          readings = readings.slice(-100);
        }

        // Verificar correspondência com Excel
        let matchedItem = null;
        if (tidValue && excelIndexByUHF.size > 0) {
          const now = Date.now();
          if (now - lastComparisonReset > 1000) {
            comparisonCount = 0;
            lastComparisonReset = now;
          }
          
          if (comparisonCount < MAX_COMPARISONS_PER_SECOND) {
            comparisonCount++;
            const tidClean = tidValue.toUpperCase().trim();
            const candidates = excelIndexByUHF.get(tidClean);
            if (candidates && candidates.length > 0) {
              matchedItem = candidates[0];
              console.log(`🔍 CORRESPONDÊNCIA ENCONTRADA: "${tidClean}"`);
            }
          }
        }

        // Processar correspondência
        if (matchedItem) {
          const uhfColumn = Object.keys(matchedItem).find(key => 
            key.toLowerCase().includes('uhf') || 
            key.toLowerCase() === 'uhf'
          );
          const itemUHF = uhfColumn ? String(matchedItem[uhfColumn]).toUpperCase().trim() : '';
          const matchKey = `${tidValue.toUpperCase().trim()}_${itemUHF}`;
          
          const now = Date.now();
          const lastNotification = notifiedMatches.get(matchKey);
          
          if (!lastNotification || (now - lastNotification) > NOTIFICATION_COOLDOWN) {
            console.log(`🎯 CORRESPONDÊNCIA ENCONTRADA!`);
            console.log(`  📋 TID: ${tidValue}`);
            console.log(`  📦 Item: ${JSON.stringify(matchedItem)}`);
            console.log(`  📡 Antena: ${reading.antenna}`);
            
            notifiedMatches.set(matchKey, now);
            
            const matchData = {
              reading: reading,
              item: matchedItem,
              timestamp: new Date().toISOString()
            };
            
            io.emit('rfid-match-found', matchData);
            
            // Limpar notificações antigas
            if (notifiedMatches.size > 1000) {
              const cutoff = now - NOTIFICATION_COOLDOWN;
              for (const [key, timestamp] of notifiedMatches.entries()) {
                if (timestamp < cutoff) {
                  notifiedMatches.delete(key);
                }
              }
            }
          }
        }

        io.emit('rfid-reading', reading);
        io.emit('readings-update', { readings, totalReadings, uniqueTIDs: uniqueTIDs.size });
        
        console.log(`📡 Tag recebida: TID=${tidValue}, EPC=${epcValue}, Antena=${reading.antenna}, RSSI=${reading.rssi}`);
      } catch (error) {
        console.error('❌ Erro ao processar dados RFID:', error.message);
      }
    });

    console.log(`✅ Conectado ao leitor RFID em ${rfidConfig.ip}:${rfidConfig.port}!`);
    console.log('ℹ️ Leitor conectado. Use "Iniciar Leitura" para começar a ler tags.');
    
  } catch (error) {
    console.error(`❌ Erro na conexão RFID (${rfidConfig.ip}:${rfidConfig.port}):`, error.message || error);
    isConnected = false;
    throw error;
  }
}

// Iniciar leitura contínua
async function startContinuousReading() {
  if (!isConnected) {
    console.log('⚠️ Não há conexão com o leitor');
    return;
  }
  if (isReading) {
    console.log('⚠️ Já está lendo');
    return;
  }
  try {
    console.log(`🟢 Iniciando leitura contínua em ${rfidConfig.ip}:${rfidConfig.port}...`);
    await chainwayApi.startScan();
    console.log('✅ Leitura contínua iniciada');
  } catch (error) {
    console.error('❌ Erro ao iniciar leitura:', error.message || error);
  }
}

// Parar leitura contínua
async function stopContinuousReading() {
  if (!isReading) {
    console.log('⚠️ Não está lendo');
    return;
  }
  try {
    console.log('🛑 Parando leitura contínua...');
    await chainwayApi.stopScan();
    console.log('✅ Leitura contínua parada');
  } catch (error) {
    console.error('❌ Erro ao parar leitura:', error.message || error);
  }
}

// Desconectar do leitor
async function disconnectFromRFIDReader() {
  if (!isConnected) return;
  try {
    console.log(`🔌 Desconectando do leitor RFID (${rfidConfig.ip}:${rfidConfig.port})...`);
    await chainwayApi.disconnect();
    isReading = false;
    isConnected = false;
    console.log('✅ Desconectado do leitor RFID');
  } catch (error) {
    console.error('❌ Erro ao desconectar:', error.message || error);
    isReading = false;
    isConnected = false;
  }
}

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);
  
  // Enviar status atual
  socket.emit('connection-status', { 
    isConnected: isConnected,
    isReading: isReading,
    totalReadings: totalReadings,
    uniqueTIDs: uniqueTIDs.size,
    config: rfidConfig
  });

  socket.on('connect-reader', async () => {
    try {
      await connectToRFIDReader();
    } catch (error) {
      socket.emit('error', { message: 'Erro ao conectar: ' + error.message });
    }
  });

  socket.on('disconnect-reader', () => {
    disconnectFromRFIDReader();
  });

  socket.on('start-reading', () => {
    startContinuousReading();
  });

  socket.on('stop-reading', () => {
    stopContinuousReading();
  });

  socket.on('clear-readings', () => {
    try {
      console.log('🧹 Limpando histórico de leituras...');
      readings = [];
      totalReadings = 0;
      uniqueTIDs.clear();
      io.emit('readings-update', { readings, totalReadings, uniqueTIDs: uniqueTIDs.size });
      console.log('✅ Histórico limpo com sucesso');
    } catch (error) {
      console.error('❌ Erro ao limpar histórico:', error.message);
      socket.emit('error', { message: 'Erro ao limpar histórico: ' + error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// REST API endpoints
app.get('/api/status', (req, res) => {
  const status = chainwayApi.getConnectionStatus();
  res.json({
    isConnected: status.isConnected,
    isReading: status.isScanning,
    totalReadings: totalReadings,
    uniqueTIDs: uniqueTIDs.size,
    readings: readings.slice(-10),
    config: rfidConfig,
    excel: {
      hasData: excelData.length > 0,
      totalItems: excelData.length,
      metadata: excelMetadata
    }
  });
});

app.get('/api/config', (req, res) => {
  res.json(rfidConfig);
});

app.post('/api/config', async (req, res) => {
  try {
    const newConfig = req.body;
    
    // Validar configuração
    if (newConfig.ip && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(newConfig.ip)) {
      return res.status(400).json({ success: false, message: 'IP inválido' });
    }
    
    if (newConfig.port && (newConfig.port < 1 || newConfig.port > 65535)) {
      return res.status(400).json({ success: false, message: 'Porta inválida' });
    }
    
    if (newConfig.power !== undefined) {
      if (newConfig.power < 0 || newConfig.power > 30) {
        return res.status(400).json({ success: false, message: 'Potência deve estar entre 0 e 30 dBm' });
      }
    }
    
    if (newConfig.antennas && Array.isArray(newConfig.antennas)) {
      for (const antenna of newConfig.antennas) {
        if (typeof antenna !== 'number' || antenna < 1 || antenna > 4) {
          return res.status(400).json({ success: false, message: 'Antenas devem ser números de 1 a 4' });
        }
      }
    }
    
    // Atualizar configuração
    const oldConfig = { ...rfidConfig };
    rfidConfig = { ...rfidConfig, ...newConfig };
    
    console.log('⚙️ Configuração atualizada:', rfidConfig);
    
    // Se estiver conectado, aplicar nova configuração
    if (isConnected) {
      try {
        await chainwayApi.setPower(rfidConfig.power);
        await chainwayApi.setAntennas(rfidConfig.antennas);
        console.log('✅ Configurações aplicadas ao leitor');
      } catch (error) {
        console.error('❌ Erro ao aplicar configurações:', error.message);
      }
    }
    
    res.json({ success: true, message: 'Configuração atualizada', config: rfidConfig });
  } catch (error) {
    console.error('❌ Erro ao atualizar configuração:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/connect', async (req, res) => {
  try {
    await connectToRFIDReader();
    res.json({ success: true, message: 'Conectado ao leitor RFID' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/disconnect', (req, res) => {
  disconnectFromRFIDReader();
  res.json({ success: true, message: 'Desconectado do leitor RFID' });
});

app.post('/api/start-reading', (req, res) => {
  startContinuousReading();
  res.json({ success: true, message: 'Leitura iniciada' });
});

app.post('/api/stop-reading', async (req, res) => {
  try {
    await stopContinuousReading();
    res.json({ success: true, message: 'Leitura parada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Servir frontend estático
try {
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    console.log('🗂️ Servindo frontend estático de', distPath);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.log('ℹ️ Pasta dist não encontrada; execute "npm run build" para habilitar frontend estático.');
  }
} catch (e) {
  console.log('⚠️ Falha ao configurar frontend estático:', e.message);
}

// Tratamento de encerramento
process.on('SIGINT', async () => {
  console.log('\n🛑 Encerrando servidor...');
  try {
    await disconnectFromRFIDReader();
    server.close(() => {
      console.log('✅ Servidor encerrado');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Erro durante encerramento:', error);
    process.exit(1);
  }
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor Enhanced rodando em http://localhost:${PORT}`);
  console.log(`📡 Configuração inicial: ${rfidConfig.ip}:${rfidConfig.port}`);
  console.log('🔧 Usando biblioteca Enhanced com auto-reconexão e keep-alive');
});
