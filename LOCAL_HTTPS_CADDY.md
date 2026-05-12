# HTTPS local com Caddy

Este projeto pode ser servido em HTTPS local com Caddy para permitir o uso de câmera no celular pela rede.

## 1. Gerar o build do frontend

```powershell
cd frontend
npm run build
```

## 2. Instalar o Caddy no Windows

Opcao com `winget`:

```powershell
winget install CaddyServer.Caddy
```

Depois feche e abra o terminal novamente.

## 3. Iniciar o backend

```powershell
cd backend
.\start-backend.ps1
```

## 4. Iniciar o frontend HTTPS

Na raiz do projeto:

```powershell
.\start-frontend-https.ps1
```

## 5. Confiar no certificado local do Caddy no notebook

Se o Caddy nao conseguir instalar automaticamente a CA local, rode:

```powershell
caddy trust
```

## 6. Abrir no notebook

```text
https://localhost
```

## 7. Abrir no celular

```text
https://192.168.0.157
```

## 8. Importante sobre o celular

O celular precisa confiar no certificado raiz local do Caddy. Sem isso:

- o navegador mostrara aviso de certificado
- a camera pode continuar bloqueada

Se acontecer, sera preciso exportar e instalar o certificado raiz do Caddy no celular.

## 9. Onde fica o certificado raiz do Caddy

Normalmente fica no perfil do usuario, dentro da pasta de dados do Caddy, em caminho parecido com:

```text
%AppData%\Caddy\pki\authorities\local\root.crt
```

Esse `root.crt` e o arquivo que pode ser instalado no celular para confiar no HTTPS local.
