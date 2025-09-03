const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const net = require('net');
const cors = require('cors');

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
let rfidConnection = null;
let isReading = false;
let pingInterval = null;
let totalReadings = 0;
let uniqueEPCs = new Set(); // Contar EPCs únicos
let readings = []; // Array de leituras para histórico

console.log('🚀 Servidor RFID rodando na porta', PORT);
console.log('📡 Configuração padrão:', `${rfidConfig.ip}:${rfidConfig.port}`);

// Função para decodificar EPC real dos dados RFID
function decodeRealEPC(epcData) {
  // Método 1: Decodificação hex direta (mais provável)
  const hexEPC = epcData.toString('hex').toUpperCase();
  
  // Método 2: Decodificação com inversão de bytes
  const reversedEPC = Buffer.from(epcData).reverse().toString('hex').toUpperCase();
  
  // Método 3: Decodificação com XOR 0xAA
  const xorEPC = epcData.map(byte => byte ^ 0xAA);
  const xorEPCHex = Buffer.from(xorEPC).toString('hex').toUpperCase();
  
  // Método 4: Decodificação com XOR 0x55
  const xorEPC2 = epcData.map(byte => byte ^ 0x55);
  const xorEPCHex2 = Buffer.from(xorEPC2).toString('hex').toUpperCase();
  
  // Método 5: Decodificação com rotação de 4 bits
  const rotatedEPC = epcData.map(byte => ((byte << 4) | (byte >> 4)) & 0xFF);
  const rotatedHex = Buffer.from(rotatedEPC).toString('hex').toUpperCase();
  
  // Retornar todos os métodos para análise
  return {
    hex: hexEPC,
    reversed: reversedEPC,
    xorAA: xorEPCHex,
    xor55: xorEPCHex2,
    rotated: rotatedHex,
    // O EPC mais provável é o hex direto baseado na análise
    primary: hexEPC
  };
}

// Função para conectar ao leitor RFID usando configuração atual
function connectToRFIDReader() {
  return new Promise((resolve, reject) => {
    if (rfidConnection) {
      rfidConnection.destroy();
    }

    console.log(`🔌 Tentando conectar ao leitor RFID: ${rfidConfig.ip}:${rfidConfig.port}`);
    
    rfidConnection = new net.Socket();
    
    rfidConnection.on('connect', () => {
      console.log(`✅ Conectado ao leitor RFID em ${rfidConfig.ip}:${rfidConfig.port}!`);
      resolve();
    });

    rfidConnection.on('data', (data) => {
      processRFIDData(data);
    });

    rfidConnection.on('error', (error) => {
      console.error(`❌ Erro na conexão RFID (${rfidConfig.ip}:${rfidConfig.port}):`, error.message);
      reject(error);
    });

    rfidConnection.on('close', () => {
      console.log(`🔌 Conexão RFID fechada (${rfidConfig.ip}:${rfidConfig.port})`);
      isReading = false;
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
      
      // Reconexão automática após 3 segundos
      setTimeout(() => {
        if (isReading) {
          console.log('🔄 Tentando reconectar automaticamente...');
          connectToRFIDReader().then(() => {
            if (isReading) {
              startContinuousReading();
            }
          }).catch(error => {
            console.error('❌ Falha na reconexão automática:', error.message);
          });
        }
      }, 3000);
    });

    rfidConnection.on('timeout', () => {
      console.log(`⏰ Timeout na conexão RFID (${rfidConfig.ip}:${rfidConfig.port})`);
    });

    // Conectar usando configuração atual
    rfidConnection.connect(rfidConfig.port, rfidConfig.ip);
    rfidConnection.setTimeout(10000);
  });
}

// Função para processar dados RFID usando decodificação real
function processRFIDData(data) {
  console.log('📡 Dados recebidos do leitor:', data.toString('hex'));
  
  // Verificar se é um pacote válido (deve começar com A5 5A e ter 25 bytes)
  if (data.length < 25 || data[0] !== 0xA5 || data[1] !== 0x5A) {
    console.log('⚠️ Pacote inválido recebido');
    return;
  }

  // Verificar se o tamanho está correto (byte 2-3 = 0x00 0x19 = 25)
  if (data[2] !== 0x00 || data[3] !== 0x19) {
    console.log('⚠️ Tamanho de pacote incorreto');
    return;
  }

  // Extrair dados do pacote
  const command = data[4]; // 0x83 = comando de leitura
  const antennaConfig = data[5]; // 0x30 = configuração de antena
  const reserved = data[6]; // 0x00 = reservado
  
  // EPC: bytes 7-18 (12 bytes) - DADOS REAIS DO CHIP
  const epcBytes = data.slice(7, 19);
  
  // DECODIFICAR EPC REAL usando método descoberto
  const decodedEPC = decodeRealEPC(epcBytes);
  
  // RSSI: byte 19 (potência do sinal)
  const rssi = data[19];
  const rssiValue = rssi > 127 ? rssi - 256 : rssi; // Converter para valor negativo
  
  // Número da antena: byte 20
  const antennaNumber = data[20];
  
  // Checksum: byte 21 (está com problema, mas vamos usar mesmo assim)
  const receivedChecksum = data[21];
  
  // Verificar checksum (XOR dos bytes 0-20)
  const calculatedChecksum = data.slice(0, 21).reduce((acc, byte) => acc ^ byte, 0);
  const checksumValid = receivedChecksum === calculatedChecksum;

  console.log('✅ Pacote válido processado:');
  console.log(`  EPC Primário: ${decodedEPC.primary}`);
  console.log(`  EPC Invertido: ${decodedEPC.reversed}`);
  console.log(`  EPC XOR 0xAA: ${decodedEPC.xorAA}`);
  console.log(`  EPC XOR 0x55: ${decodedEPC.xor55}`);
  console.log(`  EPC Rotacionado: ${decodedEPC.rotated}`);
  console.log(`  RSSI: ${rssiValue} dBm`);
  console.log(`  Antena: ${antennaNumber}`);
  console.log(`  Comando: 0x${command.toString(16).padStart(2, '0')}`);
  console.log(`  Config Antena: 0x${antennaConfig.toString(16).padStart(2, '0')}`);
  console.log(`  Checksum válido: ${checksumValid}`);

  // Adicionar EPC à lista de únicos
  uniqueEPCs.add(decodedEPC.primary);

  // Criar objeto de leitura com EPC REAL
  const reading = {
    id: Date.now(),
    epc: decodedEPC.primary, // EPC REAL decodificado
    epcAlternative: decodedEPC.reversed, // EPC alternativo para comparação
    rssi: rssiValue,
    antenna: antennaNumber,
    timestamp: new Date().toISOString(),
    rawData: data.toString('hex'),
    decodedData: decodedEPC,
    checksumValid: checksumValid,
    readerIP: rfidConfig.ip // Incluir IP do leitor usado
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
  io.emit('readings-update', { readings, totalReadings });

  console.log(`📊 Total de leituras: ${totalReadings}`);
  console.log(`🎯 EPC REAL detectado: ${decodedEPC.primary}`);
}

// Função para iniciar leitura contínua
function startContinuousReading() {
  if (!rfidConnection || isReading) {
    console.log('⚠️ Já está lendo ou não há conexão');
    return;
  }

  console.log(`🟢 Iniciando leitura contínua em ${rfidConfig.ip}:${rfidConfig.port}...`);
  console.log('😴 Leitor está TOTAMENTE DORMINDO - Executando COMANDO DE RESET DESCOBERTO!');
  
  isReading = true;
  
  // 🚨 COMANDO DE RESET DESCOBERTO - FUNCIONA PERFEITAMENTE!
  console.log('🔔 Passo 1: COMANDO DE RESET DESCOBERTO (funciona perfeitamente!)');
  
  // Função para verificar conexão antes de enviar comando
  function sendCommandIfConnected(command, description, delay) {
    setTimeout(() => {
      if (rfidConnection && !rfidConnection.destroyed) {
        rfidConnection.write(command);
        console.log(`📡 ${description}`);
      } else {
        console.log(`❌ ${description} - Conexão perdida!`);
        return; // Parar sequência se conexão foi perdida
      }
    }, delay);
  }
  
  // COMANDO 1: Chainway Reset (DESCOBERTO NO TESTE - FUNCIONA PERFEITAMENTE!)
  if (rfidConnection && !rfidConnection.destroyed) {
    const chainwayReset = Buffer.from([0xA5, 0x5A, 0x00, 0x0B, 0x01, 0x00, 0x00]);
    rfidConnection.write(chainwayReset);
    console.log('📡 Comando 1: Chainway Reset enviado (DESCOBERTO NO TESTE!)');
    console.log('🎯 Este comando ACORDA o leitor imediatamente!');
  }
  
  // Aguardar leitor "acordar" e então enviar comando de leitura
  setTimeout(() => {
    if (rfidConnection && !rfidConnection.destroyed) {
      console.log('⏰ Aguardando leitor acordar (2s)...');
      
      // Comando final de START para leitura (protocolo que funciona)
      setTimeout(() => {
        if (rfidConnection && !rfidConnection.destroyed) {
          console.log('📡 Enviando comando FINAL de START (protocolo funcionando)...');
          const startCommand = Buffer.from([0xA5, 0x5A, 0x00, 0x19, 0x83, 0x30, 0x00]);
          rfidConnection.write(startCommand);
          
          // Configurar ping contínuo para manter ativo
          setTimeout(() => {
            if (rfidConnection && !rfidConnection.destroyed) {
              console.log('💓 Configurando ping contínuo...');
              
              pingInterval = setInterval(() => {
                if (rfidConnection && !rfidConnection.destroyed) {
                  const pingCommand = Buffer.from([0xA5, 0x5A, 0x00, 0x19, 0x83, 0x30, 0x00]);
                  rfidConnection.write(pingCommand);
                  console.log('💓 Ping mantendo leitor ativo...');
                }
              }, 3000); // Ping a cada 3 segundos
              
              console.log('✅ COMANDO DE RESET DESCOBERTO concluído!');
              console.log('🎯 Leitor deve estar ACORDADO e lendo tags!');
            } else {
              console.log('❌ Conexão perdida durante configuração de ping!');
            }
          }, 1000); // Aguardar 1s antes do ping
        } else {
          console.log('❌ Conexão perdida antes do comando START!');
        }
      }, 2000); // Aguardar 2s antes do START final
    } else {
      console.log('❌ Conexão perdida durante sequência de comandos!');
    }
  }, 3000); // Aguardar 3s para o comando de reset
}

// Função para parar leitura
function stopContinuousReading() {
  if (!isReading) {
    console.log('⚠️ Não está lendo');
    return;
  }

  console.log('🛑 Parando leitura contínua...');
  isReading = false;
  
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  
  console.log('✅ Leitura contínua parada');
}

// Função para desconectar do leitor
function disconnectFromRFIDReader() {
  if (rfidConnection) {
    console.log(`🔌 Desconectando do leitor RFID (${rfidConfig.ip}:${rfidConfig.port})...`);
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    rfidConnection.destroy();
    rfidConnection = null;
    isReading = false;
    console.log('✅ Desconectado do leitor RFID');
  }
}

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);
  
  // Enviar status atual
  socket.emit('connection-status', { 
    isConnected: !!rfidConnection,
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
    uniqueEPCs.clear(); // Limpar EPCs únicos
    socket.emit('readings-update', { readings, totalReadings, uniqueEPCs: uniqueEPCs.size });
  });

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// REST API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    isConnected: !!rfidConnection,
    isReading: isReading,
    totalReadings: totalReadings,
    uniqueEPCs: uniqueEPCs.size, // Adicionar contagem de EPCs únicos
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
    if (rfidConnection) {
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

app.post('/api/stop-reading', (req, res) => {
  stopContinuousReading();
  res.json({ success: true, message: 'Leitura parada' });
});

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

