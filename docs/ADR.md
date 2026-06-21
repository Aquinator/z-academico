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
- Em produção, necessário provisionar Render Postgres ou serviço externo

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

### Consequências
- Campo `tipo` no payload (`admin`, `professor`, `aluno`) habilita autorização por role sem consulta ao banco
- `authMiddleware.js` é reutilizável em qualquer serviço futuro
- Revogação de tokens exige implementação de blocklist se necessário

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
Git Flow adaptado: `main` (produção, protegida), `develop` (integração, CI em todo push), `feature/*`, `release/*`, `hotfix/*`. Commits seguem Conventional Commits.

### Consequências
- CD dispara apenas em push para `main` — deploys são deliberados
- Issues fechadas automaticamente via `Closes #N` nos commits
- Histórico de commits documenta progresso sprint a sprint

---

## ADR-005 — Render como plataforma de deploy em produção

**Data:** Sprint 3 | **Status:** Aceito

### Contexto
Necessário deploy de containers Docker com integração ao Docker Hub, plano gratuito funcional para demonstração e sem necessidade de configurar VPS manualmente.

### Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| **Render** | Docker nativo, deploy via webhook, Postgres gerenciado, plano free | Sleep após 15min de inatividade no plano free |
| Railway | Interface moderna, deploy rápido | Plano free limitado a horas mensais |
| Fly.io | Performance, regiões globais | Curva de aprendizado maior, configuração via TOML |
| VPS (DigitalOcean) | Controle total | Custo fixo mensal, fora do escopo |
| Heroku | Familiar | Plano gratuito descontinuado em 2022 |

### Decisão
Render. O fluxo "Deploy from Docker Hub" integra diretamente com o `cd.yml`: o workflow publica a imagem e aciona o Render via API REST. Render Postgres resolve banco em produção sem configuração adicional.

### Consequências
- Serviços entram em sleep após 15min no plano free — iniciar demonstração com ~2min de antecedência
- Variáveis de ambiente configuradas na UI do Render, nunca commitadas no repositório
- URLs no formato `https://z-academico-auth.onrender.com` devem ser adicionadas ao README após o primeiro deploy