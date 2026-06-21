# Plataforma Acadêmica — DevOps Microsserviços

Projeto final de Engenharia de Software. Plataforma escalável de gerenciamento acadêmico construída com arquitetura de microsserviços, CI/CD automatizado via GitHub Actions e observabilidade com Prometheus + Grafana.

---

## Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                     Clientes                        │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP
                ┌──────▼───────┐
                │   Gateway    │  :8080
                │   (Nginx)    │
                └──┬───────┬───┘
                   │       │
        ┌──────────▼──┐ ┌──▼──────────────┐
        │ auth-service│ │academic-service  │
        │   :3001     │ │    :3002         │
        └──────────┬──┘ └──┬──────────────┘
                   │       │
        ┌──────────▼──┐ ┌──▼──────────────┐
        │   auth-db   │ │   academic-db   │
        │ (Postgres)  │ │  (Postgres)     │
        └─────────────┘ └─────────────────┘

Observabilidade:
  Prometheus :9090 ← coleta métricas de auth e academic
  Grafana    :3000 ← dashboards em tempo real
```

### Serviços

| Serviço | Porta | Responsabilidade |
|---|---|---|
| `auth-service` | 3001 | Registro, login, emissão e validação de JWT |
| `academic-service` | 3002 | Alunos, disciplinas, turmas e matrículas |
| `gateway` | 8080 | Proxy reverso Nginx — roteamento entre serviços |
| `prometheus` | 9090 | Coleta de métricas dos serviços |
| `grafana` | 3000 | Visualização de métricas e dashboards |

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
| CI/CD | GitHub Actions + Railway |
| Containers | Docker + Docker Compose |

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

---

## Como rodar localmente

### Pré-requisitos

- Docker >= 24
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
# Editar .env com as senhas dos bancos e o JWT_SECRET
```

Variáveis obrigatórias:

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
docker compose up -d
```

> **Nota:** O healthcheck do gateway usa `127.0.0.1` (IPv4 explícito) em vez de `localhost` para evitar resolução via IPv6 em ambientes Alpine — garantindo que todos os containers fiquem `healthy` corretamente.

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

---

## Pipeline CI/CD

```
Push em feature/* ou develop → CI:
  ├── lint (ESLint)
  ├── testes unitários (Jest + cobertura)
  ├── auditoria de segurança (npm audit)
  └── build Docker (verificação target=production)

Merge em main → CD (Railway):
  ├── build das imagens Docker
  ├── tag semântica automática
  └── deploy automático no Railway
```

---

## Estratégia de Branches (Git Flow)

```
main       ← produção, protegida, CD dispara aqui
develop    ← integração, CI roda em todo push
feature/*  ← desenvolvimento de features individuais
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
├── services/
│   ├── auth-service/         # Autenticação e usuários
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   ├── middlewares/
│   │   │   └── utils/        # logger.js, metrics.js, database.js
│   │   ├── tests/
│   │   └── Dockerfile
│   └── academic-service/     # Domínio acadêmico
│       ├── src/
│       │   ├── controllers/  # aluno, disciplina, turma
│       │   ├── models/
│       │   ├── routes/
│       │   ├── middlewares/
│       │   └── utils/        # logger.js, metrics.js, database.js
│       ├── tests/
│       └── Dockerfile
├── gateway/
│   ├── nginx.conf            # Proxy reverso e roteamento
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
│   ├── ADR.md                # Architecture Decision Records
│   └── TROUBLESHOOTING.md   # Bugs conhecidos e soluções
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
├── .env.example
└── README.md
```

---

## Troubleshooting

Encontrou problemas ao subir o ambiente? Consulte o guia com os bugs documentados durante o desenvolvimento:

📄 [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

Cobre: race condition Postgres × Node, hostname incorreto no `DATABASE_URL`, `proxy_pass` mal configurado no Nginx, dependência faltando no `package.json`, conflito de porta no host e healthcheck via IPv6 no Alpine.
