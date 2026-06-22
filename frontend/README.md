# Frontend — Painel de Verificação

Interface mínima de demonstração para o z-academico. Arquivo único (`index.html`), sem build step, sem dependências de framework — abre direto no navegador ou é hospedado em qualquer servidor estático.

## Por que essa abordagem

O enunciado original do projeto não exigia frontend (o foco é DevOps: containerização, CI/CD, observabilidade). Este painel foi adicionado depois, como uma camada fina de visualização sobre as APIs já existentes — não para somar pontos de design, mas para tornar a demonstração mais tangível.

Por isso, a escolha técnica foi deliberadamente simples:
- **1 arquivo HTML** com CSS e JS embutidos — zero risco de quebrar por dependência externa no dia da apresentação
- **Sem framework** (React, Vue) — nada para instalar, nada para buildar, nada que possa falhar por incompatibilidade de versão
- **Configuração em runtime** — as URLs do `auth-service` e `academic-service` são digitadas na própria tela e salvas no navegador (localStorage), então o mesmo arquivo funciona tanto contra o ambiente local (`docker compose`) quanto contra produção (Railway), sem precisar editar código

## Como usar

### Opção 1 — Abrir localmente
Basta abrir o arquivo `index.html` direto no navegador (duplo clique, ou `start index.html` no Windows).

### Opção 2 — Servir via qualquer servidor estático
```bash
cd frontend
python -m http.server 5500
# ou
npx serve .
```
Depois acesse `http://localhost:5500`.

### Configurar as URLs
Na primeira tela do painel, em **Configuração**, preencha:
- **URL do auth-service**: ex. `https://auth-service-production-xxxx.up.railway.app` ou `http://localhost:3001` se for testar contra o ambiente local
- **URL do academic-service**: mesma lógica

Clique em **Salvar e verificar**. As bolinhas de status no topo (verde = online, vermelha = offline) confirmam se os serviços estão respondendo.

## O que o painel faz

| Tela | Função |
|---|---|
| Status | Ping em `/health` de ambos os serviços a cada 20s |
| Acesso | Login e criação de conta contra o `auth-service` |
| Alunos / Disciplinas / Turmas | Lista os registros existentes e permite criar novos, autenticado via JWT |

## Limitações conhecidas (por design)

- Não há edição/exclusão pela interface — só criação e listagem, suficiente para demonstrar o fluxo de ponta a ponta
- Não há tratamento de CORS explícito do lado do frontend — depende do `cors()` já habilitado nos serviços Express
- Os IDs de relacionamento (ex: `usuarioId` na criação de aluno) precisam ser copiados manualmente do retorno de outra chamada — aceitável para demonstração, não para uso real

