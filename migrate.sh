#!/usr/bin/env bash

set -euo pipefail

# ============================================================
# Arth - Database Migration
# ============================================================

PROJECT_ID="project-4f510d6e-25d6-40b9-968"
REGION="us-central1"

DB_INSTANCE="arth-postgres"

RUNTIME_SA="arth-backend-runtime@${PROJECT_ID}.iam.gserviceaccount.com"

ARTIFACT_REPO="arth-repo"

BACKEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/arth-backend:latest"

JOB_NAME="arth-db-migrate"

echo
echo "============================================================"
echo " Arth - Database Migration"
echo "============================================================"
echo

gcloud config set project "$PROJECT_ID" >/dev/null

echo "==> Updating migration job..."

gcloud run jobs create "$JOB_NAME" \
    --image="$BACKEND_IMAGE" \
    --region="$REGION" \
    --service-account="$RUNTIME_SA" \
    --set-cloudsql-instances="${PROJECT_ID}:${REGION}:${DB_INSTANCE}" \
    --set-secrets="DATABASE_URL=DATABASE_URL:latest,ADMIN_JWT_SECRET=ADMIN_JWT_SECRET:latest,SMTP_HOST=SMTP_HOST:latest" \
    --set-env-vars="NODE_ENV=production" \
    --command="npx" \
    --args="drizzle-kit,migrate" \
    --project="$PROJECT_ID" \
    --quiet \
|| \
gcloud run jobs update "$JOB_NAME" \
    --image="$BACKEND_IMAGE" \
    --region="$REGION" \
    --service-account="$RUNTIME_SA" \
    --set-cloudsql-instances="${PROJECT_ID}:${REGION}:${DB_INSTANCE}" \
    --set-secrets="DATABASE_URL=DATABASE_URL:latest,ADMIN_JWT_SECRET=ADMIN_JWT_SECRET:latest" \
    --set-env-vars="NODE_ENV=production" \
    --command="npx" \
    --args="drizzle-kit,migrate" \
    --project="$PROJECT_ID" \
    --quiet

echo
echo "==> Running database migration..."

gcloud run jobs execute "$JOB_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --wait

echo
echo "============================================================"
echo " Database migration completed successfully"
echo "============================================================"
