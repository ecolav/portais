#!/usr/bin/env node

// Servidor RFID usando a lógica que funcionou no teste
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Importar biblioteca oficial Chainway RFID (CommonJS)
const { chainwayApi } = require('chainway-rfid');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configuração CORS
app.use(cors());
app.use(express.json());

// Configuração do leitor RFID
let rfidConfig = {
  ip: '192.168.99.201',
  port: 8888,
  power: 20,
  antennas: [1, 2, 3, 4],
  soundEnabled: true
};

const PORT = 3000;

// Variáveis globais para controle
let isConnected = false;
let isReading = false;
let totalReadings = 0;
let uniqueTIDs = new Set();
let readings = [];

console.log('🚀 Servidor RFID funcionando na porta', PORT);
console.log('📡 Configuração:', `${rfidConfig.ip}:${rfidConfig.port}`);

// Função para conectar ao leitor RFID (igual ao teste que funcionou)
async function connectToRFIDReader() {
  try {
    if (isConnected) {
      console.log('⚠️ Já está conectado ao leitor RFID');
      return true;
    }

    console.log(`🔌 Conectando ao leitor RFID: ${rfidConfig.ip}:${rfidConfig.port}`);
    
    // Usar exatamente a mesma lógica do teste que funcionou
    await chainwayApi.connect(rfidConfig.ip, rfidConfig.port);
    
    isConnected = true;
    console.log(`✅ CONECTADO AO LEITOR UR4!`);
    
    // Configurar callback para receber dados (igual ao teste)
    chainwayApi.received((data) => {
      processRFIDData(data);
    });
    
    return true;
  } catch (error) {
    console.error(`❌ Erro na conexão RFID:`, error.message);
    isConnected = false;
    throw error;
  }
}

// Função para processar dados RFID (igual ao teste que funcionou)
function processRFIDData(data) {
  console.log('📡 TAG DETECTADA:', data);
  
  // Dados já vêm formatados da biblioteca oficial
  const epc = data.epc || 'N/A';
  const tid = data.tid || 'N/A';
  const antennaNumber = data.ant || 0;
  const rssi = data.rssi || 0;
  
  console.log('✅ Dados processados:');
  console.log(`  EPC: ${epc}`);
  console.log(`  TID: ${tid}`);
  console.log(`  Antena: ${antennaNumber}`);
  console.log(`  RSSI: ${rssi} dBm`);

  // Adicionar TID à lista de únicos (cada TID conta apenas 1 vez)
  if (tid !== 'N/A') {
    uniqueTIDs.add(tid);
  }

  // Criar objeto de leitura
  const reading = {
    id: Date.now(),
    epc: epc,
    tid: tid,
    antenna: antennaNumber,
    rssi: rssi,
    timestamp: new Date().toISOString(),
    readerIP: rfidConfig.ip
  };

  // Adicionar à lista de leituras
  readings.push(reading);
  totalReadings++;

  // Manter apenas as últimas 100 leituras
  if (readings.length > 100) {
    readings = readings.slice(-100);
  }

  // Emitir via Socket.IO
  io.emit('rfid-reading', reading);
  io.emit('readings-update', { readings, totalReadings, uniqueTIDs: uniqueTIDs.size });

  console.log(`📊 Total de leituras: ${totalReadings}`);
  console.log(`🎯 TID único detectado: ${tid}`);
  console.log(`🔢 Total de TIDs únicos: ${uniqueTIDs.size}`);
}

// Função para iniciar leitura (igual ao teste que funcionou)
async function startContinuousReading() {
  if (!isConnected) {
    console.log('⚠️ Não há conexão com o leitor RFID');
    return false;
  }

  if (isReading) {
    console.log('⚠️ Já está lendo');
    return true;
  }

  try {
    console.log(`🟢 Iniciando leitura contínua...`);
    
    // Usar exatamente a mesma lógica do teste que funcionou
    await chainwayApi.startScan();
    
    isReading = true;
    console.log('📖 LEITURA INICIADA COM SUCESSO!');
    console.log('🎯 Aguardando tags RFID...');
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao iniciar leitura:', error.message);
    isReading = false;
    return false;
  }
}

// Função para parar leitura (igual ao teste que funcionou)
async function stopContinuousReading() {
  if (!isReading) {
    console.log('⚠️ Não está lendo');
    return true;
  }

  try {
    console.log('🛑 Parando leitura...');
    
    // Usar exatamente a mesma lógica do teste que funcionou
    await chainwayApi.stopScan();
    
    isReading = false;
    console.log('✅ Leitura parada');
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao parar leitura:', error.message);
    return false;
  }
}

// Função para desconectar (igual ao teste que funcionou)
async function disconnectFromRFIDReader() {
  if (!isConnected) {
    console.log('⚠️ Não há conexão com o leitor RFID');
    return true;
  }

  try {
    console.log(`🔌 Desconectando do leitor RFID...`);
    
    // Parar leitura se estiver ativa
    if (isReading) {
      await stopContinuousReading();
    }
    
    // Usar exatamente a mesma lógica do teste que funcionou
    await chainwayApi.disconnect();
    
    isConnected = false;
    console.log('✅ Desconectado do leitor RFID');
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao desconectar:', error.message);
    return false;
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
    config: rfidConfig
  });

  socket.on('connect-reader', async () => {
    try {
      const success = await connectToRFIDReader();
      if (success) {
        socket.emit('connection-status', { 
          isConnected: true,
          isReading: isReading,
          totalReadings: totalReadings,
          config: rfidConfig
        });
      }
    } catch (error) {
      socket.emit('error', { message: 'Erro ao conectar: ' + error.message });
    }
  });

  socket.on('disconnect-reader', async () => {
    await disconnectFromRFIDReader();
    socket.emit('connection-status', { 
      isConnected: false,
      isReading: false,
      totalReadings: totalReadings,
      config: rfidConfig
    });
  });

  socket.on('start-reading', async () => {
    const success = await startContinuousReading();
    socket.emit('reading-status', { isReading: success });
  });

  socket.on('stop-reading', async () => {
    const success = await stopContinuousReading();
    socket.emit('reading-status', { isReading: !success });
  });

  socket.on('clear-readings', () => {
    readings = [];
    totalReadings = 0;
    uniqueTIDs.clear();
    socket.emit('readings-update', { readings, totalReadings, uniqueTIDs: uniqueTIDs.size });
  });

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// REST API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    isConnected: isConnected,
    isReading: isReading,
    totalReadings: totalReadings,
    uniqueTIDs: uniqueTIDs.size,
    readings: readings.slice(-10),
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

app.post('/api/config', (req, res) => {
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
    if (isConnected) 
      console.log('🔄 Reconectando com nova configuração...');
      disconnectFromRFIDReader();
    }
    
    res.json({ success: true, message: 'Configuração atualizada', config: rfidConfig });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/connect', async (req, res) => {
  try {
    const success = await connectToRFIDReader();
    if (success) {
      res.json({ success: true, message: 'Conectado ao leitor RFID' });
    } else {
      res.status(500).json({ success: false, message: 'Falha na conexão' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/disconnect', async (req, res) => {
  const success = await disconnectFromRFIDReader();
  if (success) {
    res.json({ success: true, message: 'Desconectado do leitor RFID' });
  } else {
    res.status(500).json({ success: false, message: 'Falha na desconexão' });
  }
});

app.post('/api/start-reading', async (req, res) => {
  const success = await startContinuousReading();
  if (success) {
    res.json({ success: true, message: 'Leitura iniciada' });
  } else {
    res.status(500).json({ success: false, message: 'Falha ao iniciar leitura' });
  }
});

app.post('/api/stop-reading', async (req, res) => {
  const success = await stopContinuousReading();
  if (success) {
    res.json({ success: true, message: 'Leitura parada' });
  } else {
    res.status(500).json({ success: false, message: 'Falha ao parar leitura' });
  }
});

// Tratamento de encerramento (igual ao teste que funcionou)
process.on('SIGINT', async () => {
  console.log('\n🛑 Encerrando servidor...');
  await stopContinuousReading();
  await disconnectFromRFIDReader();
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📡 Configuração inicial: ${rfidConfig.ip}:${rfidConfig.port}`);
  console.log('💡 Usando a lógica que funcionou no teste!');
});
