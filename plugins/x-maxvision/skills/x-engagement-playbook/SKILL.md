---
name: x-engagement-playbook
description: "Use when responder a menções/replies/quotes na conta X do user — define táticas de reply contextual, escalation, sentiment-aware response, e quando ignorar trolls."
---

# X Engagement Playbook

Tático para responder interações X de forma saudável.

## 1. Triagem inicial

Para cada mention/reply/quote:

1. **Identificar sentiment** (Grok pode classificar):
   - Positivo → reply curto agradecendo / amplificando
   - Neutro/questão genuína → reply substancial
   - Negativo construtivo → reply esclarecendo
   - Hostile/troll → ignorar (NÃO bloquear automático)
   - Spam/bot → ignorar

2. **Avaliar autor**:
   - Conta verificada / >1k followers → priorizar resposta
   - Conta ativa no nicho do user → priorizar
   - Conta nova (<30 dias) ou anônima sem histórico → baixa prioridade

3. **Avaliar conteúdo**:
   - Pergunta clara → resposta clara
   - Crítica com substância → reconhecer ponto + adicionar contexto
   - Crítica vazia ("é ruim") → ignorar
   - Pedido de DM → reply pública direcionando ao contexto certo

## 2. Reply patterns

| Situação | Pattern |
|---|---|
| Concordo | "Yes — and the part that surprises most is [X]." |
| Discordo educadamente | "I see it differently because [Y]. Curious about your data on [Z]." |
| Não sei | "Honestly don't know — I'd check [reference] before assuming." |
| Correção fatual | "Small correction: [fato]. Source: [link]." |
| Agradecimento | "Means a lot, thanks!" (curto, sem rebuscar) |

## 3. Quando ignorar

- Trolls óbvios: pessoal, baixo engajamento, anônimo, padrão troll.
- Bait political: não morder.
- Pedidos genéricos de "ensina isso aí" sem contexto.

## 4. Quando escalar humano

- Acusação grave / legal threat.
- Conflito com figura influente do nicho.
- Errata em produto/serviço do user.
- Reply que pode virar viral negativo.

## 5. Cadence

- Replies em batch (3-4x/dia) > resposta imediata.
- Não responder DMs hostis (deixar para o user).
- Quiet hours: queue-up replies, publicar de manhã.
