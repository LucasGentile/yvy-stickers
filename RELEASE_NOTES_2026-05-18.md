# Notas da versão — 18 de maio de 2026 (v2.0.0)

Primeira versão com dois colaboradores: Lucas Gentile e Gustavo Baladão.

## Novidades

- **Fluxo de aceite parcial reformulado** (Gustavo): ao desmarcar figurinhas antes de aceitar uma troca, o app agora pede confirmação _por figurinha_ — uma a uma — antes de removê-la da proposta. Mais seguro, menos dedada acidental.

- **Checklist pré-aceite** (Lucas): antes de confirmar o aceite final, uma tela de checklist exibe todas as figurinhas envolvidas e lembra o morador de confirmar a troca presencialmente. Fim do "aceitei mas não tinha a figurinha na mão".

- **Figurinhas excluídas no histórico** (Gustavo): quando uma troca é aceita de forma parcial (alguma figurinha removida da proposta), as figurinhas excluídas aparecem registradas no histórico com rótulo "removida da proposta". Transparência total.

- **Prevenção de aceite com lado vazio** (Gustavo): não é mais possível aceitar uma troca com nenhuma figurinha de nenhum dos lados. O app avisa e bloqueia o envio — evita propostas sem sentido.

- **Timestamp com link para timeline nas trocas concluídas** (Gustavo): cada card de troca concluída agora mostra a data/hora do aceite como link clicável que abre diretamente a linha do tempo daquela troca. Sem precisar procurar no histórico.

- **Badge dourado para figurinhas recém-adicionadas** (Lucas): qualquer figurinha adicionada ao álbum nas últimas 12h — seja por troca ou salva manualmente — recebe um badge dourado na grade. Fácil de identificar o que entrou de novo.

## Melhorias

- **Matching avançado mais preciso** (Gustavo): o motor de trocas triangulares agora exclui automaticamente figurinhas que o usuário já vai receber em trocas normais pendentes. Evita sugerir ciclos que incluem figurinhas já comprometidas como "necessidade", o que causava propostas impossíveis de executar.

- **Logs de rejeição e cancelamento para ambas as partes** (Lucas): quando uma troca é rejeitada ou cancelada, o evento agora é registrado no histórico de _ambos_ os participantes — quem rejeitou e quem teve o pedido recusado. Cada lado vê o evento com o contexto correto (ex: "Recusado por Ana" ou "Troca recusada").

## Correções

- **Testes atualizados** (Gustavo): mocks e asserções dos testes atualizados para refletir o comportamento real do aceite parcial com exclusões. Suite agora com 269 testes passando, 27 suítes.
