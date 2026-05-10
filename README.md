# YVY Lindóia – App de Figurinhas

App de troca de figurinhas da Copa do Mundo 2026 — Condomínio YVY Lindóia.

🔗 https://yvy-stickers.vercel.app

---

<!--
  MENSAGEM PARA O WHATSAPP
  Copie daqui até o próximo "---" e cole direto no WhatsApp.
  Os *asteriscos* viram negrito no WhatsApp automaticamente.
-->

📱✨ _YVY Lindóia – App de Figurinhas_

Oi, pessoal!
Criei um app pra facilitar a troca de figurinhas do álbum do condomínio 😊
Segue um guia rápido pra começar:

➖➖➖➖➖➖➖➖➖

📲 _Como instalar no celular_

Acesse: https://yvy-stickers.vercel.app/

_Android (Chrome)_

1. Toque no menu (⋮ no canto superior direito)
2. Clique em _"Adicionar à tela inicial"_ (ou "Instalar aplicativo")
3. Confirme em _"Adicionar"_

_iPhone (Safari — obrigatório usar o Safari!)_

1. Toque no botão de compartilhar (⬆️ na barra inferior)
2. Role e selecione _"Adicionar à Tela de Início"_
3. Confirme em _"Adicionar"_

✅ Pronto! O ícone do _YVY FIGURINHAS_ vai aparecer na sua tela inicial.

➖➖➖➖➖➖➖➖➖

📖 _Como usar_

👤 _1. Cadastro_
Na primeira vez, informe seu _nome completo_, _torre_, _apartamento_ e _WhatsApp com DDD_. Depois escolha se vai marcar as figurinhas que _tem_ ou as que _faltam_.

💻 _Já tem cadastro? Acessando pelo PC ou novo celular?_
Clique em _"Já sou cadastrado"_ e informe apenas seu WhatsApp. O app recupera seu perfil automaticamente.

🧩 _2. Minhas Figurinhas_
Selecione suas figurinhas na grade — organizadas por grupos e seleções com a bandeirinha de cada país. O progresso de conclusão de cada país aparece ao lado do nome da seleção.

- Toque para marcar/desmarcar
- Use _"Marcar todos"_ para selecionar uma seleção inteira de uma vez
- Use a _barra de busca_ para ir direto ao país desejado
- Ações em massa têm _desfazer_ disponível por 5 segundos
- Você também pode carregar suas figurinhas por arquivo .txt (códigos separados por ; ou por linha) — selecione o arquivo e clique em _"Importar"_ para confirmar
- O código _00_ no arquivo é aceito automaticamente como FWC00
- O app avisa se você tentar sair sem salvar
  💾 Não esqueça de salvar no final!

As figurinhas marcadas aparecem em cores diferentes:
🟢 _Verde_ — comprada/colada no álbum físico
🔵 _Azul_ — recebida via troca no app
🟡 _Ponto amarelo_ — recebida em troca nas últimas 48h
A contagem _"Compradas: X · De trocas: Y"_ aparece acima da grade.

Figurinhas especiais têm destaque visual:
✨ _Dourado_ — figurinhas cromadas (FWC + #1 de cada seleção)
🔴 _Vermelho_ — figurinhas Coca-Cola (CC1–CC14)

🔁 _3. Repetidas_
Informe quais figurinhas você tem duplicadas e quantas. Essas ficam disponíveis pra troca.

- Busque pelo país na barra de pesquisa e toque na figurinha desejada
- Use _+_ e _−_ diretamente na lista para ajustar quantidades
- Figurinhas reservadas em pedidos pendentes aparecem com badge _"em troca"_ e o total reservado é exibido em vermelho no topo da lista

🤝 _4. Ranking de Trocas_
O app monta um ranking de compatibilidade entre você e os outros moradores.

- Quem aparece no topo 🏆 é a melhor troca para os _dois lados ao mesmo tempo_
- Toque em _"Realizar Troca"_ para enviar um pedido formal
- O pedido fica pendente até que o outro morador aceite
- Após aceite, ambos têm *10 minutos* para desfazer a troca (requer confirmação dos dois)
- Um _ponto vermelho_ no menu indica pedidos esperando sua resposta
- Pedidos recebidos mostram quantas figurinhas estão envolvidas e alertam se houver uma troca mais vantajosa com outro morador
- Antes de aceitar, o app lembra de confirmar presencialmente com o outro morador

🏅 _5. Ranking do Álbum_
Veja quem está mais perto de completar o álbum — moradores ordenados por número de figurinhas, com medalhas para o top 3.

🏆 _6. Panelinhas do YVYs_
Ranking dos pares que mais realizaram trocas entre si. Quanto mais trocas, mais inseparáveis — e mais suspeitos de panelinha!

📋 _7. Faltantes_
Veja todas as figurinhas que ainda precisa. Use a busca para filtrar por país ou coleção.

📰 _8. Mural do YVY_
Fatos e insights gerados automaticamente sobre o condomínio figurinheiro — inclui maior investidor, rei das repetidas, figurinheiro negociante e o investimento coletivo convertido em pizzas. Fins humorísticos. Sem julgamentos (mentira).

📜 _9. Histórico_
Revise suas últimas 50 ações no app, organizadas em páginas de 10 com navegação _"← Anterior"_ e _"Próxima →"_. As ações marcadas com ⚑ indicam algo que você ainda precisa fazer no álbum físico. Use como checklist!

➖➖➖➖➖➖➖➖➖

☰ _Menu_

Toque no ícone ≡ no canto superior esquerdo para navegar entre as telas, ajustar o tamanho da fonte e acessar o Grupo do WhatsApp.

➖➖➖➖➖➖➖➖➖

💡 _Dicas rápidas_

- Atualize suas repetidas sempre que fizer uma troca
- Não precisa de senha — o acesso fica salvo pelo número de WhatsApp
- Trocou de aparelho? Entre com _"Já sou cadastrado"_ e seu WhatsApp
- Ajuste o tamanho da fonte no menu (≡) no canto superior esquerdo

➖➖➖➖➖➖➖➖➖

Qualquer dúvida é só chamar! 🚀

---

## Para o administrador

### Gerenciar usuários

O app exige aprovação manual para novos cadastros. O administrador pode aprovar diretamente pelo app (menu → **Aprovações**) ou via script de linha de comando:

```bash
# Listar todos os usuários
npm exec -- tsx scripts/admin.ts list

# Ver apenas pendentes de aprovação
npm exec -- tsx scripts/admin.ts pending

# Aprovar um usuário
npm exec -- tsx scripts/admin.ts approve "5511999998888"

# Remover um usuário
npm exec -- tsx scripts/admin.ts delete "5511999998888"

# Conceder papel de admin a um usuário (pelo telefone)
npm exec -- tsx scripts/admin.ts grant-admin "5511999998888"

# Inspecionar dados de um usuário pelo nome
npm exec -- tsx scripts/admin.ts debug-user "Nome"

# Buscar trocas envolvendo um usuário
npm exec -- tsx scripts/admin.ts find-trades "Nome"

# Recriar entradas de histórico para uma troca aceita
npm exec -- tsx scripts/admin.ts backfill-trade "<trade-uuid>"

# Desfazer manualmente uma troca aceita (sem limite de 10 min)
npm exec -- tsx scripts/admin.ts admin-rollback-trade "<trade-uuid>"
```

> Requer `SUPABASE_SERVICE_KEY` no arquivo `.env.local`
> (Supabase dashboard → Project Settings → API → service_role key)

#### Painel de aprovações no app

Usuários com `is_admin = true` veem um item **Aprovações** no menu lateral com badge de contagem. A tela mostra nome, torre, apartamento, telefone e data de cadastro de cada usuário pendente, com botão de aprovação imediata.

### Stack

- **Next.js 16** (App Router, Server Actions)
- **Supabase** (PostgreSQL)
- **Tailwind CSS v4**
- **Vitest v2** + **React Testing Library**
- **Vercel** (deploy)

### Telas e rotas

| Rota           | Tela                                          |
| -------------- | --------------------------------------------- |
| `/`            | Cadastro / login                              |
| `/stickers`    | Minhas Figurinhas                             |
| `/duplicates`  | Repetidas                                     |
| `/matches`     | Ranking de Trocas + Pedidos pendentes         |
| `/ranking`     | Ranking do Álbum                              |
| `/panelinhas`  | Panelinhas do YVYs                            |
| `/missing`     | Faltantes                                     |
| `/mural`       | Mural do YVY (insights humorísticos)          |
| `/historico`   | Histórico de ações                            |
| `/admin`       | Aprovações pendentes (visível só para admins) |
| `/group`       | Redireciona para o grupo do WhatsApp          |

### Testes

```bash
npm test                  # roda todos os testes (132 testes, 13 arquivos)
npm run test:watch        # modo watch durante desenvolvimento
npm run test:coverage     # relatório de cobertura
```

Framework: **Vitest v2** + **React Testing Library** + **jsdom**

Escopo de cobertura: `lib/**` e `actions/**` (server actions e utilitários).

### Deploy

```bash
vercel deploy --prod
```

### Migrações de banco

Arquivos em `supabase/migrations/` — rodar após cada novo arquivo:

```bash
supabase db push
```

| Migração                 | Descrição                                                |
| ------------------------ | -------------------------------------------------------- |
| 001–006                  | Schema inicial (usuários, figurinhas, repetidas, trocas) |
| 007\_audit\_log          | Tabela `audit_log` para o Histórico de ações             |
| 008\_admin\_role         | Coluna `is_admin` na tabela `users`                      |
| 009\_sticker\_count\_rpc | RPC `get_sticker_counts_by_user` (contorna limite PostgREST) |
| 010\_trade\_rollback     | Colunas `accepted_at` e `rollback_requested_by` em `pending_trades`; status `rolled_back` |

### Variáveis de ambiente

| Variável                        | Uso                                     |
| ------------------------------- | --------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL do projeto Supabase                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon (cliente)                    |
| `SUPABASE_SERVICE_KEY`          | Chave service role (servidor / admin)   |
| `WHATSAPP_GROUP_URL`            | Link do grupo do WhatsApp do condomínio |
