# Plataforma Acadêmica — DevOps Microsserviços

Projeto final de Engenharia de Software. Plataforma de gerenciamento acadêmico construída com arquitetura de microsserviços, CI/CD automatizado via GitHub Actions, deploy em produção no Railway e observabilidade com Prometheus + Grafana.

---

## Arquitetura

```
┌──────────────────────────┐
│   Frontend (estático)    │  index.html — painel de verificação
└────────────┬──────────────┘
             │ HTTPS
      ┌──────▼───────┐
      │   Gateway    │  :8080 (Nginx) — apenas no ambiente local
      └──┬───────┬───┘
         │       │
┌────────▼──┐ ┌──▼────────────┐
│auth-service│ │academic-service│
│  :3001     │ │    :3002       │
└────────┬───┘ └──┬────────────┘
         │        │
┌────────▼──┐ ┌──▼────────────┐
│  auth-db  │ │  academic-db  │
│ (Postgres)│ │  (Postgres)   │
└───────────┘ └───────────────┘

Observabilidade:
  Prometheus :9090 → coleta métricas de ambos os serviços
  Grafana    :3000 → dashboard "z-academico — Visão Geral"
```

**Em produção (Railway)**, cada serviço tem domínio público próprio e é acessado diretamente (sem gateway intermediário); o gateway Nginx, o Prometheus e o Grafana são usados apenas no ambiente local via Docker Compose.

### Serviços

| Serviço | Porta local | Responsabilidade |
|---|---|---|
| `auth-service` | 3001 | Registro, login, emissão e validação de JWT |
| `academic-service` | 3002 | Alunos, professores, disciplinas, turmas e matrículas |
| `gateway` | 8080 | Proxy reverso Nginx — roteamento entre serviços (ambiente local) |
| `prometheus` | 9090 | Coleta de métricas dos serviços (ambiente local) |
| `grafana` | 3000 | Visualização de métricas e dashboards (ambiente local) |
| `frontend` | — | Painel HTML estático de verificação/demonstração |

### Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20 LTS + Express 4 |
| Banco de dados | PostgreSQL 16 Alpine (instância separada por serviço) |
| Gateway | Nginx 1.25 Alpine |
| Autenticação | JWT (jsonwebtoken) — stateless |
| Métricas | prom-client 15 — Counter, Histogram, Gauge |
| Logs | Winston — JSON estruturado com stack trace |
| Observabilidade | Prometheus 2.51 + Grafana 10.4 |
| CI/CD | GitHub Actions + Docker Hub + Railway |
| Containers | Docker + Docker Compose (multi-stage builds: development / test / production) |
| Frontend | HTML/CSS/JS estático, sem framework |

## Ambientes

| Ambiente | Onde roda | Como acessar |
|---|---|---|
| Local | Docker Compose | `http://localhost:8080` (gateway) |
| Produção | Railway | URLs públicas geradas por serviço (ver Secrets do GitHub ou painel do Railway) |

---

## Como rodar localmente

### Pré-requisitos

- Docker Desktop >= 24 (rodando)
- Docker Compose >= 2.20
- Git

### 1. Clonar o repositório

```bash
git clone https://github.com/<org>/z-academico.git
cd z-academico
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
cp .env.example infra/.env
# editar os dois arquivos com valores reais
```

> **Por que dois `.env`?** O Compose usa o `.env` ao lado do `docker-compose.yml` (em `infra/`) para resolver variáveis `${VAR}` escritas diretamente no YAML, e o `env_file: ../.env` para injetar variáveis dentro dos containers. Os dois mecanismos são independentes — ver `docs/TROUBLESHOOTING.md` para o histórico completo desse problema.

**Variáveis obrigatórias:**

| Variável | Descrição |
|---|---|
| `AUTH_DB_USER` | Usuário do banco do auth-service |
| `AUTH_DB_PASSWORD` | Senha do banco do auth-service |
| `AUTH_DB_NAME` | Nome do banco do auth-service |
| `ACADEMIC_DB_USER` | Usuário do banco do academic-service |
| `ACADEMIC_DB_PASSWORD` | Senha do banco do academic-service |
| `ACADEMIC_DB_NAME` | Nome do banco do academic-service |
| `JWT_SECRET` | Chave secreta para assinatura dos tokens JWT |
| `JWT_EXPIRES_IN` | Validade dos tokens (padrão: `7d`) |

### 3. Subir o ambiente completo

```bash
cd infra
docker compose up --build
```

> **Nota:** o healthcheck do gateway usa `127.0.0.1` (IPv4 explícito) em vez de `localhost` para evitar resolução via IPv6 em ambientes Alpine — garantindo que todos os containers fiquem `healthy` corretamente.

### 4. Verificar status dos containers

```bash
docker compose ps
```

Todos os 7 containers devem aparecer com status `healthy`:

```
NAME               STATUS
academic-db        Up (healthy)
academic-service   Up (healthy)
auth-db            Up (healthy)
auth-service       Up (healthy)
gateway            Up (healthy)
grafana            Up (running)
prometheus         Up (healthy)
```

### 5. Acessar os serviços

| URL | Serviço |
|---|---|
| http://localhost:8080 | API Gateway (ponto de entrada) |
| http://localhost:3001/health | Auth Service — health direto |
| http://localhost:3002/health | Academic Service — health direto |
| http://localhost:9090/targets | Prometheus — targets ativos |
| http://localhost:3000 | Grafana — dashboards (admin/admin) |

### Frontend local

```bash
cd frontend
python -m http.server 5500
```
Acesse `http://localhost:5500` e configure as URLs como `http://localhost:3001` e `http://localhost:3002` na tela de Configuração.

---

## Como acessar a produção

Os serviços estão hospedados no Railway, com PostgreSQL gerenciado próprio para cada um. As URLs públicas estão configuradas como secrets no GitHub (`RAILWAY_AUTH_SERVICE_URL`, `RAILWAY_ACADEMIC_SERVICE_URL`).

Para usar o frontend contra produção, basta abrir `frontend/index.html` e colar essas URLs na tela de Configuração.

> Grafana e Prometheus **não estão deployados em produção** — existem apenas no ambiente local. Para demonstrar observabilidade, é necessário ter o `docker compose up` rodando.

---

## Observabilidade

### Prometheus

O Prometheus coleta métricas dos dois serviços a cada 10 segundos via endpoint `/metrics` (formato padrão OpenMetrics).

**Métricas expostas pelo `auth-service`:**
- `auth_http_requests_total` — total de requisições por método, rota e status
- `auth_http_request_duration_seconds` — latência das requisições (histograma)
- `auth_login_attempts_total` — tentativas de login por resultado (`success` / `failure`)
- `auth_registered_users_total` — total de usuários registrados (gauge)

**Métricas expostas pelo `academic-service`:**
- `academic_http_requests_total` — total de requisições por método, rota e status
- `academic_http_request_duration_seconds` — latência das requisições (histograma)

Para verificar os targets ativos:
```
http://localhost:9090/targets
```
Os três targets (`prometheus`, `auth-service`, `academic-service`) devem estar com status **UP**.

### Grafana

O dashboard **z-academico — Visão Geral** é provisionado automaticamente na inicialização e contém 6 painéis:

| Painel | Tipo | Métrica |
|---|---|---|
| Requisições HTTP — auth-service | Time series | `rate(auth_http_requests_total[1m])` |
| Latência p99 — auth-service | Time series | `histogram_quantile(0.99, ...)` |
| Tentativas de Login | Stat | `auth_login_attempts_total` |
| Usuários Registrados | Stat | `auth_registered_users_total` |
| Requisições HTTP — academic-service | Time series | `rate(academic_http_requests_total[1m])` |
| Latência p99 — academic-service | Time series | `histogram_quantile(0.99, ...)` |

Acesso: `http://localhost:3000` — login `admin` / `admin`

### Health checks e logs

- **Health checks**: `GET /health` em todos os serviços, retornando `{ status, service, timestamp, uptime }`
- **Logs estruturados**: JSON via Winston, com campo `service` para identificar origem e stack trace em erros

---

## Pipeline CI/CD

```
Push em feature/* ou develop → CI (.github/workflows/ci.yml):
  ├── lint (ESLint)
  ├── testes unitários (Jest + cobertura)
  ├── auditoria de segurança (npm audit)
  └── build Docker (verificação, target=production)

Push em main → CD (.github/workflows/cd.yml):
  ├── geração de tag semântica automática
  ├── build das imagens (target=production)
  ├── push para Docker Hub
  ├── criação da tag no repositório Git
  └── health check pós-deploy nas URLs de produção
```

### Limitação conhecida do CD

O deploy final no Railway **não é disparado automaticamente** pelo pipeline. A Railway CLI exige um Project Token que, por sua vez, exige verificação de pagamento na conta — uma barreira da plataforma, não da arquitetura do pipeline. Na prática:

- O CI e a publicação de imagens (build → tag → push → tag Git) são **100% automatizados**
- O redeploy do container no Railway é feito **manualmente** no painel após a nova imagem ser publicada, ou depende de auto-deploy configurado no serviço (se disponível no plano)

---

## Estratégia de Branches (Git Flow)

```
main       ← produção, protegida, CD dispara aqui
develop    ← integração, CI roda em todo push
feature/*  ← desenvolvimento de features individuais
fix/*      ← correções pontuais
```

**Convenção de commits:** [Conventional Commits](https://www.conventionalcommits.org/)

```
feat: adiciona endpoint de matrícula
fix: corrige validação de token expirado
test: adiciona casos de teste para turmaController
docs: atualiza README com seção de observabilidade
ci: corrige job de build no GitHub Actions
```

---

## Estrutura do repositório

```
z-academico/
├── frontend/                  # Painel HTML estático de verificação
│   ├── index.html
│   └── README.md
├── services/
│   ├── auth-service/          # Autenticação e usuários
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   ├── middlewares/
│   │   │   └── utils/         # logger.js, metrics.js, database.js
│   │   ├── tests/
│   │   └── Dockerfile
│   └── academic-service/      # Domínio acadêmico
│       ├── src/
│       │   ├── controllers/   # aluno, professor, disciplina, turma
│       │   ├── models/
│       │   ├── routes/
│       │   ├── middlewares/
│       │   └── utils/         # logger.js, metrics.js, database.js
│       ├── tests/
│       └── Dockerfile
├── gateway/
│   ├── nginx.conf              # Proxy reverso e roteamento
│   └── Dockerfile
├── infra/
│   ├── docker-compose.yml
│   └── monitoring/
│       ├── prometheus/
│       │   └── prometheus.yml
│       └── grafana/
│           ├── provisioning/
│           │   ├── datasources/prometheus.yml
│           │   └── dashboards/default.yml
│           └── dashboards/
│               └── z-academico.json
├── docs/
│   ├── ADR.md                  # Architecture Decision Records
│   └── TROUBLESHOOTING.md      # Bugs conhecidos e soluções durante o desenvolvimento
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
├── .env.example
└── README.md
```

---

## Decisões técnicas (ADR resumido)

| Decisão | Justificativa |
|---|---|
| Node.js + Express | Produtividade, ecossistema amplo, fácil containerização |
| PostgreSQL, um banco por serviço | Isolamento real entre microsserviços — nenhum serviço acessa o banco de outro diretamente |
| JWT stateless | Adequado para comunicação entre serviços sem sessão compartilhada |
| Git Flow | Rastreabilidade clara por sprint e PR, mais demonstrável para a avaliação que trunk-based |
| Railway (não Render) | Mudança feita durante a execução |
| Frontend estático sem framework | Risco mínimo de quebra antes da apresentação; requisito surgiu depois do planejamento original |
| Healthcheck via `127.0.0.1` no gateway | Evita resolução IPv6 em ambientes Alpine, que causava falso-negativo de `unhealthy` |

Detalhamento completo das decisões em [docs/ADR.md](./docs/ADR.md).

## Decisões e escopo

**Sobre o `assignment-service`:** o enunciado lista esse serviço em "Serviços Esperados", mas o requisito mínimo de arquitetura exige apenas **2 microsserviços** — que o projeto já entrega (`auth-service` + `academic-service`), com API Gateway, banco de dados real e autenticação funcionando de ponta a ponta.

**Sobre o frontend:** não fazia parte do escopo original. Foi adicionado depois como camada mínima de demonstração — ver `frontend/README.md` para as justificativas de escolha técnica.

---

## Troubleshooting

Encontrou problemas ao subir o ambiente? Consulte o guia com os bugs documentados durante o desenvolvimento:

📄 [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

Cobre: race condition Postgres × Node, hostname incorreto no `DATABASE_URL`, `proxy_pass` mal configurado no Nginx, dependência faltando no `package.json`, conflito de porta no host, healthcheck via IPv6 no Alpine, `database.js` sobrescrito por engano, tabelas nunca criadas por falta de chamada a `createTables()`, e a limitação de deploy automatizado no Railway.

## Documentação adicional

| Arquivo | Conteúdo |
|---|---|
| `docs/ADR.md` | Architecture Decision Records detalhados |
| `docs/TROUBLESHOOTING.md` | Bugs conhecidos e soluções |
