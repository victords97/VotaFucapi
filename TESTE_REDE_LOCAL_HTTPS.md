# Teste Em Rede Local Com Camera

Este fluxo e o mais confiavel para os notebooks da rede local.

## Objetivo

- servidor central no notebook principal
- frontend em HTTPS local
- backend FastAPI na mesma maquina
- notebooks clientes acessando pela rede
- camera liberada no navegador por certificado confiavel

## 1. No servidor

### 1.1 Suba o backend em modo LAN

No PowerShell:

```powershell
cd C:\Users\Samsung\Desktop\VotaFucapi-main\backend
.\start-backend-lan.ps1
```

Se quiser reduzir carga inicial, teste primeiro com:

```powershell
.\start-backend-lan.ps1 -Workers 1
```

### 1.2 Gere o build do frontend

```powershell
cd C:\Users\Samsung\Desktop\VotaFucapi-main\frontend
npm run build
```

### 1.3 Suba o frontend com HTTPS local

```powershell
cd C:\Users\Samsung\Desktop\VotaFucapi-main
.\start-frontend-https.ps1
```

O script detecta o IP local automaticamente e mostra a URL da rede.

Exemplo:

```text
https://192.168.0.157
```

### 1.4 Exporte o certificado raiz do Caddy

```powershell
cd C:\Users\Samsung\Desktop\VotaFucapi-main
.\export-caddy-root-cert.ps1
```

Isso gera:

```text
certs\caddy-local-root.crt
```

Copie esse arquivo para cada notebook cliente.

## 2. Em cada notebook cliente

### 2.1 Instale o certificado

No PowerShell:

```powershell
cd C:\caminho\onde\esta\o\certificado
powershell -ExecutionPolicy Bypass -File "C:\Users\Samsung\Desktop\VotaFucapi-main\install-caddy-root-cert.ps1" -CertPath ".\caddy-local-root.crt"
```

Se preferir, copie o certificado para `certs\caddy-local-root.crt` dentro do projeto e rode:

```powershell
cd C:\Users\Samsung\Desktop\VotaFucapi-main
.\install-caddy-root-cert.ps1
```

### 2.2 Feche e reabra o navegador

Feche todas as janelas do Chrome ou Edge antes do teste.

### 2.3 Abra a aplicacao

Use a URL exibida no servidor, por exemplo:

```text
https://192.168.0.157
```

## 3. Testes recomendados

1. Teste `https://IP_DO_SERVIDOR/api/` no notebook cliente.
2. Teste a home.
3. Teste a camera.
4. Teste login admin.
5. Teste fluxo de votacao.

## 4. Se a camera ainda falhar

- confirme que o certificado foi instalado no notebook cliente
- confirme que o navegador foi totalmente fechado e reaberto
- confirme que a URL esta em `https://`
- confirme que o backend esta ativo na porta `8001`
- confirme que o Caddy continua rodando no servidor
- confirme que o firewall do Windows permite entrada na porta `443`

## 5. Observacoes importantes

- `http://IP:5173` pode abrir o sistema, mas nao e o caminho mais confiavel para camera em rede local
- para o evento, prefira o frontend buildado com HTTPS local
- se os notebooks tiverem hardware mais fraco, teste primeiro com poucos acessos simultaneos
