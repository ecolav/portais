#!/usr/bin/env node

/**
 * Script de teste direto para diagnosticar leitores RFID Chainway
 * Testa conexão, comandos e recepção de dados
 */

const { chainwayApi } = require('chainway-rfid');

// CONFIGURAÇÃO - MUDE AQUI O IP DO LEITOR QUE QUER TESTAR
const LEITOR_IP = process.argv[2] || '192.168.99.201';
const LEITOR_PORT = 8888;

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║   TESTE DIRETO DE LEITOR RFID CHAINWAY               ║');
console.log('╚═══════════════════════════════════════════════════════╝');
console.log('');
console.log(`🎯 Leitor: ${LEITOR_IP}:${LEITOR_PORT}`);
console.log('');

let tagsDetectadas = 0;
let testTimeout = null;

async function testarLeitor() {
  try {
    // PASSO 1: Conectar
    console.log('📡 PASSO 1: Conectando ao leitor...');
    await chainwayApi.connect(LEITOR_IP, LEITOR_PORT);
    console.log('✅ Conectado com sucesso!');
    console.log('');
    
    // PASSO 2: Registrar callback ANTES de enviar comandos
    console.log('📡 PASSO 2: Registrando callback para receber dados...');
    chainwayApi.received((data) => {
      tagsDetectadas++;
      console.log(`\n🏷️  TAG #${tagsDetectadas} DETECTADA:`);
      console.log(`   TID: ${data.tid || 'N/A'}`);
      console.log(`   EPC: ${data.epc || 'N/A'}`);
      console.log(`   Antena: ${data.ant || 0}`);
      console.log(`   RSSI: ${data.rssi || 'N/A'}`);
    });
    
    // Listener RAW para debug
    if (chainwayApi.client) {
      chainwayApi.client.on('data', (rawBuffer) => {
        console.log(`📦 BUFFER RAW: ${rawBuffer.toString('hex').toUpperCase()}`);
      });
    }
    console.log('✅ Callback registrado!');
    console.log('');
    
    // PASSO 3: Enviar comando RESET
    console.log('📡 PASSO 3: Enviando comando RESET...');
    try {
      const resetCommand = Buffer.from([0xA5, 0x5A, 0x00, 0x07, 0x70, 0x77, 0x0D, 0x0A]);
      await chainwayApi.send(resetCommand);
      console.log('✅ RESET enviado');
      await sleep(500);
    } catch (err) {
      console.log('⚠️  RESET falhou (não crítico):', err.message);
    }
    console.log('');
    
    // PASSO 4: Configurar POTÊNCIA
    console.log('📡 PASSO 4: Configurando potência (20 dBm)...');
    const powerByte = 20;
    const powerChecksum = (0x82 + 0x27 + powerByte) & 0xFF;
    const powerCommand = Buffer.from([0xA5, 0x5A, 0x00, 0x08, 0x82, 0x27, powerByte, powerChecksum, 0x0D, 0x0A]);
    await chainwayApi.send(powerCommand);
    console.log('✅ Potência configurada');
    await sleep(300);
    console.log('');
    
    // PASSO 5: Configurar ANTENAS
    console.log('📡 PASSO 5: Configurando antenas (1, 2, 3, 4)...');
    const antennaMask = 0x0F; // 0000 1111 = todas as 4 antenas
    const antennaChecksum = (0x82 + 0x28 + antennaMask) & 0xFF;
    const antennaCommand = Buffer.from([0xA5, 0x5A, 0x00, 0x08, 0x82, 0x28, antennaMask, antennaChecksum, 0x0D, 0x0A]);
    await chainwayApi.send(antennaCommand);
    console.log('✅ Antenas configuradas');
    await sleep(300);
    console.log('');
    
    // PASSO 6: Iniciar LEITURA
    console.log('📡 PASSO 6: Iniciando leitura (startScan)...');
    const startScanCommand = Buffer.from([0xA5, 0x5A, 0x00, 0x0A, 0x82, 0x27, 0x10, 0xBF, 0x0D, 0x0A]);
    await chainwayApi.send(startScanCommand);
    console.log('✅ Comando startScan enviado');
    console.log('');
    
    // PASSO 7: Aguardar leituras
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║   AGUARDANDO LEITURAS POR 15 SEGUNDOS...            ║');
    console.log('║   Coloque tags em cima da antena AGORA!             ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('');
    
    // Aguardar 15 segundos
    testTimeout = setTimeout(async () => {
      console.log('');
      console.log('⏰ Tempo esgotado!');
      console.log('');
      console.log('╔═══════════════════════════════════════════════════════╗');
      console.log('║   RESULTADO DO TESTE                                 ║');
      console.log('╚═══════════════════════════════════════════════════════╝');
      console.log(`📊 Tags detectadas: ${tagsDetectadas}`);
      console.log('');
      
      if (tagsDetectadas > 0) {
        console.log('✅ SUCESSO! Leitor está funcionando e lendo tags!');
      } else {
        console.log('❌ FALHA! Leitor não detectou nenhuma tag.');
        console.log('');
        console.log('Possíveis causas:');
        console.log('  1. Tags não estão próximas da antena');
        console.log('  2. Tags incompatíveis (frequência/protocolo)');
        console.log('  3. Antena desconectada');
        console.log('  4. Leitor precisa ser configurado via software oficial');
      }
      console.log('');
      
      // Parar leitura
      try {
        const stopCommand = Buffer.from([0xA5, 0x5A, 0x00, 0x08, 0x82, 0x26, 0xA8, 0x0D, 0x0A]);
        await chainwayApi.send(stopCommand);
        console.log('🛑 Leitura parada');
      } catch (err) {
        console.log('⚠️  Erro ao parar leitura:', err.message);
      }
      
      // Desconectar
      await chainwayApi.disconnect();
      console.log('👋 Desconectado');
      process.exit(0);
    }, 15000);
    
  } catch (error) {
    console.error('');
    console.error('❌ ERRO FATAL:', error.message);
    console.error('');
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Executar teste
testarLeitor();

// Handler para Ctrl+C
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Teste interrompido pelo usuário');
  if (testTimeout) clearTimeout(testTimeout);
  try {
    await chainwayApi.disconnect();
  } catch (err) {}
  process.exit(0);
});

