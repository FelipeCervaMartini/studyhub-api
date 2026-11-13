# StudyHub API

[![CI](https://github.com/FelipeCervaMartini/studyhub-api/actions/workflows/ci.yml/badge.svg)](https://github.com/FelipeCervaMartini/studyhub-api/actions/workflows/ci.yml)

API REST para organizar os estudos: matérias, materiais de estudo, backlog de estudo e anotações.

Projeto da disciplina **DevOps na Prática** (PUCRS). O foco é o fluxo DevOps em volta da aplicação: integração contínua com GitHub Actions, testes automatizados, containers e infraestrutura como código com Terraform.

## Sumário

- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Como rodar](#como-rodar)
- [Endpoints](#endpoints)
- [Testes](#testes)
- [Pipeline de CI](#pipeline-de-ci)
- [Infraestrutura como código](#infraestrutura-como-código)
- [Próximos passos](#próximos-passos)

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Linguagem | TypeScript (Node.js 22) |
| Framework web | Express 5 |
| Validação | Zod |
| Banco de dados | PostgreSQL 16 |
| Testes | Jest e Supertest |
| Qualidade | ESLint e verificação de tipos do TypeScript |
| Containers | Docker e Docker Compose |
| CI | GitHub Actions |
| IaC | Terraform (AWS) |

## Arquitetura

O código é dividido em módulos por assunto (`subjects`, `materials`, `backlog`, `notes`), e cada módulo tem as mesmas camadas:

```
Requisição HTTP
      │
      ▼
 controller   valida a entrada (Zod) e define o status HTTP
      │
      ▼
  service     regras de negócio
      │
      ▼
 repository   SQL (interface + implementação para PostgreSQL)
      │
      ▼
 PostgreSQL
```

O serviço depende só da interface do repositório. Por isso os testes unitários conseguem testar as regras de negócio com mocks, sem banco.

```
studyhub-api/
├── src/
│   ├── app.ts              monta a aplicação (rotas e dependências)
│   ├── server.ts           sobe o servidor e roda as migrações
│   ├── config/             leitura e validação das variáveis de ambiente
│   ├── db/                 conexão e migrações do banco
│   ├── modules/            subjects, materials, backlog, notes, health
│   └── shared/             erros, validação, logger e middlewares
├── tests/
│   ├── unit/               regras de negócio, sem banco
│   └── integration/        API completa com PostgreSQL real
├── infra/terraform/        infraestrutura como código (AWS)
├── .github/workflows/      pipeline de CI
├── Dockerfile
└── docker-compose.yml
```

## Como rodar

### Com Docker (recomendado)

Precisa apenas do Docker instalado.

```bash
cp .env.example .env        # ajuste a senha do banco
docker compose up -d --build
curl http://localhost:3000/health
```

### Em modo desenvolvimento

Precisa do Node.js 22 e de um PostgreSQL (pode ser o do Compose).

```bash
cp .env.example .env
docker compose up -d db     # sobe só o banco
npm install
npm run dev                 # reinicia sozinho a cada alteração
```

No Windows (PowerShell), carregue a variável antes do `npm run dev`:

```powershell
$env:DATABASE_URL = "postgres://studyhub:SUA_SENHA@localhost:5432/studyhub"
```

As tabelas são criadas automaticamente na inicialização.

## Endpoints

Base: `/api/v1`. Todas as respostas são JSON.

| Recurso | Rotas | Observações |
|---|---|---|
| Matérias | `GET/POST /subjects`, `GET/PATCH/DELETE /subjects/:id` | Nome único. Excluir remove os itens ligados à matéria. |
| Materiais | `GET/POST /materials`, `GET/PATCH/DELETE /materials/:id` | Filtro `?subjectId=`. Tipos: `book`, `article`, `video`, `slides`, `other`. |
| Backlog | `GET/POST /backlog`, `GET/PATCH/DELETE /backlog/:id` | Filtros `?subjectId=` e `?status=`. Status: `pending`, `in_progress`, `done`. Prioridade: `low`, `medium`, `high`. |
| Anotações | `GET/POST /notes`, `GET/PATCH/DELETE /notes/:id` | Filtro `?subjectId=`. |
| Saúde | `GET /health`, `GET /health/ready` | Fora do prefixo `/api/v1`. |

Exemplo:

```bash
# cria uma matéria
curl -X POST http://localhost:3000/api/v1/subjects \
  -H "Content-Type: application/json" \
  -d '{"name": "DevOps na Prática"}'

# adiciona um item ao backlog (use o id retornado acima)
curl -X POST http://localhost:3000/api/v1/backlog \
  -H "Content-Type: application/json" \
  -d '{"subjectId": "ID_DA_MATERIA", "title": "Entregar fase 1", "priority": "high", "dueDate": "2026-11-30"}'
```

Erros seguem sempre o mesmo formato:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Dados de entrada inválidos", "details": [] } }
```

| Status | Quando |
|---|---|
| 400 | Entrada inválida ou JSON malformado |
| 404 | Registro ou rota não encontrados |
| 409 | Conflito (ex.: matéria com nome repetido) |
| 500 | Erro inesperado (detalhes só no log) |

## Testes

```bash
npm run test:unit          # não precisa de banco
npm run test:integration   # precisa de um PostgreSQL
npm run test:coverage      # tudo, com relatório de cobertura
```

Os testes de integração usam a variável `DATABASE_URL`. Para subir um banco só para eles:

```bash
docker run -d --rm --name studyhub-test-db -p 5432:5432 \
  -e POSTGRES_USER=studyhub -e POSTGRES_PASSWORD=studyhub -e POSTGRES_DB=studyhub_test \
  postgres:16-alpine
```

O pipeline exige cobertura mínima de 80% das linhas.

## Pipeline de CI

Arquivo: [.github/workflows/ci.yml](.github/workflows/ci.yml). Roda a cada push na `main` e em todo pull request.

| Job | O que faz |
|---|---|
| **Lint, build e testes** | Instala dependências, roda ESLint, verificação de tipos, build e os testes unitários e de integração (com um PostgreSQL de verdade), e publica o relatório de cobertura. |
| **Build e smoke test da imagem Docker** | Constrói a imagem, sobe API e banco com Docker Compose e chama a API em execução. |
| **Validação da infraestrutura** | `terraform fmt`, `validate`, TFLint e um `apply` completo contra um emulador da AWS. |

Se qualquer etapa falha, o pipeline fica vermelho e o problema aparece antes de chegar na `main`.

## Infraestrutura como código

Os scripts ficam em [infra/terraform](infra/terraform) e criam na AWS:

| Arquivo | Recursos |
|---|---|
| `network.tf` | VPC, sub-rede pública, Internet Gateway e tabela de rotas |
| `security.tf` | Security group (API aberta, SSH só para IPs autorizados) e par de chaves |
| `compute.tf` | Instância EC2 com Docker instalado na inicialização e IP fixo (Elastic IP) |
| `variables.tf` / `outputs.tf` | Parâmetros de entrada e dados de saída |

Para provisionar:

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # preencha a chave SSH e o seu IP
terraform init
terraform plan
terraform apply
```

Para remover tudo: `terraform destroy`.

> **Atenção a custos:** o `terraform apply` cria recursos pagos em uma conta AWS real (uma instância EC2 `t3.micro`, um disco de 20 GB e um IP público). O custo é baixo, mas existe enquanto os recursos estiverem de pé, então rode `terraform destroy` ao terminar. O pipeline de CI **não** usa conta AWS: ele aplica os scripts em um emulador local, sem custo.

## Próximos passos

Previstos para a fase 2 e evoluções futuras:

- Entrega contínua (CD): publicar a imagem e fazer deploy automático na EC2.
- Monitoramento e segurança no pipeline.
- Novas funcionalidades: planos de estudo, questionários e provas cronometradas.
- Autenticação de usuários.
