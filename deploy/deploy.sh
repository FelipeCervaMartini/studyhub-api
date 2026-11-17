#!/usr/bin/env bash
# Deploy no servidor (EC2): troca a versão da API e volta pra anterior se a nova não subir.
# Uso: ./deploy.sh ghcr.io/felipecervamartini/studyhub-api:sha-abc1234
set -euo pipefail

NEW_IMAGE="${1:?informe a imagem, ex.: ghcr.io/usuario/studyhub-api:sha-abc1234}"

# O script trabalha sempre na pasta onde ele está (no servidor: /opt/studyhub).
cd "$(dirname "$0")"

COMPOSE_FILE="docker-compose.prod.yml"
RELEASE_FILE=".release" # guarda a imagem da última versão que subiu com sucesso
WAIT_TIMEOUT="${WAIT_TIMEOUT:-120}"

log() { echo "[deploy] $*"; }

# Sobe os containers com a imagem informada e espera os health checks passarem.
start() {
  API_IMAGE="$1" docker compose -f "$COMPOSE_FILE" up -d --wait --wait-timeout "$WAIT_TIMEOUT"
}

# Testa se a API responde e fala com o banco (o wget roda dentro do container, então o servidor nem precisa de curl).
smoke_test() {
  docker compose -f "$COMPOSE_FILE" exec -T api wget -qO- http://127.0.0.1:3000/health/ready
}

# Primeira execução: gera a senha do banco direto no servidor, ela nunca sai daqui.
if [ ! -f .env ]; then
  log "primeiro deploy: criando o arquivo .env"
  umask 077
  echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)" > .env
fi

PREVIOUS_IMAGE="$(cat "$RELEASE_FILE" 2>/dev/null || true)"
log "versão atual: ${PREVIOUS_IMAGE:-nenhuma}"
log "versão nova:  ${NEW_IMAGE}"

# Baixa antes de trocar: se o download falhar, a versão atual continua no ar.
API_IMAGE="$NEW_IMAGE" docker compose -f "$COMPOSE_FILE" pull api

if start "$NEW_IMAGE" && smoke_test; then
  echo
  echo "$NEW_IMAGE" > "$RELEASE_FILE"
  # Limpeza: mantém só a versão nova e a anterior (para um rollback rápido) e apaga as mais antigas.
  docker images "${NEW_IMAGE%:*}" --format '{{.Repository}}:{{.Tag}}' \
    | { grep -vxF -e "$NEW_IMAGE" -e "${PREVIOUS_IMAGE:-$NEW_IMAGE}" || true; } \
    | xargs -r docker image rm > /dev/null 2>&1 || true
  log "deploy concluído com sucesso"
  exit 0
fi

log "ERRO: a versão nova não ficou saudável. Últimos logs da API:"
API_IMAGE="$NEW_IMAGE" docker compose -f "$COMPOSE_FILE" logs --no-color --tail 30 api || true

if [ -n "$PREVIOUS_IMAGE" ] && [ "$PREVIOUS_IMAGE" != "$NEW_IMAGE" ]; then
  log "rollback: voltando para ${PREVIOUS_IMAGE}"
  if start "$PREVIOUS_IMAGE" && smoke_test; then
    echo
    log "rollback concluído, a versão anterior está no ar"
  else
    log "ERRO: o rollback também falhou, é preciso intervenção manual"
  fi
else
  log "não existe versão anterior para voltar"
fi

# Sai com erro mesmo quando o rollback funciona, para o pipeline ficar vermelho.
exit 1
