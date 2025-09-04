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

// Monitoramento de memória e saúde do sistema
const MEMORY_CHECK_INTERVAL = 60000; // 60 segundos
const MAX_MEMORY_USAGE = 100 * 1024 * 1024; // 100MB
const MAX_READINGS_LENGTH = 100; // Máximo de leituras em memória

let keepAliveInterval = null;
let connectionCheckInterval = null;
let readingHealthCheckInterval = null;
let memoryCheckInterval = null;
let lastActivityTime = null;
let lastReadingTime = null;
let connectionAttempts = 0;
let maxConnectionAttempts = 5;
let isShuttingDown = false;

console.log('🚀 Servidor RFID rodando na porta', PORT);
console.log('📡 Configuração padrão:', `${rfidConfig.ip}:${rfidConfig.port}`);

// Comandos customizados para configuração de potência e antenas
const CHAINWAY_COMMANDS = {
  // Comando para ajustar potência (0-30 dBm)
  // Formato: A5 5A 00 08 82 27 [POWER] [CHECKSUM] 0D 0A
  SET_POWER: (power) => {
    const powerByte = Math.max(0, Math.min(30, power)); // 0-30 dBm
    const checksum = (0x82 + 0x27 + powerByte) & 0xFF;
    const command = Buffer.from([0xA5, 0x5A, 0x00, 0x08, 0x82, 0x27, powerByte, checksum, 0x0D, 0x0A]);
    console.log(`  🔧 Comando SET_POWER gerado:`, command);
    console.log(`  📊 Power: ${power} dBm, Byte: 0x${powerByte.toString(16).padStart(2, '0')}, Checksum: 0x${checksum.toString(16).padStart(2, '0')}`);
    return command;
  },
  
  // Comando para ativar antenas
  // Formato: A5 5A 00 08 82 28 [ANTENNA_MASK] [CHECKSUM] 0D 0A
  SET_ANTENNAS: (antennas) => {
    let antennaMask = 0;
    antennas.forEach(ant => {
      if (ant >= 1 && ant <= 4) {
        antennaMask |= (1 << (ant - 1)); // Bit 0-3 para antenas 1-4
      }
    });
    const checksum = (0x82 + 0x28 + antennaMask) & 0xFF;
    return Buffer.from([0xA5, 0x5A, 0x00, 0x08, 0x82, 0x28, antennaMask, checksum, 0x0D, 0x0A]);
  },
  
  // Comando para aplicar configuração
  APPLY_CONFIG: Buffer.from([0xA5, 0x5A, 0x00, 0x08, 0x82, 0x29, 0x01, 0xBF, 0x0D, 0x0A])
};

// Log de debug para verificar se os comandos estão definidos
console.log('🔧 Comandos customizados definidos:');
console.log('  - SET_POWER:', typeof CHAINWAY_COMMANDS.SET_POWER);
console.log('  - SET_ANTENNAS:', typeof CHAINWAY_COMMANDS.SET_ANTENNAS);
console.log('  - APPLY_CONFIG:', typeof CHAINWAY_COMMANDS.APPLY_CONFIG);

// Conectar ao leitor RFID usando a biblioteca chainway-rfid
async function connectToRFIDReader() {
  try {
    console.log(`🔌 Tentando conectar ao leitor RFID: ${rfidConfig.ip}:${rfidConfig.port}`);
    console.log(`  ⚡ Potência configurada: ${rfidConfig.power} dBm`);
    console.log(`  📡 Antenas configuradas: ${rfidConfig.antennas.join(', ')}`);
    
    await chainwayApi.connect(rfidConfig.ip, rfidConfig.port);
    isConnected = true;

    if (!receiverAttached) {
      chainwayApi.received((data) => {
        try {
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
          
          // Log de atividade para debug
          console.log(`📡 Tag recebida: TID=${tidValue}, EPC=${epcValue}, Antena=${reading.antenna}, RSSI=${reading.rssi}`);
        } catch (error) {
          console.error('❌ Erro ao processar dados RFID:', error.message);
        }
      });
      
      // Adicionar handler para eventos de desconexão da biblioteca
      if (typeof chainwayApi.on === 'function') {
        chainwayApi.on('disconnect', () => {
          console.log('⚠️ Biblioteca chainway-rfid detectou desconexão');
          isConnected = false;
          isReading = false;
        });
        
        chainwayApi.on('error', (error) => {
          console.error('❌ Erro na biblioteca chainway-rfid:', error);
        });
        
        // Adicionar handler para todos os eventos possíveis
        chainwayApi.on('close', () => {
          console.log('⚠️ Biblioteca chainway-rfid detectou fechamento de conexão');
        });
        
        chainwayApi.on('end', () => {
          console.log('⚠️ Biblioteca chainway-rfid detectou fim de conexão');
        });
        
        chainwayApi.on('timeout', () => {
          console.log('⚠️ Biblioteca chainway-rfid detectou timeout');
        });
      }
      
      // Interceptar todas as chamadas para stopScan para debug
      if (typeof chainwayApi.stopScan === 'function') {
        const originalStopScan = chainwayApi.stopScan;
        chainwayApi.stopScan = async function(...args) {
          const stackTrace = new Error().stack;
          console.log('🚨 INTERCEPTADO: chainwayApi.stopScan() chamado por:');
          console.log('  📍 Stack trace:', stackTrace);
          console.log('  📊 Status atual: isReading=', isReading);
          console.log('  📊 isConnected:', isConnected);
          
          // Só permitir se for chamado explicitamente pelo usuário
          if (isReading) {
            console.log('  ⚠️ stopScan chamado enquanto está lendo - investigando...');
          }
          
          return await originalStopScan.apply(this, args);
        };
      }
      
      // Interceptar o evento 'close' da biblioteca para evitar desconexão automática
      if (chainwayApi.client && typeof chainwayApi.client.on === 'function') {
        chainwayApi.client.on('close', (hadError) => {
          console.log('🚨 INTERCEPTADO: Evento CLOSE da biblioteca chainway-rfid');
          console.log('  📊 hadError:', hadError);
          console.log('  📊 Status atual: isReading=', isReading);
          console.log('  📊 isConnected:', isConnected);
          
          // Se estiver lendo e não foi erro, tentar manter a conexão
          if (isReading && !hadError) {
            console.log('  ⚠️ Conexão fechada durante leitura - tentando manter ativa...');
            // NÃO marcar como desconectado automaticamente
            // Deixar o keep-alive detectar e reconectar se necessário
          }
        });
      }
      
      // Sistema de auto-restart inteligente para leitura
      let autoRestartAttempts = 0;
      const MAX_AUTO_RESTART_ATTEMPTS = 3;
      
      // Função para reiniciar leitura automaticamente se necessário
      async function autoRestartReading() {
        if (autoRestartAttempts >= MAX_AUTO_RESTART_ATTEMPTS) {
          console.log('⚠️ Máximo de tentativas de auto-restart atingido');
          console.log('ℹ️ Use "Iniciar Leitura" manualmente no frontend');
          return;
        }
        
        if (isConnected && !isReading) {
          console.log(`🔄 Tentativa ${autoRestartAttempts + 1} de auto-restart da leitura...`);
          try {
            await startContinuousReading();
            if (isReading) {
              console.log('✅ Auto-restart da leitura bem-sucedido!');
              autoRestartAttempts = 0; // Reset contador
            }
          } catch (error) {
            console.error('❌ Falha no auto-restart:', error.message);
            autoRestartAttempts++;
          }
        }
      }
      
      // Log de todos os métodos disponíveis na biblioteca
      console.log('🔍 Métodos disponíveis na biblioteca chainway-rfid:');
      console.log('  - connect:', typeof chainwayApi.connect);
      console.log('  - disconnect:', typeof chainwayApi.disconnect);
      console.log('  - startScan:', typeof chainwayApi.startScan);
      console.log('  - stopScan:', typeof chainwayApi.stopScan);
      console.log('  - received:', typeof chainwayApi.received);
      console.log('  - on:', typeof chainwayApi.on);
      
      receiverAttached = true;
    }

    console.log(`✅ Conectado ao leitor RFID em ${rfidConfig.ip}:${rfidConfig.port}!`);
    
    // Iniciar sistema de keep-alive
    startKeepAlive();
    startConnectionCheck();
    startReadingHealthCheck();
    startMemoryCheck(); // Iniciar monitoramento de memória
    
    // NÃO iniciar leitura automaticamente - apenas conectar
    console.log('ℹ️ Leitor conectado. Use "Iniciar Leitura" para começar a ler tags.');
    
  } catch (error) {
    console.error(`❌ Erro na conexão RFID (${rfidConfig.ip}:${rfidConfig.port}):`, error.message || error);
    isConnected = false;
    throw error;
  }
}

// Sistema de keep-alive para manter conexão ativa
function startKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  
  keepAliveInterval = setInterval(async () => {
    if (isConnected) {
      try {
        // Apenas verificar se leitor está respondendo - NÃO enviar comandos de leitura
        console.log('🔌 Verificando se leitor está respondendo...');
        
        // NÃO enviar startScan - apenas verificar conexão
        // O leitor já está lendo ou pausado pelo usuário
        
        // Atualizar apenas lastActivityTime, NÃO lastReadingTime
        lastActivityTime = Date.now();
        // NÃO atualizar lastReadingTime aqui para evitar interferir na verificação de saúde
        
        console.log('💓 Keep-alive RFID - Conexão verificada');
      } catch (error) {
        console.log('⚠️ Erro keep-alive:', error.message);
        // Tentar reconectar se houver erro
        handleConnectionLoss();
      }
    }
  }, KEEP_ALIVE_INTERVAL);
  
  console.log('🔄 Keep-alive iniciado (30s) - Apenas verificação de conexão');
}

// Verificação periódica da conexão
function startConnectionCheck() {
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
  }
  
  connectionCheckInterval = setInterval(async () => {
    if (isConnected) {
      try {
        // Apenas verificar se conexão ainda está ativa - NÃO enviar comandos de leitura
        console.log('🔌 Verificando se conexão ainda está ativa...');
        
        // NÃO enviar startScan - apenas verificar conexão
        // O leitor já está lendo ou pausado pelo usuário
        
        // Verificar se a conexão ainda está ativa
        const currentTime = Date.now();
        if (lastActivityTime && (currentTime - lastActivityTime) > MAX_INACTIVITY_TIME) {
          console.log('⚠️ Inatividade detectada, verificando conexão...');
          await handleConnectionLoss();
        }
        
        // Atualizar apenas lastActivityTime, NÃO lastReadingTime
        lastActivityTime = Date.now();
        // NÃO atualizar lastReadingTime aqui para evitar interferir na verificação de saúde
        
      } catch (error) {
        console.log('⚠️ Erro na verificação de conexão:', error.message);
      }
    }
  }, CONNECTION_CHECK_INTERVAL);
  
  console.log('🔍 Verificação de conexão iniciada (10s) - Apenas verificação de atividade');
}

// Verificação de saúde da leitura RFID
function startReadingHealthCheck() {
  if (readingHealthCheckInterval) {
    clearInterval(readingHealthCheckInterval);
  }
  
  readingHealthCheckInterval = setInterval(async () => {
    if (isConnected) {
      try {
        // Apenas verificar saúde da leitura - NÃO enviar comandos de leitura
        console.log('🔌 Verificando saúde da leitura...');
        
        // NÃO enviar startScan - apenas verificar se está funcionando
        // O leitor já está lendo ou pausado pelo usuário
        
        // Verificar se está lendo há muito tempo sem receber dados
        if (lastReadingTime && (Date.now() - lastReadingTime) > 45000) { // 45 segundos
          console.log('⚠️ Leitura parou de funcionar - mas NÃO reiniciando automaticamente');
          console.log('ℹ️ Use "Iniciar Leitura" no frontend para reiniciar manualmente');
          console.log(`  📊 Status atual: isReading=${isReading}, lastReadingTime=${lastReadingTime ? new Date(lastReadingTime).toISOString() : 'null'}`);
          
          // NÃO reiniciar automaticamente - deixar controle manual
          // Apenas atualizar tempos para evitar spam de logs
          lastActivityTime = Date.now();
          // NÃO atualizar lastReadingTime aqui para evitar loop
        }
        
        // Log de status para debug
        console.log(`  📊 Status da leitura: isReading=${isReading}, lastReadingTime=${lastReadingTime ? new Date(lastReadingTime).toISOString() : 'null'}`);
        
        // Atualizar apenas lastActivityTime, NÃO lastReadingTime
        lastActivityTime = Date.now();
        
      } catch (error) {
        console.log('⚠️ Erro no health check de leitura:', error.message);
      }
    }
  }, READING_HEALTH_CHECK_INTERVAL);
  
  console.log('📊 Health check de leitura RFID iniciado (20s) - Apenas verificação de saúde');
}

// Função para aplicar potência em tempo real
async function applyPowerInRealTime(power) {
  try {
    console.log(`⚡ Aplicando nova potência: ${power} dBm`);
    
    // Verificar se há conexão
    if (!isConnected) {
      console.log('⚠️ Não há conexão com o leitor para aplicar potência');
      // Mesmo sem conexão, atualizar a configuração local
      rfidConfig.power = power;
      console.log(`✅ Configuração de potência atualizada para ${power} dBm (será aplicada na próxima conexão)`);
      return true;
    }
    
    // Enviar comando de potência
    console.log(`  🔧 Chamando CHAINWAY_COMMANDS.SET_POWER(${power})`);
    const powerCommand = CHAINWAY_COMMANDS.SET_POWER(power);
    console.log(`  📡 Comando de potência gerado:`, powerCommand);
    console.log(`  📊 Tipo do comando:`, typeof powerCommand);
    console.log(`  📊 É Buffer:`, Buffer.isBuffer(powerCommand));
    
    let commandSent = false;
    
    // Usar o método send da biblioteca se disponível
    if (typeof chainwayApi.send === 'function') {
      try {
        await chainwayApi.send(powerCommand);
        console.log('  ✅ Comando de potência enviado via chainwayApi.send');
        commandSent = true;
      } catch (sendError) {
        console.log('  ⚠️ Erro no chainwayApi.send:', sendError.message);
      }
    }
    
    // Fallback para acesso direto ao socket
    if (!commandSent && chainwayApi.client && typeof chainwayApi.client.write === 'function') {
      try {
        chainwayApi.client.write(powerCommand);
        console.log('  ✅ Comando de potência enviado via socket direto');
        commandSent = true;
      } catch (writeError) {
        console.log('  ⚠️ Erro no socket direto:', writeError.message);
      }
    }
    
    // Fallback: tentar usar o método TCP direto
    if (!commandSent) {
      console.log('  ⚠️ Método de envio não disponível, usando fallback TCP');
      try {
        const net = require('net');
        const tempClient = new net.Socket();
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            tempClient.destroy();
            reject(new Error('Timeout na conexão TCP'));
          }, 5000);
          
          tempClient.connect(rfidConfig.port, rfidConfig.ip, () => {
            tempClient.write(powerCommand);
            tempClient.end();
            clearTimeout(timeout);
            console.log('  ✅ Comando de potência enviado via conexão temporária');
            resolve();
          });
          
          tempClient.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
        
        commandSent = true;
      } catch (tcpError) {
        console.log('  ❌ Erro ao enviar comando via conexão temporária:', tcpError.message);
      }
    }
    
    // Atualizar configuração local independentemente do resultado
    rfidConfig.power = power;
    console.log(`✅ Configuração de potência atualizada para ${power} dBm`);
    
    // Emitir atualização para todos os clientes
    io.emit('power-updated', { power: power });
    
    // Retornar true se pelo menos um método funcionou, ou se não há conexão
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao aplicar potência:', error.message);
    // Mesmo com erro, atualizar a configuração local
    rfidConfig.power = power;
    console.log(`⚠️ Erro na aplicação, mas configuração local atualizada para ${power} dBm`);
    return true; // Retornar true para não causar erro 500
  }
}

// Função para encerramento gracioso do servidor
function gracefulShutdown(reason) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`🛑 Encerramento gracioso: ${reason}`);
  
  // Parar todos os intervalos
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
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
    memoryCheckInterval = null;
  }
  
  // Desconectar RFID
  if (isConnected) {
    disconnectFromRFIDReader();
  }
  
  // Fechar servidor HTTP
  server.close(() => {
    console.log('✅ Servidor HTTP fechado');
    process.exit(0);
  });
  
  // Timeout de segurança
  setTimeout(() => {
    console.log('⏰ Timeout de segurança - forçando saída');
    process.exit(1);
  }, 5000);
}

// Monitoramento de memória
function startMemoryCheck() {
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
  }
  memoryCheckInterval = setInterval(checkMemoryUsage, MEMORY_CHECK_INTERVAL);
  console.log(`🔍 Monitoramento de memória iniciado (intervalo: ${MEMORY_CHECK_INTERVAL / 1000}s)`);
}

// Função para verificar uso de memória
function checkMemoryUsage() {
  try {
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed;
    const heapTotal = memUsage.heapTotal;
    
    console.log(`💾 Memória: ${Math.round(heapUsed / 1024 / 1024)}MB / ${Math.round(heapTotal / 1024 / 1024)}MB`);
    
    // Se a memória estiver muito alta, limpar e forçar GC
    if (heapUsed > MAX_MEMORY_USAGE) {
      console.warn('⚠️ Uso de memória alto detectado!');
      
      // Limpar arrays grandes
      if (readings.length > MAX_READINGS_LENGTH) {
        readings = readings.slice(-MAX_READINGS_LENGTH);
        console.log('🧹 Array de leituras reduzido para economizar memória');
      }
      
      // Forçar garbage collection se disponível
      if (global.gc) {
        global.gc();
        console.log('🗑️ Garbage collection forçado');
      }
      
      // Se ainda estiver alto após limpeza, reiniciar
      const newMemUsage = process.memoryUsage();
      if (newMemUsage.heapUsed > MAX_MEMORY_USAGE) {
        console.error('🚨 Memória ainda alta após limpeza! Reiniciando aplicação...');
        gracefulShutdown('Memória insuficiente');
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar uso de memória:', error.message);
  }
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
    if (memoryCheckInterval) {
      clearInterval(memoryCheckInterval);
      memoryCheckInterval = null;
    }
    
    // Marcar como desconectado
    isConnected = false;
    isReading = false;
    receiverAttached = false; // Reset para permitir reconexão
    
    // Tentar reconectar
    await connectToRFIDReader();
    
    // Se reconectou com sucesso, NÃO iniciar leitura automaticamente
    if (isConnected) {
      console.log('✅ Reconexão bem-sucedida! Leitor conectado mas leitura pausada.');
      console.log('ℹ️ Use "Iniciar Leitura" para começar a ler tags.');
      
      // NÃO iniciar leitura automaticamente - deixar controle manual
      
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
    console.log(`  ⚡ Potência atual: ${rfidConfig.power} dBm`);
    console.log(`  📡 Antenas ativas: ${rfidConfig.antennas.join(', ')}`);
    
    console.log('  🔍 Enviando comando startScan...');
    await chainwayApi.startScan();
    console.log('  ✅ Comando startScan executado com sucesso');
    
    isReading = true;
    lastActivityTime = Date.now(); // Atualizar tempo de atividade
    lastReadingTime = Date.now(); // Registrar início da leitura
    console.log('✅ Leitura contínua iniciada');
    console.log(`  📊 Status: isReading=${isReading}, lastReadingTime=${new Date(lastReadingTime).toISOString()}`);
  } catch (error) {
    console.error('❌ Erro ao iniciar leitura:', error.message || error);
    console.error('  📍 Detalhes do erro:', error.stack || 'Stack trace não disponível');
  }
}

// Parar leitura contínua via chainway-rfid
async function stopContinuousReading() {
  // Log de stack trace para identificar quem está chamando
  const stackTrace = new Error().stack;
  console.log('🛑 stopContinuousReading() chamada por:');
  console.log('  📍 Stack trace:', stackTrace);
  
  if (!isReading) {
    console.log('⚠️ Não está lendo');
    return;
  }
  try {
    console.log('🛑 Parando leitura contínua...');
    console.log(`  📊 Status antes: isReading=${isReading}, lastReadingTime=${lastReadingTime ? new Date(lastReadingTime).toISOString() : 'null'}`);
    
    console.log('  🔍 Enviando comando stopScan...');
    await chainwayApi.stopScan();
    console.log('  ✅ Comando stopScan executado com sucesso');
    
    isReading = false;
    lastActivityTime = Date.now(); // Atualizar tempo de atividade
    lastReadingTime = null; // Limpar tempo de leitura
    console.log('✅ Leitura contínua parada');
    console.log(`  📊 Status depois: isReading=${isReading}, lastReadingTime=${lastReadingTime}`);
  } catch (error) {
    console.error('❌ Erro ao parar leitura:', error.message || error);
    console.error('  📍 Stack trace:', error.stack || 'Não disponível');
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
    if (memoryCheckInterval) {
      clearInterval(memoryCheckInterval);
      memoryCheckInterval = null;
      console.log('🔍 Monitoramento de memória parado');
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
    receiverAttached = false; // Reset para permitir reconexão
    console.log('✅ Desconectado do leitor RFID');
  } catch (error) {
    console.error('❌ Erro ao desconectar:', error.message || error);
    // Forçar desconexão mesmo com erro
    isReading = false;
    isConnected = false;
    lastActivityTime = null;
    receiverAttached = false; // Reset para permitir reconexão
    
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
    if (memoryCheckInterval) {
      clearInterval(memoryCheckInterval);
      memoryCheckInterval = null;
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
    try {
      console.log('🧹 Limpando histórico de leituras...');
      
      // Limpar arrays e contadores
      readings = [];
      totalReadings = 0;
      uniqueTIDs.clear(); // Limpar TIDs únicos
      
      // Emitir atualização para todos os clientes
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
    
    // Validar potência (0-30 dBm)
    if (newConfig.power !== undefined) {
      if (newConfig.power < 0 || newConfig.power > 30) {
        return res.status(400).json({ success: false, message: 'Potência deve estar entre 0 e 30 dBm' });
      }
      
      // Aviso para potências muito altas
      if (newConfig.power > 25) {
        console.log(`⚠️ ATENÇÃO: Potência configurada muito alta (${newConfig.power} dBm)`);
        console.log('  ⚠️ Potências altas podem causar interferência e problemas de estabilidade');
      }
    }
    
    // Validar antenas (array de números de 1 a 4)
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
    
    console.log('⚙️ Configuração atualizada:');
    console.log('  📡 IP:', oldConfig.ip, '→', rfidConfig.ip);
    console.log('  🔌 Porta:', oldConfig.port, '→', rfidConfig.port);
    console.log('  ⚡ Potência:', oldConfig.power, '→', rfidConfig.power, 'dBm');
    console.log('  📡 Antenas:', oldConfig.antennas, '→', rfidConfig.antennas);
    console.log('  🔊 Som:', oldConfig.soundEnabled, '→', rfidConfig.soundEnabled);
    
    // Se estiver conectado, desconectar para usar nova configuração
    if (isConnected) {
      console.log('🔄 Reconectando com nova configuração...');
      try {
        await disconnectFromRFIDReader();
        
        // Apenas reconectar, NÃO iniciar leitura automaticamente após trocar configuração
        console.log('🔄 Reconectando automaticamente com nova configuração...');
        try {
          await connectToRFIDReader();
          console.log('✅ Reconectado com nova configuração! Use "Iniciar Leitura" para começar.');
        } catch (reconnectError) {
          console.error('❌ Erro na reconexão automática:', reconnectError.message);
          console.log('⚠️ Tentando reconectar novamente em 3 segundos...');
          
          // Tentar reconectar novamente após delay
          setTimeout(async () => {
            try {
              await connectToRFIDReader();
              console.log('✅ Reconectado na segunda tentativa!');
            } catch (secondError) {
              console.error('❌ Falha na segunda tentativa de reconexão:', secondError.message);
            }
          }, 3000);
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
    // Apenas conectar, NÃO iniciar leitura automaticamente
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
    
    // Apenas parar leitura, NÃO reiniciar automaticamente
    res.json({ success: true, message: 'Leitura parada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Nova rota para ajustar apenas a potência em tempo real
app.post('/api/power', async (req, res) => {
  try {
    const { power } = req.body;
    
    // Validar potência
    if (power === undefined || power < 0 || power > 30) {
      return res.status(400).json({ 
        success: false, 
        message: 'Potência deve estar entre 0 e 30 dBm' 
      });
    }
    
    // Aviso para potências muito altas
    if (power > 25) {
      console.log(`⚠️ ATENÇÃO: Potência solicitada muito alta (${power} dBm)`);
      console.log('  ⚠️ Potências altas podem causar interferência e problemas de estabilidade');
    }
    
    console.log(`🔌 Recebida solicitação para ajustar potência para ${power} dBm`);
    
    // Aplicar potência em tempo real
    const success = await applyPowerInRealTime(power);
    
    if (success) {
      console.log(`✅ Potência ajustada com sucesso para ${power} dBm`);
      res.json({ 
        success: true, 
        message: `Potência ajustada para ${power} dBm`,
        power: power,
        connected: isConnected
      });
    } else {
      console.log(`❌ Falha ao aplicar potência ${power} dBm`);
      res.status(500).json({ 
        success: false, 
        message: 'Falha ao aplicar potência' 
      });
    }
  } catch (error) {
    console.error('❌ Erro ao ajustar potência:', error);
    res.status(500).json({ 
      success: false, 
      message: `Erro interno: ${error.message}` 
    });
  }
});

// Limpeza periódica de memória
function cleanupMemory() {
  try {
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
  } catch (error) {
    console.error('❌ Erro na limpeza de memória:', error.message);
  }
}

// Limpeza a cada 5 minutos
setInterval(cleanupMemory, 300000);

// Tratamento de erro para setInterval
process.on('uncaughtException', (error) => {
  console.error('🚨 Erro não capturado:', error);
  gracefulShutdown('Erro não capturado');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Promise rejeitada não tratada:', reason);
  gracefulShutdown('Promise rejeitada não tratada');
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

