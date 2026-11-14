#!/bin/sh
# Runs only when the Postgres data volume is initialised for the first time.
# Creates a dedicated database for the automated test suite so destructive
# e2e tests never touch the development database.
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	CREATE DATABASE "${POSTGRES_DB}_test" OWNER "$POSTGRES_USER";
EOSQL
