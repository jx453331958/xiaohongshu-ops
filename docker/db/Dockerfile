FROM supabase/postgres:15.8.1.085

COPY volumes/db/roles.sql /docker-entrypoint-initdb.d/init-scripts/99-roles.sql
COPY volumes/db/webhooks.sql /docker-entrypoint-initdb.d/init-scripts/98-webhooks.sql
COPY volumes/db/jwt.sql /docker-entrypoint-initdb.d/init-scripts/99-jwt.sql
COPY supabase/migrations/001_initial_schema.sql /docker-entrypoint-initdb.d/migrations/100-initial-schema.sql
