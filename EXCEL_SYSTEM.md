# 📊 Sistema de Upload e Armazenamento Excel - Documentação

## **📋 Visão Geral**

Sistema completo para upload, processamento e armazenamento de planilhas Excel na memória do servidor, com interface web para visualização, busca e exportação dos dados.

## **🎯 Funcionalidades Implementadas**

### **1. Upload de Planilhas**
- **Formatos suportados**: `.xlsx` e `.xls`
- **Tamanho máximo**: 10MB
- **Validação**: Apenas arquivos Excel são aceitos
- **Processamento**: Conversão automática para JSON

### **2. Armazenamento na Memória**
- **Localização**: Servidor Node.js
- **Estrutura**: Array de objetos com metadados
- **Persistência**: Durante sessão do servidor
- **Limpeza**: Função para limpar dados

### **3. Visualização e Busca**
- **Tabela dinâmica**: Exibe todos os dados da planilha
- **Busca por texto**: Pesquisa em todas as colunas
- **Filtros de colunas**: Seleção de colunas para exibição
- **Paginação**: 20 itens por página

### **4. Exportação e Gestão**
- **Exportar CSV**: Dados filtrados em formato CSV
- **Limpar dados**: Remove todos os dados da memória
- **Metadados**: Informações sobre arquivo e upload

## **🔧 Implementação Técnica**

### **Backend (Node.js)**

#### **Dependências**
```javascript
const multer = require('multer');        // Upload de arquivos
const xlsx = require('xlsx');            // Processamento Excel
```

#### **Configuração Multer**
```javascript
const upload = multer({
  storage: multer.memoryStorage(),       // Armazenamento em memória
  limits: {
    fileSize: 10 * 1024 * 1024,         // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Validação de tipo de arquivo
  }
});
```

#### **Estrutura de Dados**
```javascript
// Dados da planilha
let excelData = [];

// Metadados
let excelMetadata = {
  fileName: '',
  uploadDate: null,
  totalItems: 0,
  columns: []
};
```

#### **Funções Principais**
- **`processExcelFile()`**: Processa arquivo Excel
- **`searchExcelItems()`**: Busca e filtra dados
- **`clearExcelData()`**: Limpa dados da memória

### **Frontend (React + TypeScript)**

#### **Hook Personalizado**
```typescript
// src/hooks/useSocket.ts
export function useSocket() {
  // Gerencia conexão Socket.IO
  // Retorna instância do socket
}
```

#### **Componente Principal**
```typescript
// src/components/panels/ExcelUploadPanel.tsx
const ExcelUploadPanel: React.FC = () => {
  // Estado local
  // Eventos Socket.IO
  // Interface de usuário
}
```

## **📡 APIs REST Implementadas**

### **1. Upload de Arquivo**
```http
POST /api/excel/upload
Content-Type: multipart/form-data

file: [arquivo Excel]
```

**Resposta:**
```json
{
  "success": true,
  "message": "Planilha processada com sucesso",
  "data": {
    "success": true,
    "data": [...],
    "metadata": {...}
  }
}
```

### **2. Buscar Dados**
```http
GET /api/excel/data
```

**Resposta:**
```json
{
  "success": true,
  "data": [...],
  "metadata": {...}
}
```

### **3. Busca com Filtros**
```http
GET /api/excel/search?query=texto&columns=col1,col2
```

**Parâmetros:**
- `query`: Texto para busca
- `columns`: Colunas específicas (opcional)

### **4. Limpar Dados**
```http
DELETE /api/excel/clear
```

### **5. Status do Sistema**
```http
GET /api/excel/status
```

## **🔌 Eventos Socket.IO**

### **Cliente → Servidor**
- **`get-excel-data`**: Solicita dados atuais
- **`search-excel-items`**: Busca com filtros
- **`clear-excel-data`**: Limpa dados

### **Servidor → Cliente**
- **`excel-data-updated`**: Dados atualizados
- **`excel-search-result`**: Resultado da busca
- **`excel-clear-result`**: Confirmação de limpeza

## **📊 Processamento de Planilhas**

### **Fluxo de Processamento**
```
1. Upload do arquivo → Multer
2. Leitura do buffer → xlsx.read()
3. Conversão para JSON → sheet_to_json()
4. Processamento dos dados → Mapeamento e filtros
5. Armazenamento na memória → excelData
6. Atualização de metadados → excelMetadata
7. Notificação via Socket.IO → excel-data-updated
```

### **Estrutura dos Dados Processados**
```javascript
{
  id: 1,                    // ID único
  row: 2,                   // Número da linha na planilha
  [coluna1]: "valor1",      // Dados das colunas
  [coluna2]: "valor2",
  // ... outras colunas
}
```

## **🔍 Sistema de Busca e Filtros**

### **Busca por Texto**
- **Escopo**: Todas as colunas
- **Case-insensitive**: Não diferencia maiúsculas/minúsculas
- **Busca parcial**: Encontra correspondências parciais

### **Filtros de Colunas**
- **Seleção múltipla**: Checkboxes para cada coluna
- **Exibição condicional**: Mostra apenas colunas selecionadas
- **Padrão**: Todas as colunas se nenhuma selecionada

### **Paginação**
- **Itens por página**: 20
- **Navegação**: Anterior/Próxima + números de página
- **Responsivo**: Adapta para dispositivos móveis

## **📱 Interface do Usuário**

### **Área de Upload**
- **Drag & Drop**: Interface intuitiva
- **Validação visual**: Feedback imediato
- **Progresso**: Indicador de processamento

### **Informações da Planilha**
- **Metadados**: Nome, data, total de itens, colunas
- **Layout responsivo**: Grid adaptativo
- **Cores**: Esquema azul para destaque

### **Tabela de Dados**
- **Cabeçalhos dinâmicos**: Baseados nas colunas da planilha
- **Linhas numeradas**: ID e número da linha
- **Hover effects**: Destaque visual nas linhas

### **Controles de Ação**
- **Exportar CSV**: Botão verde para download
- **Limpar Dados**: Botão vermelho com confirmação
- **Filtros**: Botão para mostrar/ocultar filtros

## **⚡ Performance e Otimização**

### **Memória**
- **Armazenamento eficiente**: Apenas dados necessários
- **Limpeza automática**: Função para liberar memória
- **Tamanho limitado**: Máximo de 10MB por arquivo

### **Processamento**
- **Streaming**: Processamento em chunks
- **Async/Await**: Operações não-bloqueantes
- **Error handling**: Tratamento robusto de erros

### **Interface**
- **Virtualização**: Paginação para grandes datasets
- **Debounce**: Busca otimizada
- **Lazy loading**: Carregamento sob demanda

## **🛡️ Segurança e Validação**

### **Validação de Arquivos**
- **Tipo MIME**: Verificação de formato
- **Extensão**: Validação por extensão
- **Tamanho**: Limite de 10MB

### **Sanitização de Dados**
- **Filtros**: Remoção de linhas vazias
- **Escape**: Tratamento de caracteres especiais
- **Validação**: Verificação de estrutura

### **Controle de Acesso**
- **CORS**: Configurado para desenvolvimento
- **Rate limiting**: Proteção contra spam
- **Validação**: Verificação de parâmetros

## **📈 Casos de Uso**

### **1. Inventário**
- **Upload**: Planilha com produtos
- **Busca**: Encontrar itens específicos
- **Export**: Relatório filtrado

### **2. Controle de Estoque**
- **Dados**: Códigos, quantidades, locais
- **Filtros**: Por categoria, fornecedor
- **Atualização**: Upload de nova planilha

### **3. Relatórios**
- **Agregação**: Dados consolidados
- **Filtros**: Períodos, departamentos
- **Export**: Formatos para análise

## **🔧 Configuração e Personalização**

### **Variáveis de Ambiente**
```javascript
// Tamanho máximo do arquivo
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Itens por página
const ITEMS_PER_PAGE = 20;

// Formato de data
const DATE_FORMAT = 'DD/MM/YYYY';
```

### **Personalização de Interface**
- **Temas**: Cores e estilos
- **Layout**: Disposição dos elementos
- **Idiomas**: Suporte multi-idioma

## **📝 Logs e Monitoramento**

### **Logs do Servidor**
```
📤 Upload recebido: planilha.xlsx (245760 bytes)
📊 Processando planilha: planilha.xlsx
✅ Planilha processada com sucesso:
  📁 Arquivo: planilha.xlsx
  📊 Total de itens: 150
  📋 Colunas: Código, Nome, Quantidade, Preço
```

### **Monitoramento**
- **Uploads**: Contagem e tamanho
- **Processamento**: Tempo e sucesso
- **Uso de memória**: Consumo de recursos

## **🚀 Próximos Passos e Melhorias**

### **Funcionalidades Futuras**
- **Persistência**: Banco de dados para dados
- **Histórico**: Múltiplas versões de planilhas
- **Validação**: Regras de negócio customizáveis
- **Sincronização**: Múltiplos usuários

### **Otimizações**
- **Cache**: Redis para performance
- **Compressão**: Arquivos grandes
- **Streaming**: Processamento em tempo real
- **Web Workers**: Processamento no frontend

### **Integrações**
- **APIs externas**: Validação de dados
- **Notificações**: Email/SMS
- **Backup**: Sincronização com cloud
- **Auditoria**: Log de todas as operações

## **✅ Conclusão**

O sistema de Excel implementado oferece:

- **📤 Upload robusto** de planilhas Excel
- **💾 Armazenamento eficiente** na memória
- **🔍 Busca e filtros** avançados
- **📱 Interface responsiva** e intuitiva
- **📊 Visualização completa** dos dados
- **📥 Exportação** em formato CSV
- **🔌 Comunicação em tempo real** via Socket.IO

A solução é **escalável**, **segura** e **fácil de usar**, proporcionando uma experiência completa para gestão de dados de planilhas Excel em aplicações web.

---

**Versão**: 1.0  
**Data**: $(date)  
**Autor**: Sistema de Excel  
**Status**: ✅ Implementado e Testado
