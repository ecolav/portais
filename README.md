# 🏷️ Portal RFID - Sistema de Leitura de Tags

Sistema moderno para leitura de tags RFID desenvolvido em **TypeScript** com **React**, interface responsiva e funcionalidades avançadas.

## ✨ Funcionalidades

- **🔌 Configuração de Leitor RFID**: IP, porta, timeout e tentativas
- **📡 Controle de Conexão**: Conectar/desconectar e iniciar/parar leitura
- **📁 Upload de Excel**: Carregamento de dados das peças via arquivos .xlsx/.xls
- **🔊 Configuração de Áudio**: Controle de volume e sons configuráveis
- **📊 Estatísticas em Tempo Real**: Contadores de tags lidas, únicas e duplicatas
- **🔍 Lista de Tags com Filtros**: Busca, filtros por status e exportação CSV
- **🎨 Interface Moderna**: Design responsivo com Tailwind CSS e animações
- **📱 Responsivo**: Funciona perfeitamente em desktop e dispositivos móveis

## 🚀 Tecnologias

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Icons**: Lucide React
- **State Management**: React Context + useReducer
- **Routing**: React Router DOM

## 📦 Instalação

### Pré-requisitos
- Node.js 16+ 
- npm ou yarn

### Passos de Instalação

1. **Clone o projeto**
   ```bash
   git clone <url-do-repositorio>
   cd portal-rfid-typescript
   ```

2. **Instale as dependências**
   ```bash
   npm install
   # ou
   yarn install
   ```

3. **Execute em modo desenvolvimento**
   ```bash
   npm run dev
   # ou
   yarn dev
   ```

4. **Acesse a aplicação**
   ```
   http://localhost:3000
   ```

## 🎯 Como Usar

### 1. Configuração do Leitor
- Configure o IP e porta do seu leitor RFID
- Defina timeout e número de tentativas
- Clique em "Salvar Configuração"

### 2. Carregamento de Peças
- Baixe o template CSV para ver o formato esperado
- Prepare seu arquivo Excel com as colunas:
  - `piece_number`: Número da peça
  - `piece_name`: Nome da peça
  - `epc`: Código EPC da tag RFID
  - `category`: Categoria (opcional)
  - `description`: Descrição (opcional)
- Faça upload do arquivo

### 3. Controle de Leitura
- Clique em "Conectar" para estabelecer conexão
- Clique em "Iniciar Leitura" para começar
- Monitore as tags lidas em tempo real
- Use "Parar Leitura" para interromper

### 4. Configuração de Áudio
- Ative/desative sons conforme necessário
- Ajuste o volume
- Teste os sons disponíveis

## 📁 Estrutura do Projeto

```
src/
├── components/           # Componentes React
│   ├── panels/          # Painéis específicos
│   │   ├── ReaderConfigPanel.tsx
│   │   ├── ControlPanel.tsx
│   │   ├── ExcelUploadPanel.tsx
│   │   ├── AudioConfigPanel.tsx
│   │   ├── StatsPanel.tsx
│   │   └── TagsListPanel.tsx
│   ├── Header.tsx       # Cabeçalho da aplicação
│   ├── Dashboard.tsx    # Dashboard principal
│   └── ToastContainer.tsx # Sistema de notificações
├── contexts/            # Contextos React
│   ├── RFIDContext.tsx  # Estado global RFID
│   └── NotificationContext.tsx # Sistema de notificações
├── types/               # Definições TypeScript
│   └── index.ts         # Interfaces e tipos
├── App.tsx              # Componente principal
├── main.tsx             # Ponto de entrada
└── index.css            # Estilos globais
```

## 🔧 Scripts Disponíveis

- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Constrói para produção
- `npm run preview` - Visualiza build de produção
- `npm run lint` - Executa linter ESLint

## 🎨 Personalização

### Cores e Tema
- Modifique `tailwind.config.js` para alterar cores
- Ajuste `src/index.css` para estilos globais
- Use as classes utilitárias do Tailwind CSS

### Componentes
- Todos os componentes estão em `src/components/`
- Use TypeScript para type safety
- Siga o padrão de nomenclatura estabelecido

## 🔌 Integração com Leitor RFID

Para integrar com um leitor RFID real:

1. **Modifique o contexto RFID** (`src/contexts/RFIDContext.tsx`)
2. **Implemente as funções de conexão** reais
3. **Adicione WebSocket** para comunicação em tempo real
4. **Configure os endpoints da API** do seu leitor

## 📱 Responsividade

A aplicação é totalmente responsiva e funciona em:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (até 767px)

## 🚨 Solução de Problemas

### Erro de Build
```bash
npm run build
# Verifique se todas as dependências estão instaladas
```

### Erro de TypeScript
```bash
npm run lint
# Corrija os erros de tipo antes de prosseguir
```

### Problemas de Dependências
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📝 Licença

Este projeto é de código aberto e pode ser usado livremente para fins educacionais e comerciais.

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para:
- Reportar bugs
- Sugerir novas funcionalidades
- Enviar pull requests
- Melhorar a documentação

## 📞 Suporte

Para suporte técnico ou dúvidas:
- Abra uma issue no repositório
- Entre em contato com a equipe de desenvolvimento

---

**Desenvolvido com ❤️ em TypeScript + React para sistemas RFID industriais**
