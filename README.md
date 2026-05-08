# YVY Lindóia – App de Figurinhas

App de troca de figurinhas da Copa do Mundo 2026 — Condomínio YVY Lindóia.

🔗 https://yvy-stickers.vercel.app

---

<!--
  MENSAGEM PARA O WHATSAPP
  Copie daqui até o próximo "---" e cole direto no WhatsApp.
  Os *asteriscos* viram negrito no WhatsApp automaticamente.
-->

📱✨ *YVY Lindóia – App de Figurinhas*

Oi, pessoal!
Criei um app pra facilitar a troca de figurinhas do álbum do condomínio 😊
Segue um guia rápido pra começar:

➖➖➖➖➖➖➖➖➖

📲 *Como instalar no celular*

Acesse: https://yvy-stickers.vercel.app/

*Android (Chrome)*
1. Toque no menu (⋮ no canto superior direito)
2. Clique em *"Adicionar à tela inicial"* (ou "Instalar aplicativo")
3. Confirme em *"Adicionar"*

*iPhone (Safari — obrigatório usar o Safari!)*
1. Toque no botão de compartilhar (⬆️ na barra inferior)
2. Role e selecione *"Adicionar à Tela de Início"*
3. Confirme em *"Adicionar"*

✅ Pronto! O ícone do *YVY Figurinhas* vai aparecer na sua tela inicial.

➖➖➖➖➖➖➖➖➖

📖 *Como usar*

👤 *1. Cadastro*
Na primeira vez, informe seu *nome completo*, *torre*, *apartamento* e *WhatsApp com DDD*. Depois escolha se vai marcar as figurinhas que *tem* ou as que *faltam*.

💻 *Já tem cadastro? Acessando pelo PC ou novo celular?*
Clique em *"Já sou cadastrado"* e informe apenas seu WhatsApp. O app recupera seu perfil automaticamente.

🧩 *2. Minhas Figurinhas*
Selecione suas figurinhas na grade — organizadas por grupos e seleções com a bandeirinha de cada país.
- Toque para marcar/desmarcar
- Use *"Marcar todos"* para selecionar uma seleção inteira de uma vez
- Use a *barra de busca* para ir direto ao país desejado
- Ações em massa têm *desfazer* disponível por 5 segundos
- O contador no rodapé mostra quantas figurinhas você tem no total
- O app avisa se você tentar sair sem salvar
💾 Não esqueça de salvar no final!

🔁 *3. Repetidas*
Informe quais figurinhas você tem duplicadas e quantas. Essas ficam disponíveis pra troca.
- Busque pelo país na barra de pesquisa e toque na figurinha desejada
- O painel do país fica aberto para registrar várias figurinhas da mesma seleção em sequência
- Os números em dourado nos botões mostram quantidades já cadastradas
- Use *+* e *−* diretamente na lista para ajustar quantidades

🤝 *4. Ranking de Trocas*
O app monta um ranking de compatibilidade entre você e os outros moradores.
- *Ele/ela tem para mim* — duplicatas desse morador que você ainda precisa
- *Eu tenho para ele/ela* — suas duplicatas que esse morador ainda precisa
- Quem aparece no topo 🏆 é a melhor troca para os *dois lados ao mesmo tempo*

Toque em *"Realizar Troca"* para ver as figurinhas em jogo e enviar um pedido formal:
1. Selecione as figurinhas e toque em *"Confirmar troca"*
2. Revise o resumo e toque em *"Enviar pedido de troca"*

O pedido fica pendente até que o outro morador aceite. Somente após a confirmação dos dois os álbuns são atualizados. Se houver pedidos aguardando resposta, um ponto vermelho aparece no menu.

🏅 *5. Ranking do Álbum*
Veja quem está mais perto de completar o álbum! Todos os moradores ordenados por percentual de conclusão, com medalhas de ouro, prata e bronze para o top 3 e uma barra de progresso para cada um.

📋 *6. Faltantes*
Veja todas as figurinhas que ainda precisa. Use a busca para filtrar por país ou coleção.

📜 *7. Histórico*
Revise suas últimas 50 ações no app — salvamentos, trocas enviadas, aceitas, recusadas e alterações de repetidas. As ações marcadas com ⚑ indicam algo que você ainda precisa fazer no álbum físico (ex: colar figurinhas novas, combinar entrega com o parceiro). Use como checklist!

➖➖➖➖➖➖➖➖➖

☰ *Menu*

Toque no ícone ≡ no canto superior esquerdo para navegar entre as telas, ajustar o tamanho da fonte e acessar o Grupo do WhatsApp.

➖➖➖➖➖➖➖➖➖

💡 *Dicas rápidas*

- Atualize suas repetidas sempre que fizer uma troca
- Não precisa de senha — o acesso fica salvo pelo número de WhatsApp
- Trocou de aparelho? Entre com *"Já sou cadastrado"* e seu WhatsApp
- Ajuste o tamanho da fonte no menu (≡) no canto superior esquerdo

➖➖➖➖➖➖➖➖➖

Qualquer dúvida é só chamar! 🚀

---

## Para o administrador

### Gerenciar usuários

O app exige aprovação manual para novos cadastros. Use o script de administração:

```bash
# Listar todos os usuários
npx tsx scripts/admin.ts list

# Ver apenas pendentes de aprovação
npx tsx scripts/admin.ts pending

# Aprovar um usuário
npx tsx scripts/admin.ts approve "5511999998888"

# Remover um usuário
npx tsx scripts/admin.ts delete "5511999998888"
```

> Requer `SUPABASE_SERVICE_KEY` no arquivo `.env.local`
> (Supabase dashboard → Project Settings → API → service_role key)

### Stack

- **Next.js 16** (App Router, Server Actions)
- **Supabase** (PostgreSQL)
- **Tailwind CSS v4**
- **Vercel** (deploy)

### Telas e rotas

| Rota | Tela |
|---|---|
| `/` | Cadastro / login |
| `/stickers` | Minhas Figurinhas |
| `/duplicates` | Repetidas |
| `/matches` | Ranking de Trocas |
| `/ranking` | Ranking do Álbum |
| `/missing` | Faltantes |
| `/historico` | Histórico de ações |
| `/group` | Redireciona para o grupo do WhatsApp |

### Testes

```bash
npm test                  # roda todos os testes (59 testes, 8 arquivos)
npm run test:watch        # modo watch durante desenvolvimento
npm run test:coverage     # relatório de cobertura
```

Framework: **Vitest v2** + **React Testing Library** + **jsdom**

Cobertura: ações do servidor (`logAction`, `getAuditLog`, `saveStickers`, `registerUser`, `createTradeRequest`, `respondToTrade`, `getMatches`), utilitários (`normalize`, `parser`) e componentes (`AuditScreen`).

### Deploy

```bash
vercel deploy --prod
```

### Migrações de banco

Arquivos em `supabase/migrations/` — rodar após cada novo arquivo:

```bash
supabase db push
```

| Migração | Descrição |
|---|---|
| 001–006 | Schema inicial (usuários, figurinhas, repetidas, trocas) |
| 007_audit_log | Tabela `audit_log` para o Histórico de ações |

### Variáveis de ambiente

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon (cliente) |
| `SUPABASE_SERVICE_KEY` | Chave service role (servidor / admin) |
| `WHATSAPP_GROUP_URL` | Link do grupo do WhatsApp do condomínio |
