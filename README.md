# Plataforma Acadêmica — DevOps Microsserviços

Projeto final de Engenharia de Software. Plataforma escalável de gerenciamento acadêmico construída com arquitetura de microsserviços, CI/CD automatizado via GitHub Actions e observabilidade com Prometheus + Grafana.

---

## Arquitetura

```
┌─────────────────────────────────────────────────┐
│                   Clientes                      │
└────────────────────┬────────────────────────────┘
                     │ HTTP
              ┌──────▼───────┐
              │   Gateway    │  :8080
              │  (Nginx)     │
              └──┬───────┬───┘
                 │       │
        ┌────────▼──┐ ┌──▼────────────┐
        │auth-service│ │academic-service│
        │  :3001     │ │    :3002       │
        └────────┬───┘ └──┬────────────┘
                 │        │
        ┌────────▼──┐ ┌──▼────────────┐
        │  DB auth  │ │  DB academic  │
        │ (Postgres)│ │  (Postgres)   │
        └───────────┘ └───────────────┘

Observabilidade:
  Prometheus :9090 → coleta métricas de todos os serviços
  Grafana    :3000 → dashboards
```

## Serviços

| Serviço | Porta | Responsabilidade |
|---|---|---|
| `auth-service` | 3001 | Registro, login, emissão e validação de JWT |
| `academic-service` | 3002 | Alunos, turmas, disciplinas, matrículas |
| `assignment-service` | 3003 | Atividades e entregas |
| `gateway` | 8080 | Proxy reverso, roteamento |

## Como rodar localmente

### Pré-requisitos
- Docker >= 24
- Docker Compose >= 2.20

### Subir o ambiente completo

```bash
# Clone o repositório
git clone https://github.com/<org>/plataforma.git
cd plataforma

# Copie e edite as variáveis de ambiente
cp .env.example .env

# Suba todos os containers
docker compose up --build
```

### Serviços disponíveis após o boot

| URL | Serviço |
|---|---|
| http://localhost:8080 | API Gateway |
| http://localhost:3001/health | Auth Health |
| http://localhost:3002/health | Academic Health |
| http://localhost:9090 | Prometheus |
| http://localhost:3000 | Grafana (admin/admin) |

## Estratégia de Branches (Git Flow)

```
main          ← produção, protegida, tags semânticas
develop       ← integração, CI roda em todo push
feature/*     ← features individuais, partem de develop
release/*     ← preparação de release, merge em main + develop
hotfix/*      ← correções urgentes em produção
```

**Convenção de commits:** [Conventional Commits](https://www.conventionalcommits.org/)
```
feat: adiciona endpoint de matrícula
fix: corrige validação de token expirado
docs: atualiza README com instruções de deploy
ci: adiciona job de security check
chore: atualiza dependências
```

## Pipeline CI/CD

```
Push / PR → CI:
  ├── lint (ESLint)
  ├── testes unitários (Jest)
  ├── análise de segurança (npm audit)
  └── build Docker (verificação)

Merge em main → CD:
  ├── build das imagens Docker
  ├── tag semântica automática
  ├── push para Docker Hub
  └── deploy automático (Render/Railway)
```

## Estrutura do repositório

```
plataforma/
├── services/
│   ├── auth-service/       # Autenticação e usuários
│   ├── academic-service/   # Domínio acadêmico
│   └── assignment-service/ # Atividades e entregas
├── gateway/                # Nginx reverse proxy
├── infra/
│   ├── docker-compose.yml
│   └── monitoring/
│       ├── prometheus/
│       └── grafana/
├── docs/                   # Documentação técnica e ADRs
├── .github/
│   ├── workflows/          # GitHub Actions
│   └── ISSUE_TEMPLATE/
└── README.md
```

## Decisões Técnicas (ADR resumido)

- **Node.js + Express** nos serviços: produtividade, ecossistema amplo e fácil containerização
- **PostgreSQL** como banco relacional: suporte robusto a transações e tipos complexos
- **JWT** para autenticação stateless: adequado para comunicação entre microsserviços
- **Git Flow** como estratégia de branches: permite rastreabilidade clara por sprint e PR obrigatório
- **Render** para deploy: suporte nativo a Docker, plano gratuito com auto-deploy via webhook


## Troubleshooting

Encontrou algum problema ao subir o ambiente? Consulte o guia de troubleshooting com os 6 bugs documentados durante a validação do Sprint 2, incluindo causas raiz e soluções aplicadas:

[docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

Os problemas cobertos incluem: race condition entre Postgres e o serviço Node, hostname incorreto no `DATABASE_URL`, `proxy_pass` mal configurado no Nginx, dependência faltando no `package.json`, conflito de porta no host e `curl` ausente na imagem Alpine.

