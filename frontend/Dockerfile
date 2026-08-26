FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

# NEXT_PUBLIC_* values are inlined into the browser bundle at build time (see
# the `env` block in next.config.js), so they have to arrive as build args —
# setting them as runtime container env vars has no effect on the client code.
# The value must be reachable from the *browser*, not from inside the compose
# network: `http://backend:8000` only resolves container-to-container.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# The Stripe key is only exported when one was actually passed. An empty value
# would be worse than none: @next/env only fills in a variable it finds
# *undefined*, so an empty string counts as "already set" and silently
# suppresses the frontend/.env.production the server may be relying on —
# blanking a key that was configured, with nothing in the build log to show it.
# Build args are already present in this RUN's environment, so dropping the
# empty one is all that is needed.
RUN set -eu; \
    [ -n "${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}" ] || unset NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY; \
    npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
