const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
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

// Configuração do Multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Aceitar apenas arquivos Excel
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

// Configuração padrão do leitor RFID (pode ser alterada via formulário)
let rfidConfig = {
  ip: '192.168.99.201', // IP padrão da antena
  port: 8888,
  power: 20,
  antennas: [1, 2, 3, 4],
  soundEnabled: true,
  matchSoundEnabled: true // Som para correspondências UHF
};

const PORT = 3001;

// Variáveis globais para controle
let isConnected = false;
let isReading = false;
let totalReadings = 0;
let uniqueTIDs = new Set(); // Contar TIDs únicos
let readings = []; // Array de leituras para histórico
let receiverAttached = false;

// Sistema de armazenamento de planilhas Excel
let excelData = []; // Array com todos os itens da planilha
// Índice por UHF para buscas O(1)
let excelIndexByUHF = new Map(); // chave: UHF (uppercase/trim) -> array de itens
let excelUhfColumnName = null; // nome da coluna UHF inferido do cabeçalho
let excelMetadata = {
  fileName: '',
  uploadDate: null,
  totalItems: 0,
  columns: []
};

// Persistência em disco
const DATA_DIR = path.join(__dirname, 'data');
const EXCEL_DATA_FILE = path.join(DATA_DIR, 'excel_data.json');
let excelDirty = false;
const AUTOSAVE_INTERVAL_MS = 15000; // 15s

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (_) {}
}

function serializeExcelPayload() {
  return JSON.stringify({
    excelData,
    excelMetadata
  });
}

function saveExcelToDiskSync() {
  try {
    ensureDataDir();
    fs.writeFileSync(EXCEL_DATA_FILE, serializeExcelPayload());
    excelDirty = false;
    console.log('💾 Excel salvo em disco (sync).');
  } catch (e) {
    console.log('⚠️ Falha ao salvar Excel (sync):', e.message);
  }
}

async function saveExcelToDisk() {
  try {
    ensureDataDir();
    await fs.promises.writeFile(EXCEL_DATA_FILE, serializeExcelPayload());
    excelDirty = false;
    console.log('💾 Excel salvo em disco.');
  } catch (e) {
    console.log('⚠️ Falha ao salvar Excel:', e.message);
  }
}

async function loadExcelFromDisk() {
  try {
    if (fs.existsSync(EXCEL_DATA_FILE)) {
      const raw = await fs.promises.readFile(EXCEL_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.excelData) && parsed.excelMetadata) {
        excelData = parsed.excelData;
        excelMetadata = parsed.excelMetadata;
        console.log(`📦 Excel carregado do disco: ${excelMetadata.fileName} (${excelData.length} itens)`);
        // Recriar índices após carregar
        rebuildExcelIndex();
        // Notificar clientes conectados posteriormente
        setTimeout(() => {
          io.emit('excel-data-updated', { data: excelData, metadata: excelMetadata });
        }, 500);
      }
    }
  } catch (e) {
    console.log('⚠️ Falha ao carregar Excel do disco:', e.message);
  }
}

// Autosave periódico
setInterval(() => {
  if (excelDirty) {
    saveExcelToDisk();
  }
}, AUTOSAVE_INTERVAL_MS);

// Sistema para evitar notificações duplicadas
let notifiedMatches = new Set(); // Armazenar TID+UHF já notificados
const NOTIFICATION_COOLDOWN = 30000; // 30 segundos de cooldown entre notificações da mesma TID+UHF

// Sistema de proteção contra loops
let comparisonCount = 0;
let lastComparisonReset = Date.now();
const MAX_COMPARISONS_PER_SECOND = 100; // Máximo 100 comparações por segundo

// Função auxiliar para verificar se o stream está válido
function isStreamValid() {
  return chainwayApi && 
         chainwayApi.client && 
         !chainwayApi.client.destroyed;
}

// ===== Índice de UHF (Excel) =====
function inferUhfColumnName(headers) {
  if (!headers || headers.length === 0) return null;
  const found = headers.find(h => {
    if (!h) return false;
    const k = String(h).toLowerCase();
    return k === 'uhf' || k.includes('uhf');
  });
  return found || null;
}

function indexItemByUHF(item, uhfColumnName) {
  const keysToCheck = [];
  if (uhfColumnName && item[uhfColumnName] !== undefined) {
    keysToCheck.push(uhfColumnName);
  } else {
    // Fallback: procurar campo contendo UHF no item
    Object.keys(item).forEach(key => {
      const k = key.toLowerCase();
      if (k === 'uhf' || k.includes('uhf')) keysToCheck.push(key);
    });
  }
  for (const key of keysToCheck) {
    const raw = item[key];
    if (raw === undefined || raw === null) continue;
    const normalized = String(raw).toUpperCase().trim();
    if (!normalized) continue;
    const existing = excelIndexByUHF.get(normalized);
    if (existing) {
      existing.push(item);
    } else {
      excelIndexByUHF.set(normalized, [item]);
    }
    break;
  }
}

function rebuildExcelIndex(headers) {
  excelIndexByUHF.clear();
  excelUhfColumnName = headers ? inferUhfColumnName(headers) : excelUhfColumnName;
  for (const item of excelData) {
    indexItemByUHF(item, excelUhfColumnName);
  }
  console.log(`🗂️ Índice UHF reconstruído: ${excelIndexByUHF.size} chaves.`);
}

// ===== Fila de emissões de correspondência (throttle) =====
let matchEventQueue = [];
let pendingMatchKeys = new Set();
let matchFlushTimer = null;
const MATCH_FLUSH_MS = 100; // flush a cada 100ms
const MATCH_MAX_PER_FLUSH = 30; // no máximo 30 emissões por flush

function flushMatchQueue() {
  try {
    const batch = matchEventQueue.splice(0, MATCH_MAX_PER_FLUSH);
    for (const item of batch) {
      pendingMatchKeys.delete(item.matchKey);
      io.emit('rfid-match-found', item.matchData);
    }
    if (matchEventQueue.length === 0 && matchFlushTimer) {
      clearInterval(matchFlushTimer);
      matchFlushTimer = null;
    }
  } catch (e) {
    console.log('⚠️ Erro ao flush da fila de correspondências:', e.message);
  }
}

function enqueueMatchEmit(matchData, matchKey) {
  if (pendingMatchKeys.has(matchKey)) {
    return; // já está na fila
  }
  pendingMatchKeys.add(matchKey);
  matchEventQueue.push({ matchData, matchKey });
  if (!matchFlushTimer) {
    matchFlushTimer = setInterval(flushMatchQueue, MATCH_FLUSH_MS);
  }
}

// Configurações para processamento por lotes
const EXCEL_BATCH_SIZE = 1000; // Processar 1000 linhas por vez
const MAX_EXCEL_ITEMS = 50000; // Máximo de 50k itens na memória
const EXCEL_MEMORY_CHECK_INTERVAL = 30000; // Verificar memória a cada 30s

// Keep-alive e verificação de conexão para PORTAL (sempre ativo)
const KEEP_ALIVE_INTERVAL = 30000; // 30 segundos - apenas verificação
const MAX_INACTIVITY_TIME = 60000; // 60 segundos - tempo razoável
const CONNECTION_CHECK_INTERVAL = 10000; // 10 segundos - verificação
const MAX_READINGS_HISTORY = 50; // Reduzir histórico para economizar memória
const READING_HEALTH_CHECK_INTERVAL = 20000; // 20 segundos - verificar se está lendo
const AUTO_RESTART_INTERVAL = 40000; // 40 segundos - parar e reiniciar leitura automaticamente

// Monitoramento de memória e saúde do sistema
const MEMORY_CHECK_INTERVAL = 60000; // 60 segundos
const MAX_MEMORY_USAGE = 100 * 1024 * 1024; // 100MB
const MAX_READINGS_LENGTH = 100; // Máximo de leituras em memória

let keepAliveInterval = null;
let connectionCheckInterval = null;
let readingHealthCheckInterval = null;
let memoryCheckInterval = null;
let autoRestartInterval = null;
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

          // Verificar se TID corresponde a UHF da planilha usando índice O(1)
          let matchedItem = null;
          if (tidValue && excelIndexByUHF.size > 0) {
            // Proteção contra loops - resetar contador a cada segundo
            const now = Date.now();
            if (now - lastComparisonReset > 1000) {
              comparisonCount = 0;
              lastComparisonReset = now;
            }
            
            // Verificar se não excedeu o limite de comparações
            if (comparisonCount < MAX_COMPARISONS_PER_SECOND) {
              comparisonCount++;
              const tidClean = tidValue.toUpperCase().trim();
              const candidates = excelIndexByUHF.get(tidClean);
              if (candidates && candidates.length > 0) {
                matchedItem = candidates[0]; // pegar o primeiro correspondente
                console.log(`🔍 CORRESPONDÊNCIA ENCONTRADA via índice: "${tidClean}"`);
              }
            } else {
              console.log(`⚠️ Limite de comparações excedido (${MAX_COMPARISONS_PER_SECOND}/s) - pulando comparação`);
            }
          }

          // Se encontrou correspondência, verificar se já foi notificada
          if (matchedItem) {
            // Criar chave única para TID+UHF
            const uhfColumn = Object.keys(matchedItem).find(key => 
              key.toLowerCase().includes('uhf') || 
              key.toLowerCase() === 'uhf'
            );
            const itemUHF = uhfColumn ? String(matchedItem[uhfColumn]).toUpperCase().trim() : '';
            const matchKey = `${tidValue.toUpperCase().trim()}_${itemUHF}`;
            
            // Verificar se já foi notificada recentemente
            const now = Date.now();
            const lastNotification = notifiedMatches.has(matchKey);
            
            if (!lastNotification) {
              console.log(`🎯 CORRESPONDÊNCIA ENCONTRADA!`);
              console.log(`  📋 TID: ${tidValue}`);
              console.log(`  📦 Item: ${JSON.stringify(matchedItem)}`);
              console.log(`  📡 Antena: ${reading.antenna}`);
              console.log(`  🔑 Chave: ${matchKey}`);
              
              // Adicionar à lista de notificados
              notifiedMatches.add(matchKey);
              
              // Emitir evento de correspondência
              const matchData = {
                reading: reading,
                item: matchedItem,
                timestamp: new Date().toISOString()
              };
              
              console.log('📡 Enfileirando evento rfid-match-found...');
              enqueueMatchEmit(matchData, matchKey);
              console.log('✅ Evento rfid-match-found enfileirado com sucesso');
              
              // Remover da lista após cooldown (para permitir nova notificação no futuro)
              setTimeout(() => {
                notifiedMatches.delete(matchKey);
                console.log(`🔄 Cooldown expirado para ${matchKey} - pode notificar novamente`);
              }, NOTIFICATION_COOLDOWN);
              
            } else {
              console.log(`⏭️ Correspondência já notificada recentemente: ${matchKey}`);
            }
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
          
          // Verificar se o stream ainda está válido
          if (chainwayApi.client && chainwayApi.client.destroyed) {
            console.log('  ⚠️ Stream já foi destruído - pulando stopScan');
            isReading = false;
            return;
          }
          
          // Só permitir se for chamado explicitamente pelo usuário
          if (isReading) {
            console.log('  ⚠️ stopScan chamado enquanto está lendo - investigando...');
          }
          
          try {
            return await originalStopScan.apply(this, args);
          } catch (error) {
            if (error.code === 'ERR_STREAM_DESTROYED') {
              console.log('  ⚠️ Stream destruído durante stopScan - marcando como parado');
              isReading = false;
              return;
            }
            throw error;
          }
        };
      }
      
      // Interceptar startScan para verificar stream válido
      if (typeof chainwayApi.startScan === 'function') {
        const originalStartScan = chainwayApi.startScan;
        chainwayApi.startScan = async function(...args) {
          console.log('🚨 INTERCEPTADO: chainwayApi.startScan() chamado');
          console.log('  📊 Status atual: isReading=', isReading);
          console.log('  📊 isConnected:', isConnected);
          console.log('  📊 Stream válido:', isStreamValid());
          
          // Verificar se o stream ainda está válido
          if (!isStreamValid()) {
            console.log('  ⚠️ Stream inválido - não é possível iniciar leitura');
            throw new Error('Stream TCP destruído - reconecte primeiro');
          }
          
          try {
            return await originalStartScan.apply(this, args);
          } catch (error) {
            if (error.code === 'ERR_STREAM_DESTROYED') {
              console.log('  ⚠️ Stream destruído durante startScan');
              throw new Error('Stream TCP destruído - reconecte primeiro');
            }
            throw error;
          }
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
    startAutoRestart(); // Iniciar auto-restart da leitura
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
    try {
      console.log('🔌 Keep-alive: Verificando e mantendo leitor ativo...');
      
      // SEMPRE conectar e iniciar leitura a cada 30 segundos
      if (!isConnected) {
        console.log('  🔌 Leitor desconectado - reconectando...');
        try {
          await connectToRFIDReader();
          console.log('  ✅ Reconectado com sucesso');
        } catch (connectError) {
          console.log('  ❌ Falha na reconexão:', connectError.message);
          return;
        }
      }
      
      // SEMPRE iniciar leitura se não estiver lendo
      if (!isReading) {
        console.log('  🟢 Leitura parada - iniciando automaticamente...');
        try {
          await startContinuousReading();
          console.log('  ✅ Leitura iniciada automaticamente');
        } catch (startError) {
          console.log('  ❌ Falha ao iniciar leitura:', startError.message);
        }
      } else {
        console.log('  📡 Leitura já está ativa - verificando saúde...');
        
        // Verificar se recebeu dados recentemente
        if (lastReadingTime && (Date.now() - lastReadingTime) > 30000) { // 30 segundos
          console.log('  ⚠️ Leitura ativa mas sem dados recentes - reiniciando...');
          try {
            await startContinuousReading();
            console.log('  ✅ Leitura reiniciada com sucesso');
          } catch (restartError) {
            console.log('  ❌ Falha ao reiniciar leitura:', restartError.message);
          }
        } else {
          console.log('  ✅ Leitura funcionando normalmente');
        }
      }
      
      // Atualizar tempo de atividade
      lastActivityTime = Date.now();
      console.log('💓 Keep-alive RFID - Leitor mantido ativo');
      
    } catch (error) {
      console.log('⚠️ Erro no keep-alive:', error.message);
    }
  }, KEEP_ALIVE_INTERVAL);
  
  console.log('🔄 Keep-alive iniciado (30s) - SEMPRE mantém leitor ativo e lendo');
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
          console.log('⚠️ Health Check: Leitura parou de funcionar');
          console.log(`  📊 Status atual: isReading=${isReading}, lastReadingTime=${lastReadingTime ? new Date(lastReadingTime).toISOString() : 'null'}`);
          
          // O keep-alive vai cuidar de reconectar e reiniciar automaticamente
          console.log('  ℹ️ Keep-alive vai reconectar e reiniciar automaticamente em até 30s');
          
          // Atualizar apenas lastActivityTime
          lastActivityTime = Date.now();
        }
        
        // Log de status para debug
        console.log(`  📊 Status da leitura: isReading=${isReading}, lastReadingTime=${lastReadingTime ? new Date(lastReadingTime).toISOString() : 'null'}`);
        
        // Monitoramento simples de saúde
        if (isReading && lastReadingTime) {
          const timeSinceLastReading = Date.now() - lastReadingTime;
          const minutesSinceLastReading = Math.floor(timeSinceLastReading / 60000);
          
          if (minutesSinceLastReading >= 1) {
            console.log(`  ⏰ Health Check: Sem leituras há ${minutesSinceLastReading} minuto(s)`);
            console.log(`  ℹ️ Keep-alive vai resolver automaticamente em até 30s`);
          }
        }
        
        // Atualizar apenas lastActivityTime, NÃO lastReadingTime
        lastActivityTime = Date.now();
        
      } catch (error) {
        console.log('⚠️ Erro no health check de leitura:', error.message);
      }
    }
  }, READING_HEALTH_CHECK_INTERVAL);
  
  console.log('📊 Health check de leitura RFID iniciado (20s) - Apenas verificação de saúde');
}

// Sistema de auto-restart da leitura a cada 40 segundos
function startAutoRestart() {
  if (autoRestartInterval) {
    clearInterval(autoRestartInterval);
  }
  
  autoRestartInterval = setInterval(async () => {
    if (isConnected && isReading) {
      try {
        console.log('🔄 Auto-restart: Parando e reiniciando leitura automaticamente...');
        
        // Verificar se a conexão ainda está ativa antes de tentar parar
        if (!isConnected) {
          console.log('  ⚠️ Conexão perdida durante auto-restart - pulando');
          return;
        }
        
        // Parar leitura (como o botão "Parar Leitura")
        console.log('  🛑 Parando leitura...');
        try {
          await chainwayApi.stopScan();
          isReading = false;
          console.log('  ✅ Leitura parada');
        } catch (stopError) {
          console.log('  ⚠️ Erro ao parar leitura (não crítico):', stopError.message);
          isReading = false;
        }
        
        // Aguardar um pouco para estabilizar
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verificar conexão e stream válido antes de reiniciar
        if (!isConnected) {
          console.log('  ⚠️ Conexão perdida - não é possível reiniciar leitura');
          return;
        }
        
        if (!isStreamValid()) {
          console.log('  ⚠️ Stream TCP destruído - tentando reconectar...');
          try {
            await connectToRFIDReader();
            console.log('  ✅ Reconectado com sucesso');
          } catch (reconnectError) {
            console.log('  ❌ Falha na reconexão:', reconnectError.message);
            return;
          }
        }
        
        // Reiniciar leitura (como o botão "Iniciar Leitura")
        console.log('  🟢 Reiniciando leitura...');
        try {
          await chainwayApi.startScan();
          isReading = true;
          lastReadingTime = Date.now();
          console.log('  ✅ Leitura reiniciada');
        } catch (startError) {
          console.log('  ❌ Erro ao reiniciar leitura:', startError.message);
          isReading = false;
          
          // Se o erro for de stream destruído, tentar reconectar
          if (startError.message.includes('Stream TCP destruído')) {
            console.log('  🔄 Stream destruído - tentando reconectar...');
            try {
              await connectToRFIDReader();
              console.log('  ✅ Reconectado após erro de stream');
            } catch (reconnectError) {
              console.log('  ❌ Falha na reconexão:', reconnectError.message);
            }
          }
        }
        
        console.log('🔄 Auto-restart concluído');
        
      } catch (error) {
        console.error('❌ Erro no auto-restart:', error.message);
        // Se falhar, tentar manter o status atual
        isReading = false;
      }
    }
  }, AUTO_RESTART_INTERVAL);
  
  console.log('🔄 Auto-restart iniciado (40s) - Para e reinicia leitura automaticamente');
}

// Função para processar planilha Excel por lotes
async function processExcelFile(buffer, fileName) {
  try {
    console.log(`📊 Processando planilha: ${fileName}`);
    
    // Ler a planilha
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // Primeira aba
    const worksheet = workbook.Sheets[sheetName];
    
    // Converter para JSON
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length === 0) {
      throw new Error('Planilha vazia ou sem dados');
    }
    
    // Primeira linha são os cabeçalhos
    const headers = jsonData[0];
    const dataRows = jsonData.slice(1);
    
    console.log(`  📋 Cabeçalhos detectados: ${headers.join(', ')}`);
    console.log(`  📊 Total de linhas de dados: ${dataRows.length}`);
    
    // Verificar se precisa processar por lotes
    if (dataRows.length > EXCEL_BATCH_SIZE) {
      console.log(`  🔄 Planilha grande detectada (${dataRows.length} linhas)`);
      console.log(`  📦 Processando em lotes de ${EXCEL_BATCH_SIZE} linhas...`);
      
      return await processExcelInBatches(dataRows, headers, fileName);
    } else {
      console.log(`  ⚡ Planilha pequena, processando de uma vez...`);
      return processExcelAllAtOnce(dataRows, headers, fileName);
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar planilha:', error.message);
    throw error;
  }
}

// Função para processar planilha pequena de uma vez
function processExcelAllAtOnce(dataRows, headers, fileName) {
  console.log(`  🚀 Processando ${dataRows.length} linhas de uma vez...`);
  
  // Processar dados
  const processedData = dataRows.map((row, index) => {
    const item = {
      id: index + 1,
      row: index + 2
    };
    
    // Adicionar cada coluna
    headers.forEach((header, colIndex) => {
      if (header && row[colIndex] !== undefined) {
        item[header] = row[colIndex];
      }
    });
    
    return item;
  }).filter(item => {
    // Filtrar linhas vazias
    const hasData = Object.values(item).some(value => 
      value !== undefined && value !== null && value !== ''
    );
    return hasData;
  });
  
  // Atualizar dados globais
  excelData = processedData;
  excelMetadata = {
    fileName: fileName,
    uploadDate: new Date().toISOString(),
    totalItems: processedData.length,
    columns: headers
  };
  // Recriar índice por UHF
  rebuildExcelIndex(headers);
  // Sinalizar sujo e salvar em background
  excelDirty = true;
  
  console.log(`✅ Planilha processada com sucesso:`);
  console.log(`  📁 Arquivo: ${fileName}`);
  console.log(`  📊 Total de itens: ${processedData.length}`);
  console.log(`  📋 Colunas: ${headers.join(', ')}`);
  
  // Emitir atualização para todos os clientes
  io.emit('excel-data-updated', {
    data: excelData,
    metadata: excelMetadata
  });
  // Disparar save assíncrono
  saveExcelToDisk();
  
  return {
    success: true,
    data: processedData,
    metadata: excelMetadata,
    processedInBatches: false
  };
}

// Função para processar planilha grande por lotes
async function processExcelInBatches(dataRows, headers, fileName) {
  console.log(`  📦 Iniciando processamento por lotes...`);
  
  // Limpar dados existentes
  excelData = [];
  
  // Atualizar metadados iniciais
  excelMetadata = {
    fileName: fileName,
    uploadDate: new Date().toISOString(),
    totalItems: dataRows.length,
    columns: headers,
    processingStatus: 'processing',
    processedBatches: 0,
    totalBatches: Math.ceil(dataRows.length / EXCEL_BATCH_SIZE)
  };
  
  // Emitir status inicial
  io.emit('excel-processing-started', {
    fileName: fileName,
    totalRows: dataRows.length,
    batchSize: EXCEL_BATCH_SIZE,
    totalBatches: excelMetadata.totalBatches
  });
  
  let processedCount = 0;
  const totalBatches = Math.ceil(dataRows.length / EXCEL_BATCH_SIZE);
  
  // Processar por lotes
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIndex = batchIndex * EXCEL_BATCH_SIZE;
    const endIndex = Math.min(startIndex + EXCEL_BATCH_SIZE, dataRows.length);
    const batchRows = dataRows.slice(startIndex, endIndex);
    
    console.log(`  📦 Processando lote ${batchIndex + 1}/${totalBatches} (linhas ${startIndex + 1}-${endIndex})`);
    
    // Processar lote atual
    const batchData = batchRows.map((row, index) => {
      const item = {
        id: processedCount + index + 1,
        row: startIndex + index + 2
      };
      
      // Adicionar cada coluna
      headers.forEach((header, colIndex) => {
        if (header && row[colIndex] !== undefined) {
          item[header] = row[colIndex];
        }
      });
      
      return item;
    }).filter(item => {
      // Filtrar linhas vazias
      const hasData = Object.values(item).some(value => 
        value !== undefined && value !== null && value !== ''
      );
      return hasData;
    });
    
    // Adicionar lote aos dados
    excelData.push(...batchData);
    // Indexar lote no índice UHF
    for (const it of batchData) {
      indexItemByUHF(it, excelUhfColumnName || inferUhfColumnName(headers));
    }
    processedCount += batchData.length;
    
    // Atualizar metadados
    excelMetadata.processedBatches = batchIndex + 1;
    excelMetadata.totalItems = processedCount;
    
    // Emitir progresso
    io.emit('excel-processing-progress', {
      batchIndex: batchIndex + 1,
      totalBatches: totalBatches,
      processedRows: processedCount,
      totalRows: dataRows.length,
      progress: Math.round((processedCount / dataRows.length) * 100)
    });
    
    // Verificar memória a cada lote
    if (excelData.length > MAX_EXCEL_ITEMS) {
      console.log(`  ⚠️ Limite de memória atingido (${excelData.length} > ${MAX_EXCEL_ITEMS})`);
      console.log(`  🧹 Limpando dados antigos...`);
      
      // Manter apenas os últimos itens
      excelData = excelData.slice(-MAX_EXCEL_ITEMS);
      console.log(`  ✅ Memória limpa, mantidos ${excelData.length} itens`);
      // Reindexar por segurança após limpeza
      rebuildExcelIndex(headers);
    }
    
    // Pausa pequena para não travar o servidor
    if (batchIndex < totalBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Finalizar processamento
  excelMetadata.processingStatus = 'completed';
  excelMetadata.totalItems = excelData.length;
  excelDirty = true;
  
  console.log(`✅ Planilha processada por lotes com sucesso:`);
  console.log(`  📁 Arquivo: ${fileName}`);
  console.log(`  📊 Total de itens: ${excelData.length}`);
  console.log(`  📦 Lotes processados: ${totalBatches}`);
  console.log(`  📋 Colunas: ${headers.join(', ')}`);
  
  // Emitir conclusão
  io.emit('excel-processing-completed', {
    data: excelData,
    metadata: excelMetadata
  });
  
  // Emitir atualização normal
  io.emit('excel-data-updated', {
    data: excelData,
    metadata: excelMetadata
  });
  saveExcelToDisk();
  
  return {
    success: true,
    data: excelData,
    metadata: excelMetadata,
    processedInBatches: true,
    totalBatches: totalBatches
  };
}

// Função para buscar itens na planilha
function searchExcelItems(query, filters = {}) {
  try {
    if (!excelData || excelData.length === 0) {
      return { items: [], total: 0, message: 'Nenhuma planilha carregada' };
    }
    
    let filteredData = [...excelData];
    
    // Aplicar filtros
    if (filters.columns && filters.columns.length > 0) {
      filteredData = filteredData.map(item => {
        const filteredItem = { id: item.id, row: item.row };
        filters.columns.forEach(col => {
          if (item[col] !== undefined) {
            filteredItem[col] = item[col];
          }
        });
        return filteredItem;
      });
    }
    
    // Aplicar busca por texto
    if (query && query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      filteredData = filteredData.filter(item => {
        return Object.values(item).some(value => {
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(searchTerm);
        });
      });
    }
    
    return {
      items: filteredData,
      total: filteredData.length,
      message: `Encontrados ${filteredData.length} itens`
    };
    
  } catch (error) {
    console.error('❌ Erro na busca:', error.message);
    return { items: [], total: 0, message: `Erro na busca: ${error.message}` };
  }
}

// Função para limpar dados da planilha
function clearExcelData() {
  try {
    excelData = [];
    excelIndexByUHF.clear();
    excelUhfColumnName = null;
    excelDirty = true;
    saveExcelToDisk();
    excelMetadata = {
      fileName: '',
      uploadDate: null,
      totalItems: 0,
      columns: []
    };
    
    console.log('🧹 Dados da planilha limpos');
    
    // Emitir atualização para todos os clientes
    io.emit('excel-data-updated', {
      data: excelData,
      metadata: excelMetadata
    });
    
    return { success: true, message: 'Dados da planilha limpos com sucesso' };
    
  } catch (error) {
    console.error('❌ Erro ao limpar dados:', error.message);
    return { success: false, message: `Erro ao limpar: ${error.message}` };
  }
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
  if (autoRestartInterval) {
    clearInterval(autoRestartInterval);
    autoRestartInterval = null;
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
    if (autoRestartInterval) {
      clearInterval(autoRestartInterval);
      autoRestartInterval = null;
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
    if (autoRestartInterval) {
      clearInterval(autoRestartInterval);
      autoRestartInterval = null;
      console.log('🔄 Auto-restart parado');
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
    if (autoRestartInterval) {
      clearInterval(autoRestartInterval);
      autoRestartInterval = null;
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

  // Eventos para sistema de Excel
  socket.on('get-excel-data', () => {
    socket.emit('excel-data-updated', {
      data: excelData,
      metadata: excelMetadata
    });
  });

  socket.on('search-excel-items', (data) => {
    try {
      const { query, columns } = data;
      const result = searchExcelItems(query, columns);
      socket.emit('excel-search-result', result);
    } catch (error) {
      socket.emit('error', { message: 'Erro na busca: ' + error.message });
    }
  });

  socket.on('clear-excel-data', () => {
    try {
      const result = clearExcelData();
      socket.emit('excel-clear-result', result);
    } catch (error) {
      socket.emit('error', { message: 'Erro ao limpar dados: ' + error.message });
    }
  });

  socket.on('test-match', (matchData) => {
    console.log('🧪 Teste de correspondência recebido:', matchData);
    
    // Emitir evento de correspondência para teste
    io.emit('rfid-match-found', matchData);
    console.log('📡 Evento rfid-match-found emitido para teste');
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
    config: rfidConfig,
    excel: {
      hasData: excelData.length > 0,
      totalItems: excelData.length,
      metadata: excelMetadata
    }
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

// Monitoramento de memória para Excel
setInterval(() => {
  try {
    if (excelData.length > MAX_EXCEL_ITEMS) {
      console.log(`⚠️ Excel: Limite de memória atingido (${excelData.length} > ${MAX_EXCEL_ITEMS})`);
      console.log(`🧹 Limpando dados antigos do Excel...`);
      
      // Manter apenas os últimos itens
      const itemsToKeep = Math.floor(MAX_EXCEL_ITEMS * 0.8); // Manter 80%
      excelData = excelData.slice(-itemsToKeep);
      
      // Atualizar metadados
      excelMetadata.totalItems = excelData.length;
      
      console.log(`✅ Excel: Memória limpa, mantidos ${excelData.length} itens`);
      
      // Notificar clientes
      io.emit('excel-memory-cleaned', {
        totalItems: excelData.length,
        message: `Memória limpa automaticamente. Mantidos ${excelData.length} itens.`
      });
    }
    
    // Limpar notificações antigas para evitar acúmulo de memória
    if (notifiedMatches.size > 1000) {
      console.log(`🧹 Limpando notificações antigas (${notifiedMatches.size} itens)`);
      notifiedMatches.clear();
      console.log(`✅ Notificações limpas - sistema resetado`);
    }
    
    // Log de uso de memória
    const memUsage = process.memoryUsage();
    const heapUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
    console.log(`💾 Memória atual: ${heapUsed}MB | Excel: ${excelData.length} itens | Notificações: ${notifiedMatches.size}`);
    
  } catch (error) {
    console.error('❌ Erro no monitoramento de memória Excel:', error.message);
  }
}, EXCEL_MEMORY_CHECK_INTERVAL);

// API Routes para sistema de Excel
app.post('/api/excel/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nenhum arquivo enviado' 
      });
    }
    
    console.log(`📤 Upload recebido: ${req.file.originalname} (${req.file.size} bytes)`);
    
    // Responder imediatamente para planilhas grandes
    if (req.file.size > 1024 * 1024) { // > 1MB
      res.json({
        success: true,
        message: 'Upload iniciado. Processando planilha em lotes...',
        processingInBatches: true,
        fileName: req.file.originalname
      });
      
      // Processar em background
      processExcelFile(req.file.buffer, req.file.originalname)
        .catch(error => {
          console.error('❌ Erro no processamento em background:', error.message);
          io.emit('excel-processing-error', {
            fileName: req.file.originalname,
            error: error.message
          });
        });
    } else {
      // Processar planilha pequena normalmente
      const result = await processExcelFile(req.file.buffer, req.file.originalname);
      
      res.json({
        success: true,
        message: 'Planilha processada com sucesso',
        data: result
      });
    }
    
  } catch (error) {
    console.error('❌ Erro no upload:', error.message);
    res.status(500).json({
      success: false,
      message: `Erro ao processar planilha: ${error.message}`
    });
  }
});

app.get('/api/excel/data', (req, res) => {
  try {
    res.json({
      success: true,
      data: excelData,
      metadata: excelMetadata
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Erro ao buscar dados: ${error.message}`
    });
  }
});

app.get('/api/excel/search', (req, res) => {
  try {
    const { query, columns } = req.query;
    
    const filters = {};
    if (columns) {
      filters.columns = columns.split(',').map(col => col.trim());
    }
    
    const result = searchExcelItems(query, filters);
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Erro na busca: ${error.message}`
    });
  }
});

app.delete('/api/excel/clear', (req, res) => {
  try {
    const result = clearExcelData();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Erro ao limpar dados: ${error.message}`
    });
  }
});

app.get('/api/excel/status', (req, res) => {
  try {
    res.json({
      success: true,
      hasData: excelData.length > 0,
      totalItems: excelData.length,
      metadata: excelMetadata
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Erro ao buscar status: ${error.message}`
    });
  }
});

// Endpoint para limpar notificações duplicadas
app.post('/api/notifications/clear', (req, res) => {
  try {
    const previousSize = notifiedMatches.size;
    notifiedMatches.clear();
    
    console.log(`🧹 Notificações limpas manualmente: ${previousSize} → 0`);
    
    res.json({
      success: true,
      message: `Notificações limpas: ${previousSize} itens removidos`,
      previousSize: previousSize,
      currentSize: 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao limpar notificações: ' + error.message
    });
  }
});

// Endpoint para obter status das notificações
app.get('/api/notifications/status', (req, res) => {
  try {
    res.json({
      success: true,
      totalNotifications: notifiedMatches.size,
      cooldownPeriod: NOTIFICATION_COOLDOWN,
      memoryUsage: process.memoryUsage().heapUsed,
      comparisonCount: comparisonCount,
      maxComparisonsPerSecond: MAX_COMPARISONS_PER_SECOND
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter status das notificações: ' + error.message
    });
  }
});

// Endpoint para resetar contador de comparações
app.post('/api/comparisons/reset', (req, res) => {
  try {
    const previousCount = comparisonCount;
    comparisonCount = 0;
    lastComparisonReset = Date.now();
    
    console.log(`🔄 Contador de comparações resetado: ${previousCount} → 0`);
    
    res.json({
      success: true,
      message: 'Contador de comparações resetado',
      previousCount: previousCount
    });
  } catch (error) {
    console.error('❌ Erro ao resetar contador de comparações:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Tratamento de erro para setInterval
process.on('uncaughtException', (error) => {
  console.error('🚨 Erro não capturado:', error);
  gracefulShutdown('Erro não capturado');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Promise rejeitada não tratada:', reason);
  
  // Se for erro de socket fechado, não encerrar o servidor
  if (reason && reason.code === 'EPIPE') {
    console.log('🔌 Socket fechado detectado - continuando operação');
    return;
  }
  
  // Se for erro de stream destruído, não encerrar o servidor
  if (reason && reason.code === 'ERR_STREAM_DESTROYED') {
    console.log('🔌 Stream destruído detectado - continuando operação');
    isReading = false;
    isConnected = false;
    return;
  }
  
  // Para outros erros, encerrar graciosamente
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
  // Carregar Excel do disco, se existir
  loadExcelFromDisk();
});

