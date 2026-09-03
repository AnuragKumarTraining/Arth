#!/usr/bin/env bash

set -euo pipefail

# ============================================================
# Arth - Database Seed
# ============================================================

PROJECT_ID="project-4f510d6e-25d6-40b9-968"
REGION="us-central1"

DB_INSTANCE="arth-postgres"

RUNTIME_SA="arth-backend-runtime@${PROJECT_ID}.iam.gserviceaccount.com"

ARTIFACT_REPO="arth-repo"

BACKEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/arth-backend:latest"

JOB_NAME="arth-db-seed"

echo
echo "============================================================"
echo " Arth - Database Seed"
echo "============================================================"
echo

gcloud config set project "$PROJECT_ID" >/dev/null

# ------------------------------------------------------------
# Admin email
# ------------------------------------------------------------

read -rp "Enter admin email used for Arth: " ADMIN_EMAIL

if [[ -z "$ADMIN_EMAIL" ]]; then
    echo "ERROR: ADMIN_EMAIL cannot be empty."
    exit 1
fi

# ------------------------------------------------------------
# Create/update seed job
# ------------------------------------------------------------

echo
echo "==> Updating seed job..."

gcloud run jobs create "$JOB_NAME" \
    --image="$BACKEND_IMAGE" \
    --region="$REGION" \
    --service-account="$RUNTIME_SA" \
    --set-cloudsql-instances="${PROJECT_ID}:${REGION}:${DB_INSTANCE}" \
    --set-secrets="DATABASE_URL=DATABASE_URL:latest,ADMIN_PASSWORD=ADMIN_PASSWORD:latest" \
    --set-env-vars="NODE_ENV=production,ADMIN_EMAIL=${ADMIN_EMAIL}" \
    --command="npx" \
    --args="tsx,src/seed_db.ts" \
    --project="$PROJECT_ID" \
    --quiet \
|| \
gcloud run jobs update "$JOB_NAME" \
    --image="$BACKEND_IMAGE" \
    --region="$REGION" \
    --service-account="$RUNTIME_SA" \
    --set-cloudsql-instances="${PROJECT_ID}:${REGION}:${DB_INSTANCE}" \
    --set-secrets="DATABASE_URL=DATABASE_URL:latest,ADMIN_PASSWORD=ADMIN_PASSWORD:latest" \
    --set-env-vars="NODE_ENV=production,ADMIN_EMAIL=${ADMIN_EMAIL}" \
    --command="npx" \
    --args="tsx,src/seed_db.ts" \
    --project="$PROJECT_ID" \
    --quiet

# ------------------------------------------------------------
# Execute seed
# ------------------------------------------------------------

echo
echo "==> Running database seed..."

gcloud run jobs execute "$JOB_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --wait

echo
echo "============================================================"
echo " Database seed completed successfully"
echo "============================================================"