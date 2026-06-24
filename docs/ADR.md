# Architecture Decision Records — z-academico

Registro das decisões técnicas tomadas ao longo do projeto.

---

## ADR-001 — Node.js + Express como runtime dos microsserviços

**Data:** Sprint 1 | **Status:** Aceito

### Contexto
A equipe precisava de um runtime com ecossistema amplo, containerização simples e curva de aprendizado compatível com o prazo semestral.

### Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| **Node.js + Express** | Familiaridade, imagem Alpine ~150MB, ecossistema npm amplo | Single-threaded para CPU-bound |
| Python + FastAPI | Async nativo, tipagem Pydantic | Curva adicional para equipe JS |
| Java + Spring Boot | Robusto, tipagem forte | Imagem ~500MB, boot lento |
| Go | Performance excelente | Curva alta para projeto semestral |

### Decisão
Node.js 20 LTS + Express 4. Familiaridade da equipe e leveza das imagens foram determinantes.

### Consequências
- Imagens Docker compactas, build rápido no CI
- `prom-client` e `winston` disponíveis nativamente
- Limitação: workloads CPU-intensivos devem ser evitados

---

## ADR-002 — PostgreSQL como banco de dados relacional

**Data:** Sprint 1 | **Status:** Aceito

### Contexto
O domínio acadêmico tem relacionamentos bem definidos (alunos → matrículas → turmas → disciplinas) que exigem integridade referencial e constraints de unicidade.

### Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| **PostgreSQL 16** | ACID, constraints nativos, imagem Alpine leve | Volume persistente necessário em produção |
| MySQL | Familiar, amplamente suportado | Comportamento de NULL diverge do padrão SQL |
| MongoDB | Schema flexível | Sem integridade referencial nativa |
| SQLite | Zero configuração | Não suporta conexões concorrentes em container |

### Decisão
PostgreSQL 16 Alpine. A constraint `UNIQUE` nativa trata matrículas duplicadas via erro `23505`, eliminando lógica extra no serviço.

### Consequências
- Banco separado por serviço (auth-db e academic-db) — isolamento real entre domínios
- Healthcheck `pg_isready` garante que Node não sobe antes do banco estar pronto
- Em produção, necessário provisionar banco gerenciado (ver ADR-005)

---

## ADR-003 — JWT para autenticação stateless entre microsserviços

**Data:** Sprint 1 | **Status:** Aceito

### Contexto
O `academic-service` precisa validar identidade do usuário sem manter sessão própria e sem round-trip ao banco em cada requisição.

### Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| **JWT (jsonwebtoken)** | Stateless, payload customizável (`tipo`, `sub`) | Não revogável antes da expiração sem blocklist |
| Sessions + Redis | Revogação imediata | Dependência adicional, estado compartilhado |
| OAuth 2.0 / OIDC | Padrão de mercado | Complexidade desproporcional ao escopo |
| API Keys estáticas | Simples | Sem expiração, sem identidade por requisição |

### Decisão
JWT com `jsonwebtoken`, expiração via `JWT_EXPIRES_IN` (padrão `7d`). O `academic-service` delega validação ao `auth-service` via `authClient.validateToken` — não valida o token diretamente.

### Por que essa decisão é central na arquitetura (importante para apresentação)

O `academic-service` **não tem acesso ao `JWT_SECRET`**, de propósito. Isso significa que ele é incapaz de forjar ou validar um token sozinho — toda vez que precisa confirmar quem é o usuário, ele faz uma chamada HTTP real para `POST /auth/validate` no `auth-service`. Esse é o ponto exato onde os dois microsserviços "conversam": uma chamada síncrona, serviço-a-serviço, autenticada pelo próprio token que está sendo validado.

```
Cliente → academic-service (com JWT no header)
              │
              │  academic-service NÃO sabe validar o token sozinho
              ▼
         POST /auth/validate { token }  → auth-service
              │
              │  auth-service decodifica com o JWT_SECRET (que só ele tem)
              ▼
         { sub, email, tipo, exp }  ← resposta
              │
              ▼
   academic-service segue com a requisição original,
   agora sabendo quem é o usuário (req.user)
```

### Consequências
- Campo `tipo` no payload (`admin`, `professor`, `aluno`) habilita autorização por role sem consulta ao banco
- `authMiddleware.js` é reutilizável em qualquer serviço futuro
- Cada validação de token no `academic-service` gera uma chamada de rede adicional ao `auth-service` — overhead aceito pelo ganho de isolamento de segredo
- Revogação de tokens exige implementação de blocklist se necessário
- **Acoplamento de disponibilidade**: se `auth-service` cair, `academic-service` não consegue validar tokens novos, retornando `503 AUTH_SERVICE_UNAVAILABLE` (ver `authClient.js`)

---

## ADR-004 — Git Flow como estratégia de branches

**Data:** Sprint 1 | **Status:** Aceito

### Contexto
Projeto desenvolvido por dupla com entregas avaliadas por sprint. Necessário rastreabilidade por sprint, code review obrigatório e compatibilidade com CI/CD via GitHub Actions.

### Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| **Git Flow** | Rastreabilidade por sprint, PRs obrigatórios, CI/CD compatível | Overhead maior para equipes pequenas |
| Trunk-based | Simples, CI contínuo | Sem isolamento por feature |
| GitHub Flow | Simples, PR sempre em main | Sem branch de integração (develop) |

### Decisão
Git Flow adaptado: `main` (produção, protegida), `develop` (integração, CI em todo push), `feature/*`, `fix/*`. Commits seguem Conventional Commits.

### Consequências
- CD dispara apenas em push para `main` — deploys são deliberados
- Issues fechadas automaticamente via `Closes #N` nos commits
- Histórico de commits documenta progresso sprint a sprint
- **Nota de transparência:** as branches `feature/auth-service` e `feature/academic-service` do Sprint 1 foram, na prática, incorporadas direto em `develop`/`main` sem PR formal. A partir do Sprint 2, o fluxo de PR + review foi seguido rigorosamente (`feature/ci-pipeline`, `fix/ambiente-academic-service`, `feature/cd-deploy`)

---

## ADR-005 — Plataforma de deploy em produção: Render → Railway

**Data original:** Sprint 3 | **Status:** **Superado** (ver ADR-005-R)

### Contexto
Necessário deploy de containers Docker com integração ao Docker Hub, plano gratuito funcional para demonstração e sem necessidade de configurar VPS manualmente.

### Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| Render | Docker nativo, deploy via webhook, Postgres gerenciado, plano free | Sleep após 15min de inatividade no plano free |
| **Railway** | Interface moderna, deploy rápido, Postgres gerenciado integrado ao projeto | Plano free limitado, CLI exige verificação de pagamento |
| Fly.io | Performance, regiões globais | Curva de aprendizado maior, configuração via TOML |
| VPS (DigitalOcean) | Controle total | Custo fixo mensal, fora do escopo |
| Heroku | Familiar | Plano gratuito descontinuado em 2022 |

### Decisão original
Render foi a escolha inicial. O fluxo "Deploy from Docker Hub" integraria com o `cd.yml` via API REST do Render.

### Por que esta decisão foi superada
Durante a execução prática do Sprint 3, a configuração de contas e o fluxo de deploy se mostraram mais diretos no **Railway** — bancos PostgreSQL gerenciados são criados como serviços dentro do mesmo projeto, com variáveis referenciáveis automaticamente entre serviços (`${{servico.VARIAVEL}}`), e a configuração de domínio público foi mais simples no fluxo real testado pela equipe.

Ver **ADR-005-R** para a decisão final e suas consequências reais (incluindo uma limitação relevante encontrada).

---

## ADR-005-R — Railway como plataforma de deploy (revisão do ADR-005)

**Data:** Sprint 3 | **Status:** Aceito (substitui ADR-005)

### Contexto
Mesmo contexto do ADR-005. Esta revisão documenta a decisão final, efetivamente implementada e testada em produção.

### Decisão
Railway, com um serviço PostgreSQL gerenciado próprio para `auth-service` e outro para `academic-service`, dentro do mesmo projeto Railway. Imagens publicadas no Docker Hub via GitHub Actions, consumidas pelo Railway como `Docker Image` source.

### Consequências — incluindo uma limitação real e documentada

**Positivas:**
- Banco PostgreSQL provisionado em poucos cliques, sem configuração de string de conexão manual (referência automática `${{servico.PGHOST}}`, etc.)
- Domínio público HTTPS gerado automaticamente por serviço
- Variáveis de ambiente configuráveis via painel, nunca commitadas no repositório

**Negativas — limitação central, registrada para transparência técnica:**
- A Railway CLI, usada para automatizar o redeploy via GitHub Actions, exige um **Project Token**, que por sua vez exige **verificação de pagamento (cartão de crédito)** na conta — uma barreira da plataforma, não da arquitetura do pipeline
- Por isso, o pipeline de CD automatiza **100%** do processo até a publicação da imagem no Docker Hub (build, versionamento semântico, tag Git), mas o **redeploy final no Railway é manual**, feito no painel após a nova imagem ser publicada
- Essa decisão de aceitar o redeploy manual, em vez de pagar para desbloquear a automação completa, foi deliberada — não houve tempo nem necessidade de contornar a barreira para o escopo acadêmico do projeto

---

## ADR-006 — Healthcheck do gateway via IP explícito (127.0.0.1) em vez de `localhost`

**Data:** Sprint 3 | **Status:** Aceito

### Contexto
O container do `gateway` (Nginx) era marcado como `unhealthy` pelo Docker mesmo respondendo corretamente a requisições reais na porta 8080.

### Diagnóstico
O healthcheck definido em `docker-compose.yml` usava:
```
wget -qO- http://localhost/health
```
Em alguns ambientes Alpine, `localhost` resolve preferencialmente para `::1` (IPv6) antes de `127.0.0.1` (IPv4). Se a configuração de rede do container não responde de forma consistente em IPv6 — mesmo com o Nginx escutando corretamente em `0.0.0.0:80` (IPv4) — o `wget` falha a tentativa via IPv6, e o Docker marca o container como `unhealthy`, apesar do serviço estar 100% funcional via IPv4 (inclusive para o tráfego real do host, mapeado via `ports: "8080:80"`).

### Decisão
Trocar o healthcheck para usar o IP explícito:
```
wget -qO- http://127.0.0.1/health
```
Isso elimina a ambiguidade de resolução de DNS local, forçando IPv4 diretamente.

### Consequências
- Erro silencioso e enganoso eliminado: antes, o gateway parecia "quebrado" (status `unhealthy`) mesmo funcionando — esse tipo de falso-negativo é particularmente perigoso em demonstrações ao vivo
- Padrão a ser replicado em qualquer healthcheck futuro que use `localhost` dentro de containers Alpine
- Esta classe de bug está documentada com mais detalhe técnico em `docs/TROUBLESHOOTING.md`

---

## ADR-007 — Frontend estático sem framework para demonstração

**Data:** Sprint 3 (pós-planejamento original) | **Status:** Aceito

### Contexto
O escopo original do projeto (disciplina de DevOps) não exigia frontend — os critérios de avaliação focam em arquitetura, Git, containerização, CI/CD e observabilidade. A necessidade de uma interface visual de demonstração surgiu posteriormente.

### Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| **HTML/CSS/JS estático, arquivo único** | Zero build step, zero dependência externa, abre direto no navegador | Sem componentização, tudo em um arquivo |
| React (Vite/CRA) | Componentização, ecossistema maduro | Build step adicional, risco de quebra de dependências antes da apresentação |
| Next.js | SSR, roteamento embutido | Overhead desproporcional para uma tela de verificação |

### Decisão
Painel HTML estático de arquivo único (`frontend/index.html`), sem dependência de framework ou bundler. As URLs dos serviços (`auth-service`, `academic-service`) são configuráveis em runtime pela própria interface e persistidas via `localStorage`, permitindo que o mesmo arquivo funcione tanto contra o ambiente local quanto contra produção (Railway), sem qualquer alteração de código.

### Consequências
- Risco de falha técnica no dia da apresentação reduzido ao mínimo — não há `npm install`, build, ou versão de Node específica envolvida
- Funcionalidade deliberadamente limitada: apenas criação e listagem (sem edição/exclusão pela UI), suficiente para demonstrar o fluxo de ponta a ponta entre os dois microsserviços
- Campos de relacionamento (ex: `professorId` ao criar turma) são preenchidos via `<select>` populado dinamicamente pelas APIs reais, evitando a necessidade de copiar UUIDs manualmente durante a demonstração