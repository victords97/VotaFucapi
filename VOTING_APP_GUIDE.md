# 🗳️ Sistema de Votação - XXI Feira Tecnológica Fucapi

## 📱 Aplicativo de Votação com Reconhecimento Facial

Sistema completo de votação para feira tecnológica com reconhecimento facial, pré-cadastro automático e painel administrativo em tempo real.

---

## ✨ Funcionalidades Principais

### 🎯 Fluxo de Votação (Totem)
1. **Tela Inicial** - Design moderno com título da feira e botão "Iniciar Votação"
2. **Captura Facial** - Câmera frontal com guia visual para posicionamento do rosto
3. **Reconhecimento Automático**:
   - Se o rosto for reconhecido: redireciona para votação
   - Se o rosto não for encontrado: vai para pré-cadastro
4. **Pré-Cadastro** (se necessário):
   - Nome Completo
   - CPF (formatação automática)
   - Telefone (formatação automática)
5. **Tela de Votação**:
   - Cards visuais com fotos dos projetos
   - Informações: Nome da Turma, Nome do Projeto, Número da Barraca
   - Toque no card para votar
6. **Confirmação**:
   - Mensagem de sucesso ou erro
   - Redirecionamento automático para tela inicial (5 segundos)

### 🔒 Segurança
- ✅ Cada pessoa vota apenas uma vez (validação por reconhecimento facial)
- ✅ Mensagem de aviso caso tente votar novamente
- ✅ CPF único no sistema (não permite duplicatas)

### 👨‍💼 Painel Administrativo
- **Login**: Senha de administrador
- **Dashboard em Tempo Real**:
  - Total de votos
  - Número de projetos
  - Classificação com ranking
  - Atualização automática a cada 5 segundos
  - Gráficos de porcentagem
- **Gerenciamento de Turmas**:
  - Cadastrar novos projetos
  - Upload de fotos
  - Excluir projetos
  - Visualizar número de votos

---

## 🔑 Credenciais de Acesso

### Painel Administrativo
- **Senha padrão inicial**: `fucapi2025`
- **Acesso**: Tela inicial → "Painel Administrativo" → Inserir senha
- **⚠️ IMPORTANTE**: Após o primeiro login, é **altamente recomendado** trocar a senha padrão
- **Trocar senha**: Dashboard → Botão "Trocar Senha"
- **Requisitos da nova senha**: Mínimo 6 caracteres
- **Segurança**: Senhas são armazenadas com hash bcrypt no banco de dados

---

## 🛠️ Tecnologias Utilizadas

### Backend
- **FastAPI** - Framework Python moderno e rápido
- **DeepFace** - Reconhecimento facial com modelo Facenet
- **OpenCV** - Processamento de imagens
- **MongoDB** - Banco de dados NoSQL
- **Python 3.11**

### Frontend
- **React Native** (Expo)
- **Expo Router** - Navegação baseada em arquivos
- **Expo Camera** - Captura de imagens
- **Expo Image Picker** - Seleção de fotos da galeria
- **Axios** - Requisições HTTP
- **AsyncStorage** - Armazenamento local
- **LinearGradient** - Gradientes visuais

---

## 📐 Estrutura do Projeto

```
/app
├── backend/
│   ├── server.py          # API FastAPI com todos os endpoints
│   ├── requirements.txt   # Dependências Python
│   └── .env              # Variáveis de ambiente
│
├── frontend/
│   ├── app/
│   │   ├── index.tsx           # Tela inicial
│   │   ├── camera.tsx          # Captura facial
│   │   ├── register.tsx        # Pré-cadastro
│   │   ├── voting.tsx          # Tela de votação
│   │   ├── success.tsx         # Confirmação de voto
│   │   └── admin/
│   │       ├── login.tsx       # Login administrativo
│   │       ├── dashboard.tsx   # Dashboard com resultados
│   │       └── turmas.tsx      # Gerenciamento de turmas
│   │
│   ├── app.json           # Configuração do Expo
│   └── package.json       # Dependências JavaScript
│
└── VOTING_APP_GUIDE.md    # Este arquivo
```

---

## 🚀 APIs Disponíveis

### Endpoints Públicos
- `GET /api/` - Health check
- `POST /api/verify-face` - Verificar se rosto existe no banco
- `POST /api/register` - Cadastrar novo usuário com face
- `GET /api/turmas` - Listar todas as turmas disponíveis
- `POST /api/vote` - Registrar voto

### Endpoints Administrativos
- `POST /api/admin/login` - Autenticar administrador
- `POST /api/admin/change-password` - Trocar senha do administrador
- `POST /api/admin/turmas` - Criar nova turma
- `GET /api/admin/turmas` - Listar turmas (admin)
- `DELETE /api/admin/turmas/{id}` - Excluir turma
- `GET /api/admin/results` - Obter resultados em tempo real

---

## 💾 Estrutura do Banco de Dados (MongoDB)

### Coleção: `usuarios`
```json
{
  "_id": "ObjectId",
  "nome": "João Silva",
  "cpf": "12345678901",
  "telefone": "92999999999",
  "face_image": "base64_encoded_string",
  "ja_votou": false,
  "created_at": "2025-01-XX..."
}
```

### Coleção: `turmas`
```json
{
  "_id": "ObjectId",
  "nome_turma": "Turma A",
  "nome_projeto": "Robô Autônomo",
  "numero_barraca": "101",
  "foto_base64": "base64_encoded_string",
  "votos_count": 15,
  "created_at": "2025-01-XX..."
}
```

### Coleção: `votos`
```json
{
  "_id": "ObjectId",
  "usuario_id": "user_id",
  "turma_id": "turma_id",
  "timestamp": "2025-01-XX..."
}
```

---

## 📱 Permissões Necessárias

### Android
- ✅ CAMERA
- ✅ READ_EXTERNAL_STORAGE
- ✅ WRITE_EXTERNAL_STORAGE
- ✅ READ_MEDIA_IMAGES

### iOS
- ✅ Camera (NSCameraUsageDescription)
- ✅ Photo Library (NSPhotoLibraryUsageDescription)

---

## 🎨 Design e UX

### Paleta de Cores
- **Primary**: #667eea (Roxo/Azul)
- **Secondary**: #764ba2 (Roxo escuro)
- **Success**: #10b981 (Verde)
- **Error**: #ef4444 (Vermelho)
- **Background**: #f5f5f5 (Cinza claro)
- **Dark**: #1f2937 (Cinza escuro)

### Características de Design
- ✨ Gradientes modernos
- 📱 Interface touch-friendly (botões grandes)
- 🎭 Animações suaves
- 🖼️ Cards com fotos e overlay
- 📊 Visualização de dados em tempo real
- 🌙 Design moderno e profissional

---

## 🔧 Como Usar no Totem

1. **Configurar o Tablet/Dispositivo**:
   - Instalar o app Expo Go
   - Escanear o QR Code fornecido
   - Configurar tela em modo retrato
   - Ativar modo "Kiosk" (opcional, para bloquear saída do app)

2. **Iniciar o Sistema**:
   - Abrir o aplicativo
   - Posicionar em local com boa iluminação
   - Testar a câmera frontal

3. **Fluxo do Usuário**:
   - Usuário toca em "Iniciar Votação"
   - Posiciona o rosto na câmera
   - Sistema reconhece ou solicita cadastro
   - Usuário vota no projeto preferido
   - Sistema confirma e retorna à tela inicial

---

## 📊 Monitoramento e Gestão

### Dashboard Administrativo
- Acesse através do botão "Painel Administrativo" na tela inicial
- Visualize resultados em tempo real
- Monitore o total de votos
- Veja o ranking dos projetos

### Gerenciar Projetos
- Adicionar novos projetos durante o evento
- Fazer upload de fotos dos projetos
- Remover projetos se necessário

---

## 🧪 Testes Realizados

### Backend (✅ 100% Testado)
- ✅ Health check
- ✅ Criação de turmas
- ✅ Listagem de turmas
- ✅ Cadastro de usuários com face
- ✅ Verificação facial (DeepFace)
- ✅ Sistema de votação
- ✅ Prevenção de voto duplicado
- ✅ Resultados em tempo real
- ✅ Exclusão de turmas
- ✅ Validações (CPF duplicado, etc.)

---

## 🎯 Próximos Passos Sugeridos

1. **Testar no Dispositivo Real**:
   - Usar Expo Go para testar em tablet Android
   - Verificar funcionamento da câmera
   - Testar reconhecimento facial com pessoas reais

2. **Preparação para Produção**:
   - Criar build APK para instalação direta
   - Configurar modo kiosk no Android
   - Ajustar iluminação no local do totem

3. **Melhorias Opcionais**:
   - Adicionar estatísticas detalhadas
   - Exportar resultados em PDF
   - Adicionar animações de transição
   - Implementar modo offline

---

## 📞 Suporte

Sistema desenvolvido para a **XXI Feira Tecnológica Fucapi**

### Informações Técnicas
- **Backend**: http://localhost:8001/api
- **Frontend**: Expo Tunnel URL
- **Banco de Dados**: MongoDB (local)

---

## ✅ Checklist de Implantação

- [ ] Backend rodando e acessível
- [ ] MongoDB configurado
- [ ] Expo app instalado no tablet
- [ ] Câmera frontal testada
- [ ] Iluminação adequada
- [ ] Projetos cadastrados no admin
- [ ] Senha administrativa definida
- [ ] Teste completo do fluxo de votação
- [ ] Backup do banco de dados configurado

---

**🎉 Sistema pronto para uso na feira tecnológica!**
