#!/bin/bash
set -euo pipefail

# Render (and most PaaS) inject PORT. Apache must listen on that port.
PORT="${PORT:-80}"
sed -i "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf
if grep -q '<VirtualHost' /etc/apache2/sites-available/000-default.conf; then
  sed -i "s/<VirtualHost \*:.*>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf
fi

# Render Postgres exposes DATABASE_URL; Laravel's pgsql config reads DB_URL.
if [[ -n "${DATABASE_URL:-}" && -z "${DB_URL:-}" ]]; then
  export DB_URL="${DATABASE_URL}"
fi

# Ensure storage is writable after volume remounts.
mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache || true

# Prefer Render's Pre-Deploy / release command for migrate. Entrypoint still
# migrates unless SKIP_MIGRATE=1, so a free-tier service without Pre-Deploy works.
if [[ "${SKIP_MIGRATE:-0}" != "1" ]]; then
  php artisan migrate --force --no-interaction
fi

php artisan config:cache
php artisan route:cache
# API-only apps may omit Blade views; view:cache requires the directory.
mkdir -p resources/views
php artisan view:cache

exec "$@"
