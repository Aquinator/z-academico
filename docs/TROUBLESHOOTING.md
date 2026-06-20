# Troubleshooting — z-academico

Registro dos bugs encontrados e corrigidos durante a validação manual do ambiente Docker (Sprint 2).

## Tabela de bugs corrigidos

| # | Sintoma | Causa raiz | Arquivo corrigido | Solução aplicada |
|---|---------|------------|-------------------|------------------|
| 1 | `academic-service` subia antes do PostgreSQL estar pronto e entrava em crash loop | `depends_on: postgres` não garante que o banco esteja aceitando conexões, só que o container subiu | `infra/docker-compose.yml` | Adicionado healthcheck no serviço postgres e `condition: service_healthy` no `depends_on` do academic-service |
| 2 | `Error: connect ECONNREFUSED 127.0.0.1:5432` nos logs do academic-service | O `DATABASE_URL` usava `localhost` em vez do nome do serviço Docker | `services/academic-service/.env.example` | Alterado para `postgres://user:pass@postgres:5432/zacademico` (hostname = nome do serviço na rede interna) |
| 3 | Gateway retornava `502 Bad Gateway` para rotas do academic-service | O `proxy_pass` no Nginx apontava para `http://academic:3002` mas o serviço estava na porta 3002 interna e o bloco location tinha barra extra | `gateway/nginx.conf` | Corrigido para `proxy_pass http://academic-service:3002/;` com `location /academic/` usando `rewrite ^/academic/(.*)$ /$1 break;` |
| 4 | `npm test` falhava com `Cannot find module '../src/utils/metrics'` | O `metrics.js` usa `prom-client` que não estava declarado como dependência de desenvolvimento | `services/academic-service/package.json` | Adicionado `"prom-client": "^14.2.0"` em dependencies e rodado `npm install` |
| 5 | `docker compose up --build` falhava com `port is already allocated` na porta 5432 | Uma instância local do PostgreSQL estava rodando na máquina host e ocupando a porta | `infra/docker-compose.yml` | Mapeamento alterado de `5432:5432` para `5433:5432` no serviço postgres (porta do host diferente, porta interna mantida) |
| 6 | Container do `auth-service` ficava em `unhealthy` indefinidamente | O `HEALTHCHECK` do Dockerfile usava `curl` mas a imagem base (`node:20-alpine`) não tem curl instalado | `services/auth-service/Dockerfile` | Substituído por `CMD node -e "require('http').get('http://localhost:3001/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"` |

---

## Detalhes e comandos de diagnóstico

### Bug 1 — Race condition Postgres × academic-service

```yaml
# infra/docker-compose.yml — trecho corrigido
postgres:
  image: postgres:15-alpine
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
    interval: 5s
    timeout: 5s
    retries: 10

academic-service:
  depends_on:
    postgres:
      condition: service_healthy
```
### Bug 2 — Hostname errado no DATABASE_URL

```bash
# Errado (dentro do container, localhost = o próprio container)
DATABASE_URL=postgres://user:pass@localhost:5432/zacademico

# Correto (nome do serviço na rede Docker)
DATABASE_URL=postgres://user:pass@postgres:5432/zacademico
```

### Bug 3 — proxy_pass com rewrite incorreto

```nginx
# gateway/nginx.conf — trecho corrigido
location /academic/ {
    rewrite ^/academic/(.*)$ /$1 break;
    proxy_pass http://academic-service:3002/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### Bug 4 — Dependência faltando

```bash
cd services/academic-service
npm install prom-client
```

### Bug 5 — Porta do host em conflito

```bash
# Verificar o processo ocupando a porta
sudo lsof -i :5432
# ou no Windows:
netstat -ano | findstr :5432
```

### Bug 6 — curl ausente na imagem Alpine

```dockerfile
# Antes (quebrado em node:alpine)
HEALTHCHECK CMD curl -f http://localhost:3001/health || exit 1

# Depois (usa apenas Node.js, sempre disponível)
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"
```

---

## Como validar o ambiente após as correções

```bash
# Na raiz do projeto
cd infra
docker compose down -v          # limpar state anterior
docker compose up --build -d    # subir tudo em background

# Aguardar ~30s e checar status
docker compose ps

# Todos devem aparecer como "healthy"
# Testar health checks diretos
curl http://localhost:3001/health
curl http://localhost:3002/health

# Testar via gateway
curl http://localhost:8080/auth/health
curl http://localhost:8080/academic/health
```