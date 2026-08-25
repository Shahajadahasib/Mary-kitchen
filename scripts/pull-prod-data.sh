#!/usr/bin/env bash
#
# Copy the production database (and optionally media) from the VPS into the
# local Docker stack, so local development runs against real content.
#
#     VPS_HOST=user@your-vps bash scripts/pull-prod-data.sh
#     VPS_HOST=user@your-vps bash scripts/pull-prod-data.sh --with-media
#
# VPS_HOST is required and deliberately has no default. The CI workflow keeps
# the same value in GitHub secrets (secrets.VPS_HOST / secrets.VPS_USER), so
# hardcoding it here would publish, in plaintext, something the project already
# treats as a secret. Set it per-invocation, export it in your shell profile, or
# put it in a gitignored scripts/.env.local and source that.
#
# This is a ONE-WAY, READ-ONLY pull. Nothing here writes to production, and
# nothing you subsequently do locally travels back — deploys ship code, never
# rows. See deploy/deploy.sh: its only database command is `migrate`.
#
# WARNING: the dump contains real customer data — names, addresses, phone
# numbers, order history. Treat the local copy accordingly, and note that this
# script deletes the temporary dump from the server when it is done.

set -euo pipefail

# ── Configuration (override via environment) ────────────────────────────────
# Optional gitignored local override, e.g. VPS_HOST=user@host
# shellcheck disable=SC1091
[ -f "$(dirname "$0")/.env.local" ] && . "$(dirname "$0")/.env.local"

if [ -z "${VPS_HOST:-}" ]; then
    printf '[1;31m!!! VPS_HOST is not set.[0m
' >&2
    printf '    Run:  VPS_HOST=user@your-vps bash %s
' "$0" >&2
    printf '    Or put it in scripts/.env.local (gitignored).
' >&2
    exit 1
fi
REMOTE_APP_DIR="${REMOTE_APP_DIR:-/var/www/Mary-kitchen}"
DB_NAME="${DB_NAME:-mary_kitchen_db}"
DB_USER="${DB_USER:-postgres}"
LOCAL_DB_CONTAINER="${LOCAL_DB_CONTAINER:-mary-kitchen-db-1}"
LOCAL_BACKEND_CONTAINER="${LOCAL_BACKEND_CONTAINER:-mary-kitchen-backend-1}"

WITH_MEDIA=0
[ "${1:-}" = "--with-media" ] && WITH_MEDIA=1

STAMP="$(date +%Y%m%d-%H%M%S)"
DUMP_NAME="mk-db-${STAMP}.sql.gz"
MEDIA_NAME="mk-media-${STAMP}.tar.gz"
REMOTE_TMP="/tmp"
LOCAL_TMP="${LOCAL_TMP:-./.local-data}"

log()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m  ! %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m!!! %s\033[0m\n' "$*" >&2; }

# ── Preflight ───────────────────────────────────────────────────────────────
command -v docker >/dev/null || { fail "docker not found on PATH"; exit 1; }
command -v ssh    >/dev/null || { fail "ssh not found on PATH"; exit 1; }
command -v scp    >/dev/null || { fail "scp not found on PATH"; exit 1; }

if ! docker ps --format '{{.Names}}' | grep -qx "$LOCAL_DB_CONTAINER"; then
    fail "Local database container '$LOCAL_DB_CONTAINER' is not running."
    fail "Start the stack first:  docker compose up -d"
    exit 1
fi

# Compose v1 is end-of-life; v2 is the `docker compose` plugin. Match whichever
# the VPS actually has, exactly as deploy/deploy.sh does.
REMOTE_COMPOSE='if docker compose version >/dev/null 2>&1; then C="docker compose"; else C="docker-compose"; fi'

# ── Confirm, because this destroys the local database ───────────────────────
cat <<EOF

This will REPLACE your local database with a copy of production.

  source      : ${VPS_HOST}:${REMOTE_APP_DIR}
  destination : local container '${LOCAL_DB_CONTAINER}', database '${DB_NAME}'
  media        : $([ "$WITH_MEDIA" = 1 ] && echo "yes" || echo "no (pass --with-media to include)")

Everything currently in your LOCAL '${DB_NAME}' will be dropped.
Production is only read from — it is never modified.

EOF
read -r -p "Type 'yes' to continue: " CONFIRM
[ "$CONFIRM" = "yes" ] || { echo "Aborted."; exit 0; }

mkdir -p "$LOCAL_TMP"

# ── 1. Dump on the VPS ──────────────────────────────────────────────────────
log "Dumping ${DB_NAME} on ${VPS_HOST}"
# --no-owner/--no-acl so the restore does not need production's roles to exist
# locally. -T on exec because there is no TTY over a scripted ssh session.
ssh "$VPS_HOST" "set -e
    cd '${REMOTE_APP_DIR}'
    ${REMOTE_COMPOSE}
    \$C exec -T db pg_dump -U '${DB_USER}' --no-owner --no-acl '${DB_NAME}' \
        | gzip > '${REMOTE_TMP}/${DUMP_NAME}'
    ls -lh '${REMOTE_TMP}/${DUMP_NAME}'"

# ── 2. Copy it down ─────────────────────────────────────────────────────────
log "Downloading dump"
scp "${VPS_HOST}:${REMOTE_TMP}/${DUMP_NAME}" "${LOCAL_TMP}/"

# ── 3. Remove the dump from the server ──────────────────────────────────────
# Do this now rather than at the end: if the restore fails, the copy is already
# safely local and there is no reason to leave customer data in /tmp.
log "Removing dump from the server"
ssh "$VPS_HOST" "rm -f '${REMOTE_TMP}/${DUMP_NAME}'"

# ── 4. Restore locally ──────────────────────────────────────────────────────
# Stop the app containers first so nothing writes mid-restore. The db container
# stays up — it is what we are restoring into.
log "Stopping local app containers"
docker compose stop backend celery_worker celery_beat >/dev/null 2>&1 || \
    warn "Could not stop app containers; continuing"

log "Recreating local database"
# WITH (FORCE) needs PostgreSQL 13+; the stack runs 16.
docker exec -i "$LOCAL_DB_CONTAINER" \
    psql -U "$DB_USER" -v ON_ERROR_STOP=1 \
    -c "DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE);"
docker exec -i "$LOCAL_DB_CONTAINER" \
    psql -U "$DB_USER" -v ON_ERROR_STOP=1 \
    -c "CREATE DATABASE ${DB_NAME};"

log "Restoring (this can take a minute)"
if ! gunzip -c "${LOCAL_TMP}/${DUMP_NAME}" \
        | docker exec -i "$LOCAL_DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -q -o /dev/null; then
    fail "Restore failed. The dump is still at ${LOCAL_TMP}/${DUMP_NAME}."
    docker compose up -d backend celery_worker celery_beat >/dev/null 2>&1 || true
    exit 1
fi

# ── 5. Media (optional) ─────────────────────────────────────────────────────
if [ "$WITH_MEDIA" = 1 ]; then
    log "Archiving media on the VPS"
    ssh "$VPS_HOST" "tar czf '${REMOTE_TMP}/${MEDIA_NAME}' -C '${REMOTE_APP_DIR}' media"

    log "Downloading media"
    scp "${VPS_HOST}:${REMOTE_TMP}/${MEDIA_NAME}" "${LOCAL_TMP}/"
    ssh "$VPS_HOST" "rm -f '${REMOTE_TMP}/${MEDIA_NAME}'"

    log "Unpacking into the backend container"
    # Locally MEDIA_VOLUME is the `media_data` named volume mounted at
    # /app/media, so copy through the container rather than onto the host.
    tar xzf "${LOCAL_TMP}/${MEDIA_NAME}" -C "$LOCAL_TMP"
    docker cp "${LOCAL_TMP}/media/." "${LOCAL_BACKEND_CONTAINER}:/app/media/" \
        || warn "docker cp failed — is the backend container running?"
    rm -rf "${LOCAL_TMP}/media"
else
    warn "Media not pulled. Product and dish images will 404 locally."
    warn "Re-run with --with-media to include them."
fi

# ── 6. Restart and report ───────────────────────────────────────────────────
log "Starting local app containers"
docker compose up -d backend celery_worker celery_beat >/dev/null

log "Row counts now in the local database"
docker exec -i "$LOCAL_DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT 'products   = ' || count(*) FROM products
    UNION ALL SELECT 'menu_items = ' || count(*) FROM menu_items
    UNION ALL SELECT 'orders     = ' || count(*) FROM orders
    UNION ALL SELECT 'users      = ' || count(*) FROM users;" | sed '/^$/d'

cat <<EOF

$(log "Done")
  Local dump kept at: ${LOCAL_TMP}/${DUMP_NAME}
  Delete it when you no longer need it — it contains real customer data.

  Admin sign-in now uses PRODUCTION credentials, since password hashes came
  across with the dump. Your previous local-only accounts are gone.

  backend/.env keeps EMAIL_BACKEND on the console backend. Leave it there while
  real customer rows are loaded, or a status-change test will email a real
  customer.

EOF
