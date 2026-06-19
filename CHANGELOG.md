# Changelog

## [v2.10.2] — 2026-06-19

### Melhorias

- **Carregamento mais rápido** — o cabeçalho do app agora carrega todos os indicadores de notificação em uma única consulta ao invés de cinco separadas, reduzindo o número de requisições em ~80%
- **Menos recarregamentos automáticos** — as telas de cancelamentos e ranking não atualizam mais a cada vez que o usuário volta ao app; agora aguardam pelo menos 30 segundos entre atualizações

## [v2.10.1] — 2026-06-11

### Correções

- **Ranking de Trocas vazio** — usuários com figurinhas eram incorretamente desativados por um bug de limite de linhas no banco, fazendo com que ninguém aparecesse nas sugestões de troca
- **Buscar Figurinhas** — figurinhas comprometidas em trocas avançadas pendentes agora são excluídas corretamente da disponibilidade, evitando que apareçam como "disponíveis"
- **Desativação automática removida** — substituída por uma limpeza única que desativa apenas contas sem nenhuma figurinha cadastrada há mais de 2 dias, sem risco de desativar participantes ativos

## [v2.10.0] — 2026-06-10

### Funcionalidades

- **Sair da conta** — botão "Sair" adicionado ao menu lateral para trocar de usuário sem precisar limpar o app manualmente

### Correções

- Modal de pedido de compra corrigido no celular — não ficava mais cortado ou fora de posição em telas com scroll
- Figurinhas em trocas avançadas pendentes agora são corretamente excluídas da disponibilidade no Buscar Figurinhas
- Usuários com figurinhas não aparecem mais como inativos no Ranking de Trocas

## [v2.9.0] — 2026-06-09

### Funcionalidades

- **Buscar Figurinhas** — nova tela onde o usuário cola uma lista de figurinhas em qualquer formato (exportação de outros apps, lista separada por vírgula/ponto-e-vírgula, etc.) e o app mostra quais moradores têm essas figurinhas como repetidas disponíveis
- **Pedido de compra** — a partir dos resultados da busca, é possível enviar um pedido de compra diretamente ao morador que tem as figurinhas; o destinatário pode aceitar ou recusar
- Ao aceitar um pedido, as repetidas são decrementadas do vendedor e as figurinhas são adicionadas ao álbum do comprador automaticamente
- Pedidos pendentes reservam as figurinhas envolvidas, igual às trocas — não aparecem como disponíveis para outras transações
- Pedidos de compra recebidos e enviados aparecem na tela de Trocas
- Contador de pedidos pendentes incluído no badge do menu e na navegação

### Melhorias

- Reservas em pedidos de compra consideradas em todas as telas de verificação de disponibilidade (Verificar Figurinha, duplicatas, etc.)

## [v2.8.0] — 2026-06-05

### Funcionalidades

- **Verificar lista de figurinhas** — cole uma lista separada por ponto-e-vírgula (como a saída de "Copiar lista" em Faltantes) na tela Verificar Figurinha e veja um resumo agrupado: quais estão disponíveis para troca, coladas sem repetidas, não tenho, reservadas ou com código inválido

### Correções

- Álbum completo não perde a posição no Ranking quando o usuário re-salva as figurinhas — a data de conclusão agora é permanente
- Aviso de troca cancelada (banner vermelho) não ficava mais coberto pelo cabeçalho fixo

## [v2.7.0] — 2026-06-01

### Funcionalidades

- **Alerta de troca cancelada** — quando alguém cancela um pedido de troca, a contraparte recebe um aviso persistente no topo do app pedindo para devolver a figurinha ao baralho, com confirmação na tela Ranking de Trocas

### Correções

- Busca por figurinhas agora ignora acentos ("Bosnia" encontra "Bósnia") e aceita nome do país além do código (ex: "Bosnia" mostra todas as figurinhas BIH)
- Seção "Trocas canceladas" aparece no topo do Ranking de Trocas em vez de enterrada no final da lista
- Aviso de cancelamento não é retroativo — apenas trocas canceladas após a atualização geram alerta
- Botão "Bloquear recebimento" renomeado para "Bloquear trocas" com espaçamento corrigido
- Cabeçalho "Trocas concluídas" com destaque visual melhorado

## [v2.6.0] — 2026-05-29

### Funcionalidades

- **Filtro "Só pendentes" em Minhas Figurinhas** — novo botão que oculta seleções e países já completos, mostrando apenas onde ainda faltam figurinhas
- **Filtro de participantes na Troca Avançada** — ao buscar trocas triangulares, um painel permite selecionar quais moradores incluir na busca; até 5 propostas são exibidas, ranqueadas por pontuação
- **Busca na lista de Repetidas** — campo de pesquisa no topo da lista de repetidas para encontrar rapidamente uma figurinha específica
- **Zerar quantidade de repetidas** — o stepper agora vai até 0; chegar a zero remove o item da lista automaticamente, sem precisar de botão separado

### Correções

- Trocas canceladas e recusadas agora têm link direto para a linha do tempo correta (antes levavam sempre ao histórico geral)
- Trocas com desfazimento parcial agora podem ser verificadas pelo Assistente de troca (o botão "Completar" funcionava apenas para trocas sem rollback)
- RLS habilitado no banco — todas as ações do servidor usam cliente admin para acesso correto aos dados

---

## [v2.5.0] — 2026-05-26

### Funcionalidades

- **Desfazimento completo após desfazimento parcial** — trocas parcialmente desfeitas agora exibem opção de desfazer os itens restantes; ambos os participantes precisam confirmar, com opção de forçar após 3 dias

### Melhorias

- **Ordenação alfabética de países aplicada** — a preferência de ordem alfabética agora reordena os times corretamente na grade de figurinhas
- **Grade ajustada para fonte A++** — no tamanho de fonte máximo, a grade de figurinhas usa 7 colunas em vez de 10 para evitar sobreposição
- **Nota em desfazimentos parciais no histórico** — eventos de rollback parcial exibem aviso de que as figurinhas não listadas foram mantidas na troca

### Correções

- Figurinhas de trocas triangulares concluídas não exibem mais o fundo de "já possui" indevidamente
- Nomes de figurinhas não são mais cortados na lista de repetidas em fontes grandes
- Tela de rollback de troca avançada exibe mensagem permanente quando a troca não pode mais ser alterada (em vez de erro com "tente novamente")

---

## [v2.4.0] — 2026-05-25

### Funcionalidades

- Figurinhas de trocas parcialmente desfeitas agora permanecem visíveis na lista de trocas concluídas, identificadas como "Troca parcial"
- Lista de repetidas agora exibe o emoji da bandeira do país ao lado de cada figurinha

### Correções

- Corrigido bug onde figurinhas devolvidas em desfazimentos iam parar nas repetidas em vez de na coleção correta
- Trocas parcialmente desfeitas não aparecem mais na seção "Desfazimentos pendentes"
- Removida interface de confirmação/recusa de desfazimento em trocas já resolvidas parcialmente

## [v2.3.0] — 2026-05-21

### Novidades

- **Gesto de atualizar (pull-to-refresh)** — arraste a tela de cima para baixo no celular para atualizar os dados sem precisar tocar no botão de refresh
- **Bloquear recebimento de trocas** — botão no Ranking de Trocas para pausar o recebimento de novos pedidos enquanto você organiza suas figurinhas
- **Alerta de trocas canceladas e recusadas** — trocas canceladas ou recusadas nos últimos 5 dias aparecem em seção dedicada no ranking, para não ficarem perdidas no histórico

### Melhorias

- **Banner de notificação integrado ao cabeçalho** — o banner de sucesso/erro agora desliza para fora do cabeçalho fixo, sem cobrir o conteúdo principal da tela
- **Aviso de figurinha já possuída** — ao propor ou aceitar uma troca, o app avisa se alguma figurinha já existe no álbum do outro participante (bidirecional)
- **Figurinhas recebidas marcáveis no álbum** — ao marcar uma figurinha recebida em troca concluída como colada, ela é adicionada diretamente ao álbum
- **Ranking de Trocas reorganizado** — seções colapsáveis para "Têm para mim" e "Precisa das minhas" tornam a tela mais limpa quando há muitos participantes

### Correções

- Largura dos cards de histórico corrigida para 100% do container em todas as telas
- Mock de rollback de trocas avançadas corrigido nos testes de auditoria

---

## [v2.2.0] — 2026-05-21

### Novidades

- **Desfazimento de trocas avançadas (triangulares)** — trocas triangulares concluídas agora podem ser desfeitas; os 3 participantes precisam aprovar o rollback. Se alguém não responder em 3 dias, o desfazimento forçado fica disponível com confirmação
- **Ações na timeline detalhada** — aceitar, recusar e desfazer trocas diretamente na página de linha do tempo, sem precisar voltar para a tela de trocas
- **Sistema de notificações globais** — banner de feedback (sucesso/erro) aparece no topo da tela após cada ação confirmada, com auto-dismiss em 5 segundos
- **Editar nome de exibição** — moradores podem editar seu nome diretamente pela tela de perfil
- **Busca por nome de morador no histórico** — além de buscar por código de figurinha, agora é possível filtrar entradas do histórico por nome
- **Seção de álbuns completos no ranking** — moradores que completaram o álbum aparecem em seção separada no topo com a data de conclusão
- **Busca sticky (fixa)** — a barra de busca nas telas de figurinhas fica fixa no topo enquanto rola a página, facilitando a navegação

### Melhorias

- **CountryFlag compartilhado** — componente de bandeira extraído com aspect ratio 3:2 consistente em todas as telas
- **Loading screen aprimorado** — tela de carregamento exibida até que a sessão do usuário seja determinada, evitando flash de conteúdo
- **Percentual de álbum preciso** — usa arredondamento para baixo; 100% aparece somente quando todas as figurinhas foram coletadas

### Correções

- Cores das labels de rollback no histórico corrigidas (deu/recebeu estavam invertidas)
- Ações de desfazer restritas apenas às rotas de histórico (não aparecem mais em outras telas)
- Seleção de texto durante long press em figurinhas prevenida
- Scroll offset ajustado para não cobrir conteúdo abaixo da busca sticky
- Cards de histórico ocupam 100% da largura do container em todas as telas

---

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
