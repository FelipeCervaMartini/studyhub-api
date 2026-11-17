# StudyHub API

[![CI/CD](https://github.com/FelipeCervaMartini/studyhub-api/actions/workflows/ci.yml/badge.svg)](https://github.com/FelipeCervaMartini/studyhub-api/actions/workflows/ci.yml)

API REST para organizar os estudos: matérias, materiais de estudo, backlog de estudo e anotações.

Projeto da disciplina **DevOps na Prática** (PUCRS). O foco é o fluxo DevOps em volta da aplicação: integração e entrega contínuas com GitHub Actions, testes automatizados, containers, orquestração, segurança no pipeline e infraestrutura como código com Terraform.

## Sumário

- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Como rodar](#como-rodar)
- [Endpoints](#endpoints)
- [Testes](#testes)
- [Pipeline de CI/CD](#pipeline-de-cicd)
- [Deploy](#deploy)
- [Kubernetes](#kubernetes)
- [Infraestrutura como código](#infraestrutura-como-código)
- [Segurança e monitoramento](#segurança-e-monitoramento)
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
| Orquestração | Docker Compose (produção) e Kubernetes (manifests testados no pipeline) |
| CI/CD | GitHub Actions |
| Registro de imagens | GitHub Container Registry (GHCR) |
| Segurança | npm audit e Trivy |
| IaC | Terraform (AWS) |
| Monitoramento | Prometheus, Grafana, health checks, logs em JSON e alarmes do CloudWatch |

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
├── deploy/                 Compose de produção e script de deploy
├── k8s/                    manifests do Kubernetes
├── monitoring/             configuração do Prometheus e painel do Grafana
├── infra/terraform/        infraestrutura como código (AWS)
├── .github/workflows/      pipeline de CI/CD
├── Dockerfile
└── docker-compose.yml      ambiente local
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
| Métricas | `GET /metrics` | Formato de texto do Prometheus. Fora do prefixo `/api/v1`. |

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

## Pipeline de CI/CD

Arquivo: [.github/workflows/ci.yml](.github/workflows/ci.yml). Roda a cada push na `main` e em todo pull request.

```mermaid
flowchart LR
    dev([Push ou pull request]) --> quality[Lint, build e testes]
    dev --> terraform[Validação do Terraform]
    quality --> docker[Imagem Docker: smoke test e Trivy]
    quality --> k8s[Teste no Kubernetes]
    docker --> publish[Publica a imagem no GHCR]
    k8s --> publish
    terraform --> publish
    publish --> deploy[Deploy na EC2 por SSH]
    deploy --> check{API saudável?}
    check -- sim --> ok([Versão nova no ar])
    check -- não --> rollback([Rollback para a versão anterior])
```

**Integração contínua (CI)**, em todo push e pull request:

| Job | O que faz |
|---|---|
| **Lint, build e testes** | Instala dependências, audita as dependências (`npm audit`), roda ESLint, verificação de tipos, build e os testes unitários e de integração (com um PostgreSQL de verdade), e publica o relatório de cobertura. |
| **Build, smoke test e varredura da imagem Docker** | Constrói a imagem, sobe API e banco com Docker Compose, chama a API em execução, confere as métricas e a configuração do Prometheus e procura vulnerabilidades na imagem com o Trivy. |
| **Teste dos manifests no Kubernetes** | Cria um cluster de teste (kind), aplica os manifests e chama a API pela rede do cluster. |
| **Validação da infraestrutura** | `terraform fmt`, `validate`, TFLint e um `apply` completo contra um emulador da AWS. |

**Entrega contínua (CD)**, só na `main` e só depois que todos os jobs acima passam:

| Job | O que faz |
|---|---|
| **Publicação da imagem** | Constrói a imagem final e publica no GHCR com a tag do commit (`sha-abc1234`) e `latest`. |
| **Deploy na AWS** | Entra na instância EC2 por SSH, roda o script de deploy e chama a API pela internet para conferir se a versão nova está no ar. |

Se qualquer etapa falha, o pipeline fica vermelho e nada é publicado. Se o problema aparece só no deploy, o script volta sozinho para a versão anterior.

## Deploy

Os arquivos ficam em [deploy](deploy):

| Arquivo | Função |
|---|---|
| `docker-compose.prod.yml` | Sobe API e banco no servidor usando a imagem publicada pelo pipeline (não constrói nada no servidor). |
| `deploy.sh` | Baixa a imagem nova, troca a versão, espera os health checks e faz rollback se a versão nova não ficar saudável. |

### Configuração do deploy automático

O job de deploy só roda quando o endereço do servidor está configurado. No repositório, em **Settings > Secrets and variables > Actions**:

| Tipo | Nome | Valor |
|---|---|---|
| Variable | `DEPLOY_HOST` | IP público da instância (saída `public_ip` do Terraform) |
| Secret | `DEPLOY_SSH_KEY` | Chave privada SSH correspondente à `ssh_public_key` do Terraform |

Sem a variável `DEPLOY_HOST`, o pipeline publica a imagem e pula o deploy.

Os servidores do GitHub Actions não têm IP fixo, então o deploy automático exige `allowed_ssh_cidrs = ["0.0.0.0/0"]` no Terraform. O acesso continua protegido pela chave privada (a instância não aceita senha).

### Deploy manual

O mesmo script funciona direto no servidor:

```bash
scp deploy/docker-compose.prod.yml deploy/deploy.sh ec2-user@IP_DO_SERVIDOR:/opt/studyhub/
ssh ec2-user@IP_DO_SERVIDOR "bash /opt/studyhub/deploy.sh ghcr.io/felipecervamartini/studyhub-api:latest"
```

Para voltar a uma versão específica, basta rodar o script com a tag antiga (ex.: `...studyhub-api:sha-abc1234`).

Para conferir qual versão está no ar:

```bash
curl http://IP_DO_SERVIDOR:3000/health
# {"status":"ok","version":"sha-abc1234","uptimeSeconds":42}
```

## Kubernetes

Os manifests ficam em [k8s](k8s) e são uma alternativa ao Docker Compose para rodar a aplicação em um cluster. O deploy real deste projeto usa Docker Compose em uma instância EC2; os manifests são testados a cada execução do pipeline em um cluster kind.

| Arquivo | Recursos |
|---|---|
| `base/namespace.yaml` | Namespace `studyhub` |
| `base/postgres.yaml` | Banco: StatefulSet com disco persistente e Service interno |
| `base/api.yaml` | API: ConfigMap, Deployment com 2 réplicas, health checks e atualização sem indisponibilidade, e Service |
| `overlays/kind/` | Variação para o cluster de teste, que usa a imagem construída localmente |

Para rodar em um cluster:

```bash
kubectl apply -f k8s/base/namespace.yaml
kubectl -n studyhub create secret generic studyhub-db --from-literal=password=SUA_SENHA
kubectl apply -k k8s/base
kubectl -n studyhub rollout status deployment/studyhub-api
kubectl -n studyhub port-forward service/studyhub-api 8080:80
```

A senha do banco fica em um Secret criado por comando, fora do repositório.

## Infraestrutura como código

Os scripts ficam em [infra/terraform](infra/terraform) e criam na AWS:

| Arquivo | Recursos |
|---|---|
| `network.tf` | VPC, sub-rede pública, Internet Gateway e tabela de rotas |
| `security.tf` | Security group (API aberta, SSH só para IPs autorizados) e par de chaves |
| `compute.tf` | Instância EC2 com Docker instalado na inicialização e IP fixo (Elastic IP) |
| `monitoring.tf` | Alarmes do CloudWatch (CPU alta e falha da instância), com aviso opcional por e-mail |
| `variables.tf` / `outputs.tf` | Parâmetros de entrada e dados de saída |

Para provisionar:

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # preencha a chave SSH e quem pode acessar por SSH
terraform init
terraform plan
terraform apply
```

Para remover tudo: `terraform destroy`.

> **Atenção a custos:** o `terraform apply` cria recursos pagos em uma conta AWS real (uma instância EC2 `t3.micro`, um disco de 20 GB e um IP público). O custo é baixo, mas existe enquanto os recursos estiverem de pé, então rode `terraform destroy` ao terminar. O pipeline de CI **não** usa conta AWS: ele aplica os scripts em um emulador local, sem custo.

## Segurança e monitoramento

**Segurança**

- `npm audit` no pipeline: bloqueia dependências de produção com vulnerabilidade alta ou crítica.
- Trivy no pipeline: bloqueia a imagem Docker se ela tiver vulnerabilidade alta ou crítica com correção disponível.
- Imagem final sem `npm` e sem ferramentas de build, executando com usuário sem privilégios.
- Segredos fora do código: chave SSH nos Secrets do GitHub e senha do banco gerada no próprio servidor.
- Banco de dados sem porta exposta para a internet, e SSH fechado por padrão (só abre para os endereços configurados no Terraform).
- Pipeline com permissão mínima: só o job de publicação pode escrever no registro de imagens.

**Monitoramento**

- `GET /metrics`: a API expõe métricas no formato do Prometheus, como quantidade de requisições, tempo de resposta por rota e status, memória, CPU e event loop.
- Prometheus: coleta as métricas a cada 15 segundos e avalia três alertas (API fora do ar, taxa de erros 5xx acima de 5% e tempo de resposta acima de 500 ms).
- Grafana: painel "StudyHub API" já configurado, com tráfego, erros, tempo de resposta e uso de recursos.
- `GET /health` e `GET /health/ready`: usados pelo Docker, pelo Kubernetes e pelo pipeline para saber se a aplicação está saudável.
- Logs em JSON de cada requisição (método, rota, status e duração): `docker compose logs api`.
- Alarmes do CloudWatch criados pelo Terraform: CPU acima de 80% e falha na verificação de status da instância.

Para subir o Prometheus e o Grafana junto com a aplicação:

```bash
docker compose --profile monitoring up -d --build
```

| Ferramenta | Endereço | Acesso |
|---|---|---|
| Prometheus | http://localhost:9090 | Alertas em `/alerts` |
| Grafana | http://localhost:3001 | Usuário `admin`, senha da variável `GRAFANA_PASSWORD` (padrão `admin`) |

Os arquivos ficam em [monitoring](monitoring). As duas ferramentas ficam acessíveis só na própria máquina e são opcionais: o `docker compose up` normal e o deploy na EC2 não sobem o monitoramento.

## Próximos passos

- Aprovação manual antes do deploy em produção e um ambiente de homologação.
- Deploy sem liberar SSH para a internet (AWS Systems Manager ou runner próprio).
- Prometheus e Grafana também no servidor (exige uma instância maior), envio dos alertas por e-mail ou chat e logs centralizados.
- Análise estática de segurança (SonarQube) e teste dinâmico (OWASP ZAP) no pipeline.
- Banco gerenciado (RDS) com backup automático.
- Novas funcionalidades: planos de estudo, questionários, provas cronometradas e autenticação de usuários.
