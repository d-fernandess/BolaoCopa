# ⚽ Bolão Copa 2026 — Guia de Deploy

## Funcionalidades
- Cadastro com link de convite por bolão
- ADM aprova participantes com 1 clique
- ADM também é jogador e aparece no ranking
- Múltiplos bolões independentes
- 48 jogos da fase de grupos pré-definidos
- Mata-mata adicionado pelo ADM conforme avança
- Pontuação: 10 / 7 / 5 / 0 com multiplicadores por fase
- Bônus: campeão (+30), vice (+15), artilheiro (+10)

---

## 🚀 Deploy no Railway (passo a passo)

### 1. Criar conta no GitHub
Acesse https://github.com e crie uma conta gratuita.

### 2. Fazer upload do projeto
- Crie um repositório novo chamado `bolao-copa`
- Faça upload de todos os arquivos desta pasta

### 3. Criar conta no Railway
Acesse https://railway.app → **Login with GitHub**

### 4. Criar projeto
- Clique em **New Project** → **Deploy from GitHub repo**
- Selecione o repositório `bolao-copa`

### 5. Variáveis de ambiente (obrigatório)
Na aba **Variables** do projeto no Railway, adicione:

```
NODE_ENV=production
PORT=3001
JWT_SECRET=coloque-uma-senha-longa-e-aleatória-aqui
DB_PATH=/app/bolao.db

# Dados do admin (seu usuário)
ADMIN_EMAIL=seu@email.com
ADMIN_PASS=sua-senha-segura
ADMIN_NAME=Seu Nome
```

### 6. Deploy
Clique em **Deploy**. Aguarde ~3 minutos.
Railway fornecerá uma URL tipo `https://bolao-copa-xxx.railway.app`

---

## 🔑 Primeiro acesso

Entre com o e-mail e senha que você definiu nas variáveis `ADMIN_EMAIL` e `ADMIN_PASS`.

---

## 📋 Fluxo de uso

### Como ADM:
1. Entre com sua conta de admin
2. Vá em **Admin → Bolões** → crie um bolão
3. Copie o **link de convite** e mande no WhatsApp do grupo
4. Quando alguém se cadastrar, você verá o nome pendente → clique **Aprovar**
5. Ao fim de cada jogo, vá em **Admin → Jogos** → registre o resultado
6. Nas oitavas em diante, adicione os confrontos em **Admin → Jogos → Adicionar jogo**

### Como jogador:
1. Receba o link de convite
2. Clique → preencha nome, e-mail e senha
3. Aguarde aprovação do ADM
4. Entre, acesse o bolão e dê seus palpites

---

## 🏆 Pontuação
| Acerto | Base | Final (×3) |
|--------|------|------------|
| 🎯 Placar exato | 10 | 30 |
| ⚽ Vencedor + gols do vencedor | 7 | 21 |
| ✅ Apenas vencedor | 5 | 15 |
| ❌ Errou | 0 | 0 |

**Multiplicadores:** Grupos ×1 · Oitavas ×1,5 · Quartas ×2 · Semi ×2,5 · Final ×3

**Bônus:** Campeão +30 · Vice +15 · Artilheiro +10

---

## 💻 Rodar localmente
```bash
# Terminal 1 — backend
cd backend && npm install && node server.js

# Terminal 2 — frontend
cd frontend && npm install && npm start
```
Frontend: http://localhost:3000 | Backend: http://localhost:3001
