# Notas da versao - 15 de maio de 2026

## Novidades

- **Timeline da troca**: Ao tocar no horario de qualquer evento de troca no historico, voce ve todos os eventos daquela troca em uma unica pagina, do mais recente ao mais antigo, com o evento selecionado destacado.

- **Detalhes das figurinhas no historico**: Todas as entradas do historico agora mostram quais figurinhas estavam envolvidas na troca, com rotulos adaptados ao contexto (por exemplo, "deu/recebeu" para trocas concluidas, "recuperou/devolveu" para estornos).

- **Visibilidade completa do ciclo de vida**: Todos os participantes de uma troca agora veem todos os eventos relacionados (envio, recebimento, rejeicao, cancelamento, pedido de estorno e negacao de estorno), e nao apenas o seu proprio lado.

- **Indicador de troca cancelada anteriormente**: Na tela de matches, propostas que envolvem exatamente a mesma combinacao de figurinhas de uma troca que ja foi cancelada ou rejeitada mostram um aviso laranja. Ao confirmar a troca nessa situacao, o app pede uma confirmacao extra.

- **Secoes nos matches por compatibilidade**: A lista de matches agora esta dividida em tres grupos: trocas mutuas (ambos tem figurinhas para oferecer), "tem figurinhas para mim mas eu nao tenho para eles" e "eu tenho para eles mas eles nao tem para mim". Os dois ultimos ficam recolhidos por padrao.

- **Panelinhas dentro do Mural**: A pagina de Panelinhas foi incorporada ao Mural do YVY como uma secao com paginacao (5 por vez). O item foi removido do menu de navegacao.

- **Aproveitamento de duplicatas no perfil**: O perfil agora mostra quantas copias extras ja foram trocadas e o percentual de aproveitamento (duplicatas negociadas com sucesso em relacao ao total historico).

- **Protecao contra duplo clique**: Botoes de acao (importar figurinhas, enviar proposta, confirmar troca avancada, salvar duplicatas) agora ficam desabilitados enquanto a acao anterior esta sendo processada, evitando envios duplicados.

- **Trocas concluidas na pagina de matches**: A tela de trocas agora mostra todas as suas trocas concluidas em uma secao recolhivel no final da pagina, paginada de 3 em 3, da mais recente para a mais antiga. O botao "Desfazer troca" nao aparece aqui — para desfazer, acesse pelo historico.

- **Verificacao de troca fisica**: Dentro do Assistente de Troca, um novo botao "Completar" permite marcar que a troca fisica foi realizada. Apos confirmacao, o card da troca concluida exibe um indicador verde ao lado de "Troca concluida", facilitando saber quais trocas ja foram entregues pessoalmente.

## Melhorias

- **Contagem de figurinhas nos rotulos**: Todos os rotulos de listas de figurinhas agora mostram o total envolvido (ex: "Voce recebeu 10", "Voce deu 12"), facilitando a conferencia rapida sem precisar contar os chips.

- **Aprovacoes de trocas avancadas na timeline**: Todas as aprovacoes individuais de participantes agora aparecem na timeline, inclusive a do ultimo aprovador que dispara a execucao da troca.

- **Estatisticas do perfil com dados historicos**: Os numeros de duplicatas, trocas e insights do perfil agora consideram figurinhas ja negociadas e trocas avancadas, refletindo o historico completo.

## Correcoes

- **Indicador cancelado mais preciso**: O badge de "ja cancelada" agora so aparece quando a combinacao exata de figurinhas coincide com uma troca anterior cancelada, e nao apenas por ser o mesmo usuario.

- **Label de aprovacao corrigido**: Corrigido o label "undefined aprovou a troca triangular" que aparecia quando o aprovador nao era encontrado no mapa de nomes.

- **Botao de assistente oculto em trocas canceladas**: O botao "Assistente de troca" nao aparece mais em entradas de historico de trocas canceladas ou rejeitadas, ja que nao ha figurinhas fisicas para trocar.

- **Ajustes visuais no historico detalhado**: Padronizacao de espacamento, bordas e fundo nos cards da timeline e do historico para manter consistencia visual entre as paginas. Componente compartilhado (TradeCardBody) garante que ambas as telas sejam sempre identicas.
