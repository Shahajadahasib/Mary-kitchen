#!/usr/bin/env bash
#
# Production deploy for the Mary Kitchen VPS.
#
# Invoked over SSH by .github/workflows/ci.yml, which only reaches this point
# after the backend, frontend and docker jobs have all gone green.
#
#     bash deploy/deploy.sh <git-sha>
#
# The ordering below is deliberate, and each step exists because the previous
# version of this deploy got it wrong:
#
#   1. Check out the exact commit CI tested, not "whatever main is now".
#   2. Build the new images while the old stack is still serving traffic, so
#      the outage is a container restart rather than a full image build.
#   3. Migrate and collect static from a one-off container built on the NEW
#      image, before any new container serves a request — new code must never
#      answer traffic against the old schema.
#   4. Restart, then prove the stack actually answers before declaring success.
#   5. If it does not answer, put the previous commit back.

set -euo pipefail

TARGET_SHA="${1:?usage: deploy.sh <git-sha>}"
APP_DIR="${APP_DIR:-/var/www/Mary-kitchen}"

BACKEND_HEALTH_URL="${BACKEND_HEALTH_URL:-http://localhost:8000/api/v1/products/}"
FRONTEND_HEALTH_URL="${FRONTEND_HEALTH_URL:-http://localhost:3000/}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-5}"

cd "$APP_DIR"

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m!!! %s\033[0m\n' "$*" >&2; }

# Compose v1 (`docker-compose`) is end-of-life; v2 ships as the `docker
# compose` plugin. Pick whichever this box actually has so the deploy does not
# break the day the VPS is upgraded.
if docker compose version >/dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
else
    fail "Neither 'docker compose' nor 'docker-compose' is installed."
    exit 1
fi
log "Using compose command: $COMPOSE"

# ── 1. Check out the exact commit that passed CI ────────────────────────────
PREVIOUS_SHA="$(git rev-parse HEAD)"
log "Currently deployed: $PREVIOUS_SHA"
log "Deploying:          $TARGET_SHA"

git fetch origin --prune
# Hard reset rather than `git pull`: a pull would merge, could conflict on a
# file someone hand-edited on the server, and would land on whatever main
# points at right now instead of the tested commit.
git reset --hard "$TARGET_SHA"

# ── Rollback path, used by every failure from here on ────────────────────────
rollback() {
    fail "Deploy of $TARGET_SHA failed — rolling back to $PREVIOUS_SHA"
    if [ "$PREVIOUS_SHA" = "$TARGET_SHA" ]; then
        fail "Previous and target commits are identical; nothing to roll back to."
        return
    fi
    git reset --hard "$PREVIOUS_SHA"
    # Deliberately not `set -e` guarded: if the rollback itself fails we still
    # want the remaining output, and the exit code below is what matters.
    $COMPOSE build || fail "Rollback build failed"
    $COMPOSE up -d || fail "Rollback restart failed"
    fail "Rolled back to $PREVIOUS_SHA. Production is on the previous release."
}

# ── 2. Build new images while the old stack keeps serving ───────────────────
log "Building images (old stack still serving traffic)"
if ! $COMPOSE build; then
    fail "Image build failed — nothing was restarted, production is untouched."
    git reset --hard "$PREVIOUS_SHA"
    exit 1
fi

# ── 3. Migrate and collect static BEFORE new containers take traffic ────────
# `run --rm` starts a throwaway container on the freshly built image. The old
# backend is still up and answering; it briefly sees the new schema, which is
# the safe direction of the two.
log "Applying migrations"
if ! $COMPOSE run --rm backend python manage.py migrate --no-input; then
    rollback
    exit 1
fi

log "Collecting static files"
if ! $COMPOSE run --rm backend python manage.py collectstatic --no-input; then
    rollback
    exit 1
fi

# ── 4. Restart onto the new images ──────────────────────────────────────────
# No `down` first: `up -d` recreates only the containers whose image or config
# actually changed, so the database and Redis are never stopped.
log "Restarting services"
if ! $COMPOSE up -d --remove-orphans; then
    rollback
    exit 1
fi

# ── 5. Prove it actually works ──────────────────────────────────────────────
wait_for() {
    local name="$1" url="$2" i
    for ((i = 1; i <= HEALTH_RETRIES; i++)); do
        if curl -fsS --max-time 10 -o /dev/null "$url"; then
            log "$name healthy after $((i * HEALTH_INTERVAL))s"
            return 0
        fi
        sleep "$HEALTH_INTERVAL"
    done
    fail "$name did not become healthy within $((HEALTH_RETRIES * HEALTH_INTERVAL))s ($url)"
    return 1
}

log "Waiting for services to report healthy"
if ! wait_for "Backend" "$BACKEND_HEALTH_URL" || ! wait_for "Frontend" "$FRONTEND_HEALTH_URL"; then
    fail "Recent backend logs:"
    $COMPOSE logs --tail 50 backend || true
    fail "Recent frontend logs:"
    $COMPOSE logs --tail 50 frontend || true
    rollback
    exit 1
fi

# Old images pile up on a small VPS disk and eventually fail a build with "no
# space left on device". Prune only dangling layers, never named images.
log "Pruning dangling images"
docker image prune -f >/dev/null 2>&1 || true

log "Deployment complete — now running $TARGET_SHA"
