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

✅ Pronto! O ícone do *YVY Figurinhas* vai aparecer na sua tela inicial com o visual do app.

➖➖➖➖➖➖➖➖➖

📖 *Como usar*

👤 *1. Cadastro*
Na primeira vez, informe seu *nome completo*, *torre*, *apartamento* e *WhatsApp com DDD*. Depois escolha se vai marcar as figurinhas que *tem* ou as que *faltam*.

💻 *Já tem cadastro? Acessando pelo PC ou novo celular?*
Clique em *"Já sou cadastrado"* e informe apenas seu WhatsApp. O app recupera seu perfil automaticamente.

🧩 *2. Marcar figurinhas*
Na aba *Figurinhas*, selecione suas figurinhas na grade — organizadas por grupos e seleções com a bandeirinha de cada país.
- Toque para marcar/desmarcar
- Use *"Marcar todos"* para selecionar uma seleção inteira de uma vez
- Use a *barra de busca* no topo da grade para ir direto ao país desejado
- Ações em massa têm *desfazer* disponível por 5 segundos
💾 Não esqueça de salvar no final!

🔁 *3. Repetidas*
Na aba *Repetidas*, informe quais figurinhas você tem duplicadas e quantas. Essas são as disponíveis pra troca.
- Busque pelo país na barra de pesquisa e toque no número da figurinha
- Ou digite o código diretamente (ex: MEX1, FWC5)

🤝 *4. Melhores Trocas*
Na aba *Trocas*, o app monta um ranking de compatibilidade entre você e os outros moradores.

Cada card mostra:
- *Ele/ela tem para mim* — duplicatas desse morador que você ainda precisa
- *Eu tenho para ele/ela* — suas duplicatas que esse morador ainda precisa

Quem aparece no topo 🏆 é a melhor troca para os *dois lados ao mesmo tempo*.

Toque em *"Ver detalhes"* para ver exatamente quais figurinhas estão em jogo — selecione as que vai trocar e toque em *"Confirmar troca"*: os álbuns dos dois são atualizados automaticamente! Ou chame direto no WhatsApp 😉

📋 *5. Figurinhas que faltam*
Na aba *Faltam*, você vê tudo que ainda precisa completar. Tem um botão pra copiar a lista e colar direto no WhatsApp.

➖➖➖➖➖➖➖➖➖

💡 *Dicas rápidas*

- Atualize suas repetidas sempre que fizer uma troca
- Não precisa de senha — o acesso fica salvo pelo número de WhatsApp
- Trocou de aparelho? Entre com *"Já sou cadastrado"* e seu WhatsApp
- Ajuste o tamanho da fonte pelo botão *Aa* no canto superior direito do cabeçalho

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

### Deploy

```bash
npx vercel --prod
```

### Migrações de banco

```bash
npx supabase db push
```
