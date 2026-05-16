# Notas da versao - 15 de maio de 2026

## Novidades

- **Timeline da troca**: Ao tocar no horario de qualquer evento de troca no historico, voce ve todos os eventos daquela troca em uma unica pagina, do mais recente ao mais antigo, com o evento selecionado destacado.

- **Detalhes das figurinhas no historico**: Todas as entradas do historico agora mostram quais figurinhas estavam envolvidas na troca, com rotulos adaptados ao contexto (por exemplo, "deu/recebeu" para trocas concluidas, "recuperou/devolveu" para estornos).

- **Visibilidade completa do ciclo de vida**: Todos os participantes de uma troca agora veem todos os eventos relacionados (envio, recebimento, rejeicao, cancelamento, pedido de estorno e negacao de estorno), e nao apenas o seu proprio lado.

- **Indicador de troca cancelada anteriormente**: Na tela de matches, propostas que envolvem exatamente a mesma combinacao de figurinhas de uma troca que ja foi cancelada ou rejeitada mostram um aviso laranja. Ao confirmar a troca nessa situacao, o app pede uma confirmacao extra — porque a vida e curta demais pra repetir os mesmos erros.

- **Secoes nos matches por compatibilidade**: A lista de matches agora esta dividida em tres grupos: trocas mutuas (ambos tem figurinhas para oferecer), "tem figurinhas para mim mas eu nao tenho para eles" e "eu tenho para eles mas eles nao tem para mim". Os dois ultimos ficam recolhidos por padrao.

- **Panelinhas dentro do Mural**: A pagina de Panelinhas foi incorporada ao Mural do YVY como uma secao com paginacao (5 por vez). O item foi removido do menu de navegacao. Menos cliques, mais fofoca.

- **Aproveitamento de duplicatas no perfil**: O perfil agora mostra quantas copias extras ja foram trocadas e o percentual de aproveitamento (duplicatas negociadas com sucesso em relacao ao total historico).

- **Protecao contra duplo clique**: Botoes de acao (importar figurinhas, enviar proposta, confirmar troca avancada, salvar duplicatas) agora ficam desabilitados enquanto a acao anterior esta sendo processada. Seus dedos ansiosos estao seguros.

- **Trocas concluidas na pagina de matches**: A tela de trocas agora mostra todas as suas trocas concluidas em uma secao recolhivel no final da pagina, paginada de 3 em 3, da mais recente para a mais antiga. O botao "Desfazer troca" nao aparece aqui — para desfazer, acesse pelo historico.

- **Verificacao de troca fisica**: Dentro do Assistente de Troca, um novo botao "Completar" permite marcar que a troca fisica foi realizada. Apos confirmacao, o card da troca concluida exibe um indicador verde ao lado de "Troca concluida". Fim do "ja entreguei isso ou nao?".

- **Filtro por parceiro nas trocas concluidas**: Agora voce pode filtrar suas trocas concluidas por parceiro — chips com os nomes de todos que voce ja trocou aparecem no topo da secao. Funciona como radio: toque em um nome para ver so aquelas trocas, toque de novo para ver todas. Disponivel tanto nas trocas normais quanto nas triangulares. Perfeito pra encontrar aquela troca especifica que voce jurava que ja tinha feito.

- **Filtro "apenas nao verificadas"**: Um chip amber permite ver somente trocas que ainda nao foram marcadas como entregues fisicamente. Combina com o filtro de parceiro — filtre por pessoa E por status de verificacao ao mesmo tempo.

## Melhorias

- **Contagem de figurinhas nos rotulos**: Todos os rotulos de listas de figurinhas agora mostram o total envolvido (ex: "Voce recebeu 10", "Voce deu 12"), facilitando a conferencia rapida sem precisar contar os chips.

- **Aprovacoes de trocas avancadas na timeline**: Todas as aprovacoes individuais de participantes agora aparecem na timeline, inclusive a do ultimo aprovador que dispara a execucao da troca.

- **Estatisticas do perfil com dados historicos**: Os numeros de duplicatas, trocas e insights do perfil agora consideram figurinhas ja negociadas e trocas avancadas, refletindo o historico completo.

- **Botoes de paginacao repaginados** (trocadilho intencional): Botoes "Anterior" e "Proxima" agora tem fundo solido, bordas visiveis, efeito de hover e tamanho maior para facilitar o toque no celular. Tambem ganharam padding no final da pagina pra nao ficarem colados na borda da tela. Um unico componente compartilhado garante consistencia em todas as telas.

- **Coluna de conteudo com backdrop**: O fundo padrao do site tinha um pattern legal mas que prejudicava a leitura. Agora existe uma coluna semi-transparente (82% de opacidade) por tras de todo o conteudo, com bordas laterais sutis. O pattern continua visivel nas laterais e levemente por baixo — bonito E legivel.

- **Filtros visuais consistentes**: Os chips de filtro (parceiro + verificacao) agora sao componentes compartilhados (`FilterChips.tsx`) usados em ambas as telas de trocas. O filtro de parceiro e escuro quando ativo, o de verificacao e amber — visualmente distintos mas com a mesma linguagem de interacao.

## Correcoes

- **Indicador cancelado mais preciso**: O badge de "ja cancelada" agora so aparece quando a combinacao exata de figurinhas coincide com uma troca anterior cancelada, e nao apenas por ser o mesmo usuario.

- **Label de aprovacao corrigido**: Corrigido o label "undefined aprovou a troca triangular" que aparecia em entradas antigas do historico criadas antes do campo de nome ser adicionado ao log. Ninguem gosta de ser chamado de undefined.

- **Botao de assistente oculto em trocas canceladas**: O botao "Assistente de troca" nao aparece mais em entradas de historico de trocas canceladas ou rejeitadas. Faz sentido — nao da pra assistir uma troca que nunca aconteceu.

- **Ajustes visuais no historico detalhado**: Padronizacao de espacamento, bordas e fundo nos cards da timeline e do historico para manter consistencia visual entre as paginas. Componente compartilhado (TradeCardBody) garante que ambas as telas sejam sempre identicas.
