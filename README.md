# Biblioteca Pimentas VII

Sistema escolar de biblioteca com `Vite + React + TypeScript` no frontend e `Node + Express + PostgreSQL` no backend.

## Perfis do sistema

- aluno
- professor
- administração

## O que o projeto entrega hoje

- autenticação com sessão por token
- catálogo digital com busca, filtros e detalhes dos livros
- solicitação, aprovação, recusa e devolução de empréstimos
- favoritos, histórico e resenhas
- sugestões pedagógicas para turmas
- avisos institucionais
- permissões de leitura por aluno
- tokens para cadastro de professores
- suporte por e-mail
- modo apresentação
- upload real de capa para livros
- recuperação de senha com token seguro e expiração
- documentos da biblioteca com upload e acesso público ou por perfil
- relatórios administrativos com exportação CSV e impressão em PDF
- trilha de auditoria para a operação administrativa
- migrations formais para evolução de schema
- logs e tratamento de erro mais consistentes no backend

## Arquitetura atual

- frontend: `React + Vite`
- backend: `Express`
- banco principal: `PostgreSQL`
- fallback local: banco em memória para desenvolvimento, preview e testes automatizados
- build de produção:
  - `dist` para os assets do frontend
  - `dist-server` para o backend compilado

## Dados de demonstração e publicação

- o sistema não carrega usuários ou livros fictícios por padrão
- `SEED_DEMO_DATA=true` deve ser usado apenas em testes automatizados ou ambiente controlado
- `SEED_DEMO_DATA` é bloqueado em produção
- para a primeira publicação, use `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD` para criar o primeiro administrador real

## Rodando localmente

```bash
npm install
npm run db:migrate
npm run dev
```

Frontend:

- [http://127.0.0.1:8080](http://127.0.0.1:8080)

Backend:

- [http://127.0.0.1:3001/api/health](http://127.0.0.1:3001/api/health)

## Build e execução de produção

```bash
npm run build
npm run start
```

Importante:

- `npm run start` exige `DATABASE_URL` configurada
- `npm run preview` sobe um ambiente local de produção sem semear dados fictícios
- `npm run start:test` existe para E2E e sobe o backend com fixtures controladas em memória

## Bootstrap do primeiro administrador

Defina no ambiente:

- `BOOTSTRAP_ADMIN_NAME`
- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`

Depois execute:

```bash
npm run admin:bootstrap
```

O mesmo bootstrap também roda na inicialização da API. Se já existir um administrador ativo, nenhum novo admin será criado.

## Variáveis de ambiente

Use o arquivo `.env.example` como base.

Principais variáveis:

- `PORT`
- `JWT_SECRET`
- `DATABASE_URL`
- `DATABASE_SSL`
- `DATABASE_POOL_MAX`
- `ALLOW_IN_MEMORY_DATABASE`
- `SEED_DEMO_DATA`
- `BOOTSTRAP_ADMIN_NAME`
- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `CORS_ORIGIN`
- `TRUST_PROXY`
- `PUBLIC_CACHE_TTL_SECONDS`
- `API_RATE_LIMIT_PER_MINUTE`
- `AUTH_RATE_LIMIT_PER_MINUTE`
- `APP_PUBLIC_URL`
- `UPLOAD_ROOT_DIR`
- `BOOK_COVER_MAX_SIZE_BYTES`
- `DOCUMENT_MAX_SIZE_BYTES`
- `PASSWORD_RESET_EXPIRY_MINUTES`
- `PASSWORD_RESET_PREVIEW_ENABLED`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `LOG_LEVEL`

## Banco, uploads e operação

- `npm run db:migrate` aplica as migrations do backend antes de iniciar ou publicar a API
- uploads de capas e documentos ficam em `data/uploads` por padrão e são servidos em `/api/assets`
- livros antigos com capa por URL continuam compatíveis com o novo fluxo de upload
- para links de redefinição em produção, configure `APP_PUBLIC_URL` com a URL pública do frontend
- para envio real de e-mails, configure SMTP
- `PASSWORD_RESET_PREVIEW_ENABLED` só deve ficar ativo em ambiente interno e controlado

## Publicação recomendada

### Opção mais simples: Render

O projeto já possui [render.yaml](./render.yaml).

Passos gerais:

1. subir o projeto para um repositório Git
2. conectar esse repositório no Render
3. usar o `render.yaml`
4. deixar o Render criar e conectar o PostgreSQL gerenciado
5. configurar as variáveis de SMTP e o bootstrap do primeiro administrador

### Opção por container

```bash
npm run docker:build
npm run docker:run
```

## Checklist de publicação

1. configurar `DATABASE_URL` do PostgreSQL
2. definir `JWT_SECRET` forte
3. configurar `APP_PUBLIC_URL`
4. configurar SMTP real
5. definir `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD`
6. rodar `npm run db:migrate`
7. rodar `npm run admin:bootstrap`
8. publicar a API com `SEED_DEMO_DATA=false`

## Testes e validação

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
npm run test:e2e:full
```

## Observação sobre escala

Esta versão já está preparada para publicação escolar real com PostgreSQL, uploads persistentes, auditoria, relatórios e fluxo inicial de administrador.

Para crescer ainda mais no longo prazo, os próximos passos recomendados são:

- adicionar cache externo
- separar frontend, API e banco em infraestrutura dedicada
- incluir monitoramento e observabilidade
