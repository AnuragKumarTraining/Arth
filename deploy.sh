#!/usr/bin/env bash
set -e

# Configuration
PROJECT_ID="project-4f510d6e-25d6-40b9-968"
REGION="us-central1"
DB_INSTANCE="arth-db"
DB_NAME="arth_db"
DB_USER="arth_user"
REPO_NAME="arth-repo"

# Credentials setup - zero hardcoded passwords or emails in script
if [ -z "$DB_PASSWORD" ]; then
  read -sp "Enter DB Password (press Enter for auto-generated random password): " DB_PASSWORD || true
  echo ""
  if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(openssl rand -hex 16 2>/dev/null || date +%s%N | head -c 20)
  fi
fi

if [ -z "$ADMIN_PASSWORD" ]; then
  read -sp "Enter Admin Password (press Enter for auto-generated random password): " ADMIN_PASSWORD || true
  echo ""
  if [ -z "$ADMIN_PASSWORD" ]; then
    ADMIN_PASSWORD=$(openssl rand -hex 16 2>/dev/null || date +%s%N | head -c 20)
  fi
fi

if [ -z "$ADMIN_JWT_SECRET" ]; then
  ADMIN_JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || date +%s%N | head -c 32)
fi

SMTP_HOST="${SMTP_HOST:-smtp.gmail.com}"
SMTP_PORT="${SMTP_PORT:-587}"

if [ -z "$SMTP_USER" ]; then
  read -p "Enter SMTP Email User (press Enter to skip): " SMTP_USER || true
  SMTP_USER="${SMTP_USER:-disabled@arth.local}"
fi

if [ -z "$SMTP_PASS" ]; then
  read -sp "Enter SMTP Email Password (press Enter to skip): " SMTP_PASS || true
  echo ""
  SMTP_PASS="${SMTP_PASS:-disabled}"
fi

echo "=== 1. Setting GCP Project & Region ==="
gcloud config set project "$PROJECT_ID"
gcloud config set run/region "$REGION"

echo "=== 2. Enabling GCP Services & Assigning IAM Roles ==="
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant Artifact Registry Writer, Logs Writer, Storage Admin, Cloud SQL Client, and Secret Manager Accessor roles
for SA in "$COMPUTE_SA" "$CLOUDBUILD_SA"; do
  for ROLE in "roles/artifactregistry.writer" "roles/artifactregistry.admin" "roles/logging.logWriter" "roles/storage.admin" "roles/secretmanager.secretAccessor" "roles/cloudsql.client"; do
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
      --member="serviceAccount:${SA}" \
      --role="$ROLE" --quiet >/dev/null 2>&1 || true
  done
done

# Grant bucket-level storage admin if bucket exists
gcloud storage buckets add-iam-policy-binding "gs://${PROJECT_ID}_cloudbuild" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/storage.admin" --quiet >/dev/null 2>&1 || true
gcloud storage buckets add-iam-policy-binding "gs://${PROJECT_ID}_cloudbuild" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/storage.admin" --quiet >/dev/null 2>&1 || true

# Configure Docker auth for Artifact Registry
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

echo "=== 3. Creating Artifact Registry Repository ==="
if ! gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$REPO_NAME" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Arth Docker Repository"
fi

echo "=== 4. Creating Cloud SQL Instance ($8/month micro tier) ==="
if ! gcloud sql instances describe "$DB_INSTANCE" >/dev/null 2>&1; then
  gcloud sql instances create "$DB_INSTANCE" \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region="$REGION" \
    --storage-auto-increase
fi

echo "=== 5. Creating Database and User ==="
if ! gcloud sql databases describe "$DB_NAME" --instance="$DB_INSTANCE" >/dev/null 2>&1; then
  gcloud sql databases create "$DB_NAME" --instance="$DB_INSTANCE"
fi

if ! gcloud sql users list --instance="$DB_INSTANCE" | grep -q "$DB_USER"; then
  gcloud sql users create "$DB_USER" --instance="$DB_INSTANCE" --password="$DB_PASSWORD"
fi

echo "=== 6. Setting Up Secrets in Secret Manager ==="
DB_URL="postgres://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${PROJECT_ID}:${REGION}:${DB_INSTANCE}"

if ! gcloud secrets describe DATABASE_URL >/dev/null 2>&1; then
  echo -n "$DB_URL" | gcloud secrets create DATABASE_URL --data-file=-
else
  echo -n "$DB_URL" | gcloud secrets versions add DATABASE_URL --data-file=-
fi

if ! gcloud secrets describe ADMIN_JWT_SECRET >/dev/null 2>&1; then
  echo -n "$ADMIN_JWT_SECRET" | gcloud secrets create ADMIN_JWT_SECRET --data-file=-
fi

echo "=== 7. Building & Deploying Backend Cloud Run Service ==="
BACKEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/arth-backend:latest"

if command -v docker >/dev/null 2>&1; then
  echo "Building backend using Docker in Cloud Shell..."
  docker build -t "$BACKEND_IMAGE" ./backend
  docker push "$BACKEND_IMAGE"
else
  echo "Building backend using Cloud Build..."
  gcloud builds submit --tag "$BACKEND_IMAGE" ./backend
fi

gcloud run deploy arth-backend \
  --image "$BACKEND_IMAGE" \
  --add-cloudsql-instances "${PROJECT_ID}:${REGION}:${DB_INSTANCE}" \
  --remove-env-vars PORT \
  --update-secrets DATABASE_URL=DATABASE_URL:latest,ADMIN_JWT_SECRET=ADMIN_JWT_SECRET:latest \
  --set-env-vars NODE_ENV=production,ADMIN_EMAIL="${ADMIN_EMAIL:-admin@arth.com}",ADMIN_PASSWORD="${ADMIN_PASSWORD}",SMTP_HOST="${SMTP_HOST}",SMTP_PORT="${SMTP_PORT}",SMTP_USER="${SMTP_USER}",SMTP_PASS="${SMTP_PASS}" \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 2

BACKEND_URL=$(gcloud run services describe arth-backend --format='value(status.url)')
echo "Backend Cloud Run URL: $BACKEND_URL"

echo "=== 8. Building & Deploying Frontend Cloud Run Service ==="
FRONTEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/arth-frontend:latest"

if command -v docker >/dev/null 2>&1; then
  echo "Building frontend using Docker in Cloud Shell..."
  docker build --build-arg "VITE_API_BASE=${BACKEND_URL}/api" -t "$FRONTEND_IMAGE" ./arth-frontend
  docker push "$FRONTEND_IMAGE"
else
  echo "Building frontend using Cloud Build..."
  gcloud builds submit \
    --tag "$FRONTEND_IMAGE" \
    --build-arg "VITE_API_BASE=${BACKEND_URL}/api" \
    ./arth-frontend
fi

gcloud run deploy arth-frontend \
  --image "$FRONTEND_IMAGE" \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 2

FRONTEND_URL=$(gcloud run services describe arth-frontend --format='value(status.url)')

echo "=== 9. Updating CORS_ORIGIN on Backend ==="
gcloud run services update arth-backend \
  --update-env-vars CORS_ORIGIN="$FRONTEND_URL"

echo "=========================================================="
echo "DEPLOYMENT COMPLETE!"
echo "Backend URL:  $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo "=========================================================="
