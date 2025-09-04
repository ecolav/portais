const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { chainwayApi } = require('chainway-rfid');

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

// Configuração padrão do leitor RFID (pode ser alterada via formulário)
let rfidConfig = {
  ip: '192.168.99.201', // IP padrão da antena
  port: 8888,
  power: 20,
  antennas: [1, 2, 3, 4],
  soundEnabled: true
};

const PORT = 3001;

// Variáveis globais para controle
let isConnected = false;
let isReading = false;
let totalReadings = 0;
let uniqueTIDs = new Set(); // Contar TIDs únicos
let readings = []; // Array de leituras para histórico
let receiverAttached = false;

// Keep-alive e verificação de conexão para PORTAL (sempre ativo)
const KEEP_ALIVE_INTERVAL = 30000; // 30 segundos - apenas verificação
const MAX_INACTIVITY_TIME = 60000; // 60 segundos - tempo razoável
const CONNECTION_CHECK_INTERVAL = 10000; // 10 segundos - verificação
const MAX_READINGS_HISTORY = 50; // Reduzir histórico para economizar memória
const READING_HEALTH_CHECK_INTERVAL = 20000; // 20 segundos - verificar se está lendo
let keepAliveInterval = null;
let connectionCheckInterval = null;
let readingHealthCheckInterval = null;
let lastActivityTime = null;
let lastReadingTime = null;

console.log('🚀 Servidor RFID rodando na porta', PORT);
console.log('📡 Configuração padrão:', `${rfidConfig.ip}:${rfidConfig.port}`);

// Conectar ao leitor RFID usando a biblioteca chainway-rfid
function connectToRFIDReader() {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`🔌 Tentando conectar ao leitor RFID: ${rfidConfig.ip}:${rfidConfig.port}`);
      await chainwayApi.connect(rfidConfig.ip, rfidConfig.port);
      isConnected = true;

      if (!receiverAttached) {
        chainwayApi.received((data) => {
          // data: { epc, tid, ant, rssi }
          const epcValue = (data && data.epc) ? String(data.epc).toUpperCase() : '';
          const tidValue = (data && data.tid) ? String(data.tid).toUpperCase() : '';
          if (tidValue) {
            uniqueTIDs.add(tidValue);
          }
          
          // Atualizar tempo de atividade quando receber dados
          lastActivityTime = Date.now();
          lastReadingTime = Date.now();

          const reading = {
            id: Date.now(),
            epc: epcValue,
            tid: tidValue,
            rssi: typeof data.rssi === 'number' ? data.rssi : 0,
            antenna: typeof data.ant === 'number' ? data.ant : 0,
            timestamp: new Date().toISOString(),
            rawData: ''
          };

          readings.push(reading);
          totalReadings++;
          if (readings.length > MAX_READINGS_HISTORY) {
            readings = readings.slice(-MAX_READINGS_HISTORY);
          }

          io.emit('rfid-reading', reading);
          io.emit('readings-update', { readings, totalReadings, uniqueTIDs: uniqueTIDs.size });
        });
        receiverAttached = true;
      }

      console.log(`✅ Conectado ao leitor RFID em ${rfidConfig.ip}:${rfidConfig.port}!`);
      
      // Iniciar sistema de keep-alive
      startKeepAlive();
      startConnectionCheck();
      startReadingHealthCheck();
      
      // SEMPRE iniciar leitura automaticamente após conectar
      try {
        await startContinuousReading();
        console.log('🚀 Leitura iniciada automaticamente após conexão');
      } catch (startError) {
        console.log('⚠️ Erro ao iniciar leitura automática:', startError.message);
      }
      
      resolve();
    } catch (error) {
      console.error(`❌ Erro na conexão RFID (${rfidConfig.ip}:${rfidConfig.port}):`, error.message || error);
      isConnected = false;
      reject(error);
    }
  });
}

// Sistema de keep-alive para manter conexão ativa
function startKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  
  keepAliveInterval = setInterval(() => {
    if (isConnected && isReading) {
      try {
        // Keep-alive simples - apenas verificação sem parar leitura
        lastActivityTime = Date.now();
        
        // Log reduzido para economizar memória (a cada 10 verificações)
        if (totalReadings % 10 === 0) {
          console.log('💓 Keep-alive RFID - Portal sempre ativo');
        }
      } catch (error) {
        console.log('⚠️ Erro keep-alive:', error.message);
        // Tentar reconectar se houver erro
        handleConnectionLoss();
      }
    }
  }, KEEP_ALIVE_INTERVAL);
  
  console.log('🔄 Keep-alive simples iniciado (30s) - Portal sempre ativo');
}

// Verificação periódica da conexão
function startConnectionCheck() {
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
  }
  
  connectionCheckInterval = setInterval(async () => {
    if (isConnected) {
      try {
        // Verificar se a conexão ainda está ativa
        const currentTime = Date.now();
        if (lastActivityTime && (currentTime - lastActivityTime) > MAX_INACTIVITY_TIME) {
          console.log('⚠️ Inatividade detectada, verificando conexão...');
          await handleConnectionLoss();
        }
      } catch (error) {
        console.log('⚠️ Erro na verificação de conexão:', error.message);
      }
    }
  }, CONNECTION_CHECK_INTERVAL);
  
  console.log('🔍 Verificação de conexão otimizada iniciada (10s)');
}

// Verificação de saúde da leitura RFID
function startReadingHealthCheck() {
  if (readingHealthCheckInterval) {
    clearInterval(readingHealthCheckInterval);
  }
  
  readingHealthCheckInterval = setInterval(async () => {
    if (isConnected && isReading) {
      try {
        const currentTime = Date.now();
        
        // Verificar se está lendo há muito tempo sem receber dados
        if (lastReadingTime && (currentTime - lastReadingTime) > 45000) { // 45 segundos
          console.log('⚠️ Leitura parou de funcionar - reiniciando scan...');
          
          try {
            // Tentar reiniciar o scan
            await chainwayApi.stopScan();
            await new Promise(resolve => setTimeout(resolve, 500)); // Pausa de 500ms
            await chainwayApi.startScan();
            
            lastReadingTime = Date.now();
            lastActivityTime = Date.now();
            console.log('✅ Scan RFID reiniciado com sucesso');
          } catch (restartError) {
            console.log('❌ Erro ao reiniciar scan:', restartError.message);
            // Se falhar, tentar reconectar completamente
            await handleConnectionLoss();
          }
        }
      } catch (error) {
        console.log('⚠️ Erro no health check de leitura:', error.message);
      }
    }
  }, READING_HEALTH_CHECK_INTERVAL);
  
  console.log('📊 Health check de leitura RFID iniciado (20s)');
}

// Tratar perda de conexão
async function handleConnectionLoss() {
  console.log('🔄 Detectada perda de conexão, tentando reconectar...');
  
  try {
    // Parar intervalos
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
      connectionCheckInterval = null;
    }
    if (readingHealthCheckInterval) {
      clearInterval(readingHealthCheckInterval);
      readingHealthCheckInterval = null;
    }
    
    // Marcar como desconectado
    isConnected = false;
    isReading = false;
    
    // Tentar reconectar
    await connectToRFIDReader();
    
    // Se reconectou com sucesso, SEMPRE iniciar leitura automaticamente
    if (isConnected) {
      console.log('✅ Reconexão bem-sucedida! Iniciando leitura automaticamente...');
      
      // SEMPRE iniciar leitura após reconectar
      try {
        await startContinuousReading();
        console.log('🚀 Leitura iniciada automaticamente após reconexão');
      } catch (startError) {
        console.log('⚠️ Erro ao iniciar leitura automática:', startError.message);
      }
      
      // Emitir status atualizado
      io.emit('connection-status', { 
        isConnected: true,
        isReading: isReading,
        totalReadings: totalReadings,
        uniqueTIDs: uniqueTIDs.size,
        config: rfidConfig
      });
    }
  } catch (error) {
    console.error('❌ Falha na reconexão:', error.message);
    // Emitir status de desconectado
    io.emit('connection-status', { 
      isConnected: false,
      isReading: false,
      totalReadings: totalReadings,
      uniqueTIDs: uniqueTIDs.size,
      config: rfidConfig
    });
  }
}

// Iniciar leitura contínua via chainway-rfid
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
    isReading = true;
    lastActivityTime = Date.now(); // Atualizar tempo de atividade
    lastReadingTime = Date.now(); // Registrar início da leitura
    console.log('✅ Leitura contínua iniciada');
  } catch (error) {
    console.error('❌ Erro ao iniciar leitura:', error.message || error);
  }
}

// Parar leitura contínua via chainway-rfid
async function stopContinuousReading() {
  if (!isReading) {
    console.log('⚠️ Não está lendo');
    return;
  }
  try {
    console.log('🛑 Parando leitura contínua...');
    await chainwayApi.stopScan();
    isReading = false;
    lastActivityTime = Date.now(); // Atualizar tempo de atividade
    lastReadingTime = null; // Limpar tempo de leitura
    console.log('✅ Leitura contínua parada');
  } catch (error) {
    console.error('❌ Erro ao parar leitura:', error.message || error);
  }
}

// Desconectar do leitor via chainway-rfid
async function disconnectFromRFIDReader() {
  if (!isConnected) return;
  try {
    console.log(`🔌 Desconectando do leitor RFID (${rfidConfig.ip}:${rfidConfig.port})...`);
    
    // Parar intervalos de keep-alive
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
      console.log('🔄 Keep-alive parado');
    }
    
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
      connectionCheckInterval = null;
      console.log('🔍 Verificação de conexão parada');
    }
    
    if (readingHealthCheckInterval) {
      clearInterval(readingHealthCheckInterval);
      readingHealthCheckInterval = null;
      console.log('📊 Health check de leitura parado');
    }
    
    // Verificar se os métodos existem antes de chamar
    if (typeof chainwayApi.stopScan === 'function') {
      try {
        await chainwayApi.stopScan();
      } catch (stopError) {
        console.log('⚠️ Erro ao parar scan (não crítico):', stopError.message);
      }
    }
    
    if (typeof chainwayApi.disconnect === 'function') {
      try {
        await chainwayApi.disconnect();
      } catch (disconnectError) {
        console.log('⚠️ Erro ao desconectar (não crítico):', disconnectError.message);
      }
    }
    
    isReading = false;
    isConnected = false;
    lastActivityTime = null;
    console.log('✅ Desconectado do leitor RFID');
  } catch (error) {
    console.error('❌ Erro ao desconectar:', error.message || error);
    // Forçar desconexão mesmo com erro
    isReading = false;
    isConnected = false;
    lastActivityTime = null;
    
    // Limpar intervalos mesmo com erro
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
      connectionCheckInterval = null;
    }
    if (readingHealthCheckInterval) {
      clearInterval(readingHealthCheckInterval);
      readingHealthCheckInterval = null;
    }
  }
}

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);
  
  // Enviar status atual
  socket.emit('connection-status', { 
    isConnected: !!isConnected,
    isReading: isReading,
    totalReadings: totalReadings,
    config: rfidConfig
  });

  socket.on('connect-reader', async () => {
    try {
      await connectToRFIDReader();
      socket.emit('connection-status', { 
        isConnected: true,
        isReading: isReading,
        totalReadings: totalReadings,
        config: rfidConfig
      });
    } catch (error) {
      socket.emit('error', { message: 'Erro ao conectar: ' + error.message });
    }
  });

  socket.on('disconnect-reader', () => {
    disconnectFromRFIDReader();
    socket.emit('connection-status', { 
      isConnected: false,
      isReading: false,
      totalReadings: totalReadings,
      config: rfidConfig
    });
  });

  socket.on('start-reading', () => {
    startContinuousReading();
    socket.emit('reading-status', { isReading: true });
  });

  socket.on('stop-reading', () => {
    stopContinuousReading();
    socket.emit('reading-status', { isReading: false });
  });

  socket.on('clear-readings', () => {
    readings = [];
    totalReadings = 0;
    uniqueTIDs.clear(); // Limpar TIDs únicos
    socket.emit('readings-update', { readings, totalReadings, uniqueTIDs: uniqueTIDs.size });
  });

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// REST API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    isConnected: !!isConnected,
    isReading: isReading,
    totalReadings: totalReadings,
    uniqueTIDs: uniqueTIDs.size, // Adicionar contagem de TIDs únicos
    readings: readings.slice(-10), // Últimas 10 leituras
    config: rfidConfig
  });
});

app.get('/api/readings', (req, res) => {
  res.json({
    readings: readings,
    totalReadings: totalReadings
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
    
    // Atualizar configuração
    rfidConfig = { ...rfidConfig, ...newConfig };
    
    console.log('⚙️ Configuração atualizada:', rfidConfig);
    
    // Se estiver conectado, desconectar para usar nova configuração
    if (isConnected) {
      console.log('🔄 Reconectando com nova configuração...');
      try {
        await disconnectFromRFIDReader();
        
        // SEMPRE reconectar e iniciar leitura automaticamente após trocar IP
        console.log('🔄 Reconectando automaticamente com nova configuração...');
        try {
          await connectToRFIDReader();
          console.log('✅ Reconectado e leitura iniciada automaticamente com novo IP!');
        } catch (reconnectError) {
          console.log('⚠️ Erro na reconexão automática:', reconnectError.message);
        }
      } catch (disconnectError) {
        console.log('⚠️ Erro na desconexão (não crítico):', disconnectError.message);
        // Tentar reconectar mesmo com erro
        try {
          await connectToRFIDReader();
          console.log('✅ Reconectado após erro na desconexão!');
        } catch (reconnectError) {
          console.log('❌ Falha na reconexão:', reconnectError.message);
        }
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
    // A leitura já é iniciada automaticamente na função connectToRFIDReader
    res.json({ success: true, message: 'Conectado e leitura iniciada automaticamente' });
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
    
    // SEMPRE reiniciar leitura automaticamente após parar (para portal)
    if (isConnected) {
      console.log('🔄 Reiniciando leitura automaticamente após parada...');
      try {
        await startContinuousReading();
        console.log('🚀 Leitura reiniciada automaticamente');
        res.json({ success: true, message: 'Leitura parada e reiniciada automaticamente' });
      } catch (restartError) {
        console.log('⚠️ Erro ao reiniciar leitura:', restartError.message);
        res.json({ success: true, message: 'Leitura parada, mas falha ao reiniciar' });
      }
    } else {
      res.json({ success: true, message: 'Leitura parada' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Limpeza periódica de memória
function cleanupMemory() {
  // Limpar arrays antigos
  if (readings.length > MAX_READINGS_HISTORY * 2) {
    readings = readings.slice(-MAX_READINGS_HISTORY);
    console.log('🧹 Memória limpa - histórico reduzido');
  }
  
  // Forçar garbage collection se disponível
  if (global.gc) {
    global.gc();
    console.log('🗑️ Garbage collection executado');
  }
}

// Limpeza a cada 5 minutos
setInterval(cleanupMemory, 300000);

// Tratamento de encerramento
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando servidor...');
  stopContinuousReading();
  disconnectFromRFIDReader();
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📡 Configuração inicial: ${rfidConfig.ip}:${rfidConfig.port}`);
});

