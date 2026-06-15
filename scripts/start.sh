#!/bin/sh
set -e
node scripts/migrate.js
node server.js
