# 🔄 BANCO DE DADOS LIMPO - TESTE DO ZERO

## ✅ RESETADO COM SUCESSO!

### O que foi feito:
- ✅ Banco de dados completamente limpo
- ✅ 0 usuários no sistema
- ✅ 0 votos registrados  
- ✅ 1 turma disponível (Turma B - Horta natural)
- ✅ Backend reiniciado com correções
- ✅ Frontend reiniciado

---

## 📱 GUIA DE TESTE - PASSO A PASSO

### ⚠️ IMPORTANTE: Use Expo Go no celular para melhor resultado!

### **TESTE 1: Primeira Pessoa**

1. **Abra Expo Go** no seu celular
2. **Escaneie o QR Code** do preview
3. Quando o app abrir, clique em **"INICIAR VOTAÇÃO"**
4. **Tire uma foto clara** do seu rosto (PESSOA 1)
   - Boa iluminação
   - Rosto de frente
   - Centralizado
5. **Aguarde 2-5 segundos** (vai aparecer loading)
6. Como é primeira vez, vai para **PRÉ-CADASTRO**
7. Preencha:
   - Nome: Seu nome
   - CPF: Qualquer CPF válido (11 dígitos)
   - Telefone: Qualquer telefone
8. Clique **"Concluir Cadastro"**
9. Escolha um projeto e **VOTE**
10. Veja mensagem de sucesso

**✅ RESULTADO ESPERADO:** Cadastro + Voto realizado

---

### **TESTE 2: Segunda Pessoa (Rosto DIFERENTE)**

1. Volte para tela inicial (aguarde 5 segundos ou clique voltar)
2. Clique em **"INICIAR VOTAÇÃO"**
3. **IMPORTANTE:** Use uma pessoa DIFERENTE ou tire foto de outro ângulo muito diferente
4. **Tire a foto** (PESSOA 2 - rosto diferente)
5. **Aguarde processamento**
6. Deve ir para **PRÉ-CADASTRO** (NÃO reconhecer)
7. Preencha dados diferentes:
   - Nome: Nome diferente
   - CPF: CPF diferente
   - Telefone: Telefone diferente
8. Vote em um projeto

**✅ RESULTADO ESPERADO:** Sistema NÃO reconhece, permite novo cadastro

---

### **TESTE 3: Primeira Pessoa Novamente (Deve Reconhecer)**

1. Volte para tela inicial
2. Clique **"INICIAR VOTAÇÃO"**
3. Use a **PESSOA 1** (mesma do teste 1)
4. **Tire a foto**
5. Aguarde processamento

**✅ RESULTADO ESPERADO:** 
- Sistema reconhece
- Mostra alerta: "Você já realizou sua votação!"
- Volta para tela inicial

---

## 🔍 MONITORAR LOGS EM TEMPO REAL

Enquanto testa, rode este comando para ver os logs do backend:

```bash
tail -f /var/log/supervisor/backend.err.log | grep -E "Starting|Comparing|MATCH|distance="
```

**O que vai aparecer:**

### Quando NÃO reconhecer (rostos diferentes):
```
INFO - Starting face verification...
INFO - Comparing with João Silva: distance=0.6234, threshold=0.4000, verified=False
INFO - ✗ NO MATCH: Best was João Silva with distance 0.6234, but threshold is 0.35
```

### Quando RECONHECER (mesmo rosto):
```
INFO - Starting face verification...
INFO - Comparing with João Silva: distance=0.1856, threshold=0.4000, verified=True
INFO - ✓ MATCH FOUND: João Silva with distance 0.1856 (threshold: 0.35)
```

---

## 📊 ENTENDENDO AS DISTÂNCIAS

| Distância | Significado |
|-----------|-------------|
| 0.00 - 0.20 | ✅ Definitivamente mesma pessoa |
| 0.20 - 0.35 | ✅ Provavelmente mesma pessoa (ACEITO) |
| 0.35 - 0.50 | ⚠️ Similar mas REJEITADO |
| 0.50 - 0.70 | ❌ Pessoas diferentes |
| 0.70+ | ❌ Completamente diferentes |

**THRESHOLD ATUAL: 0.35** (linha divisória)

---

## 🎯 CADASTRAR PROJETOS PRIMEIRO (Recomendado)

Antes de testar votação, cadastre alguns projetos:

1. Na tela inicial, clique **"Painel Administrativo"**
2. Senha: **fucapi2025**
3. Clique **"Gerenciar Turmas"**
4. Clique **"Adicionar Nova Turma"**
5. Preencha:
   - Nome da Turma: Ex: "Turma A"
   - Nome do Projeto: Ex: "Robô Autônomo"
   - Número da Barraca: Ex: "10"
   - Selecione uma foto (qualquer imagem)
6. Salve

Repita para criar 3-4 projetos.

---

## 🐛 SE AINDA NÃO FUNCIONAR:

### Problema: Reconhece rostos diferentes como iguais

**Causa possível:** Threshold muito permissivo

**Solução:** Diminuir o threshold

Edite `/app/backend/server.py`, linha ~255:
```python
STRICT_THRESHOLD = 0.30  # Ao invés de 0.35
```

Depois reinicie:
```bash
sudo supervisorctl restart backend
```

---

### Problema: NÃO reconhece o mesmo rosto

**Causa possível:** Threshold muito rigoroso

**Solução:** Aumentar o threshold

```python
STRICT_THRESHOLD = 0.40  # Ao invés de 0.35
```

---

## 📱 DICAS PARA MELHOR RECONHECIMENTO:

1. **Iluminação:** Use local bem iluminado (frontal)
2. **Posição:** Rosto centralizado e de frente
3. **Distância:** ~30-50cm da câmera
4. **Evite:** Óculos escuros, máscaras, chapéus
5. **Consistência:** Mesma expressão ao tirar fotos
6. **Qualidade:** Use Expo Go (melhor que web)

---

## ✅ STATUS ATUAL DO SISTEMA:

```
✅ Banco de dados: LIMPO
✅ Backend: RODANDO com threshold 0.35
✅ Frontend: RODANDO
✅ Expo Go: PRONTO para teste
✅ Logs: HABILITADOS com detalhes
✅ Preview: https://fucapi-vote-kiosk.preview.emergentagent.com
✅ Senha Admin: fucapi2025
```

---

## 📞 PRÓXIMOS PASSOS:

1. ✅ Cadastre 2-3 projetos no admin
2. ✅ Teste com Expo Go no celular
3. ✅ Use 2 pessoas diferentes
4. ✅ Monitore os logs
5. ✅ Me avise os valores de distância que aparecem!

**Com os valores de distância dos logs, posso ajustar o threshold perfeitamente!** 🎯

---

## 🔧 COMANDOS ÚTEIS:

```bash
# Ver logs em tempo real
tail -f /var/log/supervisor/backend.err.log

# Ver banco de dados
mongosh test_database --eval "db.usuarios.find().pretty()"

# Limpar banco novamente
mongosh test_database --eval "db.usuarios.deleteMany({}); db.votos.deleteMany({})"

# Reiniciar serviços
sudo supervisorctl restart backend expo
```

---

**Sistema resetado e pronto para testes! 🚀**
