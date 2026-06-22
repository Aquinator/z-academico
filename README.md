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

**Em produção (Railway)**, cada serviço tem domínio público próprio e é acessado diretamente (sem gateway intermediário); o gateway Nginx é usado apenas no ambiente local via Docker Compose.

## Serviços

| Serviço | Porta local | Responsabilidade |
|---|---|---|
| `auth-service` | 3001 | Registro, login, emissão e validação de JWT |
| `academic-service` | 3002 | Alunos, turmas, disciplinas, matrículas |
| `gateway` | 8080 | Proxy reverso, roteamento (apenas ambiente local) |
| `frontend` | — | Painel HTML estático de verificação/demonstração |

## Stack

- **Node.js 20 + Express** — auth-service e academic-service
- **PostgreSQL 16** — um banco por serviço, sem compartilhamento
- **JWT** — autenticação stateless entre serviços
- **Docker** — multi-stage builds (development / test / production) em cada serviço
- **Nginx** — gateway reverso (ambiente local)
- **GitHub Actions** — pipelines de CI e CD
- **Docker Hub** — registry das imagens versionadas
- **Railway** — hospedagem dos serviços e bancos em produção
- **Prometheus + Grafana** — observabilidade
- **Git Flow** — estratégia de branches

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

### Subir o ambiente completo

```bash
git clone https://github.com/<org>/z-academico.git
cd z-academico

# .env precisa existir TANTO na raiz quanto em infra/
cp .env.example .env
cp .env.example infra/.env
# edite os dois com valores reais (especialmente JWT_SECRET)

cd infra
docker compose up --build
```

> **Por que dois `.env`?** O Compose usa o `.env` ao lado do `docker-compose.yml` para resolver variáveis `${VAR}` escritas diretamente no YAML, e o `env_file: ../.env` para injetar variáveis dentro dos containers. Os dois mecanismos são independentes — ver `docs/sprint2-review-sdd.md` para o histórico completo desse troubleshooting.

### Serviços disponíveis após o boot

| URL | Serviço |
|---|---|
| http://localhost:8080 | API Gateway |
| http://localhost:3001/health | Auth Health |
| http://localhost:3002/health | Academic Health |
| http://localhost:9090 | Prometheus |
| http://localhost:3000 | Grafana (admin/admin) |

### Frontend local

```bash
cd frontend
python -m http.server 5500
```
Acesse `http://localhost:5500` e configure as URLs como `http://localhost:3001` e `http://localhost:3002` na tela de Configuração.

---

## Como acessar a produção

Os serviços estão hospedados no Railway com PostgreSQL gerenciado próprio para cada um. As URLs públicas estão documentadas em `docs/sprint3-cd-railway.md` e configuradas como secrets no GitHub (`RAILWAY_AUTH_SERVICE_URL`, `RAILWAY_ACADEMIC_SERVICE_URL`).

Para usar o frontend contra produção, basta abrir `frontend/index.html` e colar essas URLs na tela de Configuração.

---

## Pipeline CI/CD

```
Push / PR → CI (.github/workflows/ci.yml):
  ├── lint (ESLint)
  ├── testes unitários (Jest)
  ├── análise de segurança (npm audit)
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

Esse ponto está documentado em detalhe em `docs/sprint3-cd-railway.md`, incluindo o histórico de tentativas com a Railway CLI e os erros encontrados.

---

## Observabilidade

- **Health checks**: `GET /health` em todos os serviços, retornando `{ status, service, timestamp, uptime }`
- **Logs estruturados**: JSON via Winston, com campo `service` para identificar origem
- **Métricas**: Prometheus coleta de `auth-service:3001/metrics` e `academic-service:3002/metrics`
- **Dashboard**: Grafana provisionado automaticamente com o dashboard "z-academico — Visão Geral" (requisições HTTP, latência p99, tentativas de login, usuários registrados)

---

## Estrutura do repositório

```
z-academico/
├── frontend/                 # Painel HTML estático de verificação
│   ├── index.html
│   └── README.md
├── services/
│   ├── auth-service/         # Autenticação e usuários
│   ├── academic-service/     # Domínio acadêmico
│   └── assignment-service/   # Planejado, não implementado
├── gateway/                  # Nginx reverse proxy (ambiente local)
├── infra/
│   ├── docker-compose.yml
│   └── monitoring/
│       ├── prometheus/
│       └── grafana/
├── docs/                      # Documentação técnica, ADRs, histórico de troubleshooting
├── .github/
│   ├── workflows/             # ci.yml, cd.yml
│   └── ISSUE_TEMPLATE/
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
| Railway (não Render) | Mudança feita durante a execução — ver `docs/sprint3-cd-railway.md` para o histórico completo |
| Frontend estático sem framework | Risco mínimo de quebra antes da apresentação; requisito surgiu depois do planejamento original |


## Decisões e escopo

**Sobre o `assignment-service`:** o enunciado lista esse serviço em "Serviços Esperados", mas o requisito mínimo de arquitetura exige apenas **2 microsserviços** — que o projeto já entrega (`auth-service` + `academic-service`), com API Gateway, banco de dados real e autenticação funcionando de ponta a ponta. Diante do prazo entre o Sprint 2 e o Sprint 3, a decisão foi priorizar a qualidade e validação completa dos dois serviços centrais, do pipeline CI/CD e da observabilidade, em vez de adicionar um terceiro serviço raso só para cumprir a lista de exemplos. O modelo de dados para `Atividade` e `Entrega` já existe no modelo conceitual (ver slide 6 do enunciado) e fica documentado como extensão natural para trabalho futuro.


