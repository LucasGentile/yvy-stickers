# Changelog

## [v2.1.0] — 2026-05-19

### Novidades

- **Tema dourado e redesign dos chips** — visual renovado em toda a interface: chips de figurinha com bordas e paleta dourada, look mais sofisticado e consistente
- **Proteção do álbum** — ative o modo de proteção em Minhas Figurinhas para evitar desmarcar figurinhas por acidente; o app exibe um aviso antes de qualquer remoção
- **Desfazimento forçado** — após 3 dias sem resposta do outro morador, é possível acionar o desfazimento sem esperar a confirmação; uma modal de confirmação é exibida antes de executar
- **Tela de carregamento com identidade visual** — splash screen com logo e spinner enquanto os dados carregam
- **Contagem de figurinhas na confirmação de troca** — o número de figurinhas aparece diretamente nas seções "Você dá" e "Você recebe"
- **Timestamp integrado ao chip de status** — data e hora da última ação ficam ao lado do chip de status nos cards de troca, sem ocupar linha extra
- **PWA instalável** — manifest e ícones configurados; o app pode ser instalado na tela inicial com nome e ícone corretos em Android e iOS

### Correções

- Ponto dourado (badge de "adicionado nas últimas 12h") agora aparece imediatamente ao salvar manualmente, sem precisar recarregar
- Seções FWC e especiais incluídas na busca de Minhas Figurinhas
- Figurinhas exibidas no histórico de trocas canceladas e rejeitadas
- Figurinhas no modal de troca ordenadas pelo critério preferido do usuário (álbum ou A–Z)
- Label das figurinhas Coca-Cola com contorno branco para melhor legibilidade
- Cliques bloqueados em figurinhas reservadas em trocas pendentes
- Label FWC exibida corretamente em todas as figurinhas (exceto FWC00)
- Chips FWC com largura ajustada para evitar corte do texto
- Badge dourado centralizado e chips uniformes na grade
- Legendas em Minhas Figurinhas usam formato retangular (igual aos chips da grade)
- Tela de carregamento centralizada corretamente no layout

---

## [v2.0.0] — 2026-05-18

Primeira versão com dois colaboradores: Lucas Gentile e Gustavo Baladão.

### Novidades

- **Fluxo de aceite parcial reformulado** — ao desmarcar figurinhas antes de aceitar uma troca, o app pede confirmação _por figurinha_ antes de removê-la da proposta
- **Checklist pré-aceite** — antes do aceite final, uma tela resume todas as figurinhas envolvidas e lembra de confirmar a troca presencialmente
- **Figurinhas excluídas no histórico** — quando uma troca é aceita parcialmente, as figurinhas removidas da proposta aparecem registradas no histórico
- **Prevenção de aceite com lado vazio** — não é possível aceitar uma troca com nenhuma figurinha em nenhum dos lados
- **Timestamp com link para timeline nas trocas concluídas** — cada card de troca concluída mostra a data/hora como link clicável para a linha do tempo
- **Badge dourado para figurinhas recém-adicionadas** — figurinha adicionada ao álbum nas últimas 12h (por troca ou salva manualmente) recebe um badge dourado na grade

### Melhorias

- **Matching avançado mais preciso** — o motor de trocas triangulares exclui automaticamente figurinhas já comprometidas em trocas normais pendentes
- **Logs de rejeição e cancelamento para ambas as partes** — o evento é registrado no histórico dos dois participantes com contexto correto para cada lado

### Correções

- Suite com 269 testes passando em 27 suítes
