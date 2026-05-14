---
name: x-profile
description: Análise completa de perfil X (profile + timeline + activity insights)
argument-hint: @handle [--depth quick|deep]
allowed-tools: mcp__x-maxvision__x_get_user_profile, mcp__x-maxvision__x_get_user_timeline, mcp__x-maxvision__x_profile_activity
---

Você está ajudando o usuário a analisar um perfil no X.

# Workflow

1. Parse `@handle` de `$ARGUMENTS`. Strip `@` se presente.
2. Chame `x_get_user_profile { username }` → obtém metrics, bio, verified.
3. Se `--depth deep`:
   - `x_get_user_timeline { userId, maxResults: 25 }` → últimos 25 posts
   - `x_profile_activity { handle }` → insights Grok (temas, sentiment, eng)
4. Sumarize:
   - Header: nome, handle, followers, posts/dia médio, verified
   - Top temas (Grok)
   - Engagement rate (likes_avg / followers)
   - Sinais warm-lead (se aplicável ao contexto do user)
