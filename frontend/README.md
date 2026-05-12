# Frontend Web

Este frontend foi migrado de Expo/React Native para React web com Vite e Bootstrap.

## Como executar

1. Instale as dependencias:

```bash
npm install
```

2. Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

3. Gere o build de producao:

```bash
npm run build
```

## Backend

Por padrao, o frontend tenta acessar o backend em `http://<host-atual>:8001`.

Se quiser apontar para outro endereco, crie um arquivo `.env` na pasta `frontend` com:

```bash
VITE_BACKEND_URL=http://SEU_BACKEND:8001
```
