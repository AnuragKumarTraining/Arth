#!/usr/bin/env bash

set -euo pipefail

# ============================================================
# Arth - Google Cloud Serverless Deployment
# ============================================================

# -----------------------------
# Configuration
# -----------------------------

PROJECT_ID="project-4f510d6e-25d6-40b9-968"
REGION="us-central1"

BACKEND_SERVICE="arth-backend"
FRONTEND_SERVICE="arth-frontend"

ARTIFACT_REPO="arth-repo"

DB_INSTANCE="arth-postgres"
DB_NAME="arth"
DB_USER="arth_admin"

RUNTIME_SA="arth-backend-runtime@${PROJECT_ID}.iam.gserviceaccount.com"

# Cloud Build currently uses the Compute Engine default SA
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" \
    --format='value(projectNumber)')"

BUILD_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

BUILD_BUCKET="gs://${PROJECT_ID}_cloudbuild"

BACKEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/arth-backend:latest"
FRONTEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/arth-frontend:latest"

# -----------------------------
# Helpers
# -----------------------------

create_or_update_secret() {
    local SECRET_NAME="$1"
    local SECRET_VALUE="$2"

    if gcloud secrets describe "$SECRET_NAME" \
        --project="$PROJECT_ID" >/dev/null 2>&1; then

        printf '%s' "$SECRET_VALUE" |
            gcloud secrets versions add "$SECRET_NAME" \
                --data-file=- \
                --project="$PROJECT_ID" >/dev/null

    else

        printf '%s' "$SECRET_VALUE" |
            gcloud secrets create "$SECRET_NAME" \
                --data-file=- \
                --project="$PROJECT_ID" >/dev/null
    fi
}

secret_exists() {
    gcloud secrets describe "$1" \
        --project="$PROJECT_ID" >/dev/null 2>&1
}

get_secret() {
    gcloud secrets versions access latest \
        --secret="$1" \
        --project="$PROJECT_ID"
}

echo
echo "============================================================"
echo " Arth - Google Cloud Deployment"
echo "============================================================"
echo

# ============================================================
# 1. Select project
# ============================================================

gcloud config set project "$PROJECT_ID"

echo
echo "Project:"
gcloud config get-value project

# ============================================================
# 2. Enable required APIs
# ============================================================

echo
echo "==> Enabling required Google Cloud APIs..."

gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com \
    sqladmin.googleapis.com \
    --project="$PROJECT_ID"

# ============================================================
# 3. Artifact Registry
# ============================================================

echo
echo "==> Creating/checking Artifact Registry repository..."

if ! gcloud artifacts repositories describe "$ARTIFACT_REPO" \
    --location="$REGION" \
    --project="$PROJECT_ID" >/dev/null 2>&1; then

    gcloud artifacts repositories create "$ARTIFACT_REPO" \
        --repository-format=docker \
        --location="$REGION" \
        --description="Arth Docker images" \
        --project="$PROJECT_ID"
fi

# ============================================================
# 4. Cloud Build permissions
# ============================================================

echo
echo "==> Configuring Cloud Build permissions..."

# Cloud Build source bucket
gcloud storage buckets add-iam-policy-binding "$BUILD_BUCKET" \
    --member="serviceAccount:${BUILD_SA}" \
    --role="roles/storage.objectViewer" \
    --project="$PROJECT_ID" \
    --quiet

# Artifact Registry push permission
gcloud artifacts repositories add-iam-policy-binding "$ARTIFACT_REPO" \
    --location="$REGION" \
    --member="serviceAccount:${BUILD_SA}" \
    --role="roles/artifactregistry.writer" \
    --project="$PROJECT_ID" \
    --quiet

# ============================================================
# 5. Runtime service account
# ============================================================

echo
echo "==> Creating/checking Cloud Run runtime service account..."

if ! gcloud iam service-accounts describe "$RUNTIME_SA" \
    --project="$PROJECT_ID" >/dev/null 2>&1; then

    gcloud iam service-accounts create arth-backend-runtime \
        --display-name="Arth Backend Cloud Run Runtime" \
        --project="$PROJECT_ID"
fi

# Cloud SQL access
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="roles/cloudsql.client" \
    --quiet >/dev/null

# ============================================================
# 6. Cloud SQL
# ============================================================

echo
echo "==> Checking Cloud SQL instance..."

if ! gcloud sql instances describe "$DB_INSTANCE" \
    --project="$PROJECT_ID" >/dev/null 2>&1; then

    echo
    echo "Creating Cloud SQL PostgreSQL instance..."

    gcloud sql instances create "$DB_INSTANCE" \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region="$REGION" \
        --storage-type=SSD \
        --storage-size=10GB \
        --availability-type=zonal \
        --project="$PROJECT_ID"
fi

# ============================================================
# 7. Create database
# ============================================================

echo
echo "==> Checking database..."

if ! gcloud sql databases describe "$DB_NAME" \
    --instance="$DB_INSTANCE" \
    --project="$PROJECT_ID" >/dev/null 2>&1; then

    gcloud sql databases create "$DB_NAME" \
        --instance="$DB_INSTANCE" \
        --project="$PROJECT_ID"
fi

# ============================================================
# 8. Database password
# ============================================================

echo
echo "==> Configuring database credentials..."

if secret_exists "DB_PASSWORD"; then

    echo "Existing DB_PASSWORD secret found."
    DB_PASSWORD="$(get_secret DB_PASSWORD)"

else

    echo
    read -rsp "Enter PostgreSQL password for ${DB_USER} (leave empty to generate): " DB_PASSWORD
    echo

    if [[ -z "$DB_PASSWORD" ]]; then
        DB_PASSWORD="$(openssl rand -hex 32)"
        echo "A random database password was generated."
    fi

    # URL-encode password because PostgreSQL URL may contain
    # special characters.
    DB_PASSWORD_ENCODED="$(
        DB_PASSWORD="$DB_PASSWORD" python3 -c \
        'import os, urllib.parse; print(urllib.parse.quote(os.environ["DB_PASSWORD"], safe=""))'
    )"

    # Create/update PostgreSQL user
    if gcloud sql users list \
        --instance="$DB_INSTANCE" \
        --project="$PROJECT_ID" \
        --format="value(name)" |
        grep -Fxq "$DB_USER"; then

        echo "Existing database user found. Updating password..."

        gcloud sql users set-password "$DB_USER" \
            --instance="$DB_INSTANCE" \
            --password="$DB_PASSWORD" \
            --project="$PROJECT_ID"

    else

        echo "Creating database user..."

        gcloud sql users create "$DB_USER" \
            --instance="$DB_INSTANCE" \
            --password="$DB_PASSWORD" \
            --project="$PROJECT_ID"
    fi

    create_or_update_secret "DB_PASSWORD" "$DB_PASSWORD"
fi

# Encode password for DATABASE_URL
DB_PASSWORD_ENCODED="$(
    DB_PASSWORD="$DB_PASSWORD" python3 -c \
    'import os, urllib.parse; print(urllib.parse.quote(os.environ["DB_PASSWORD"], safe=""))'
)"

# ============================================================
# 9. DATABASE_URL secret
# ============================================================

DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD_ENCODED}@/${DB_NAME}?host=/cloudsql/${PROJECT_ID}:${REGION}:${DB_INSTANCE}"

echo
echo "==> Storing DATABASE_URL in Secret Manager..."

create_or_update_secret "DATABASE_URL" "$DATABASE_URL"

# ============================================================
# 10. Admin JWT secret
# ============================================================

echo
echo "==> Configuring ADMIN_JWT_SECRET..."

if secret_exists "ADMIN_JWT_SECRET"; then

    echo "Existing ADMIN_JWT_SECRET found."

else

    ADMIN_JWT_SECRET="$(openssl rand -hex 64)"

    create_or_update_secret \
        "ADMIN_JWT_SECRET" \
        "$ADMIN_JWT_SECRET"

    unset ADMIN_JWT_SECRET
fi

# ============================================================
# 11. Admin password
# ============================================================

echo
echo "==> Configuring ADMIN_PASSWORD..."

if secret_exists "ADMIN_PASSWORD"; then

    echo "Existing ADMIN_PASSWORD found."

else

    read -rsp "Enter admin login password: " ADMIN_PASSWORD
    echo

    if [[ -z "$ADMIN_PASSWORD" ]]; then
        echo "ERROR: Admin password cannot be empty."
        exit 1
    fi

    create_or_update_secret \
        "ADMIN_PASSWORD" \
        "$ADMIN_PASSWORD"

    unset ADMIN_PASSWORD
fi

# ============================================================
# 12. Admin email
# ============================================================

if [[ -z "${ADMIN_EMAIL:-}" ]]; then
    read -rp "Enter admin email: " ADMIN_EMAIL
fi

if [[ -z "$ADMIN_EMAIL" ]]; then
    echo "ERROR: ADMIN_EMAIL cannot be empty."
    exit 1
fi

# ============================================================
# 13. SMTP credentials
# ============================================================

SMTP_HOST="${SMTP_HOST:-smtp.gmail.com}"
SMTP_PORT="${SMTP_PORT:-587}"

echo
echo "SMTP host: $SMTP_HOST"
echo "SMTP port: $SMTP_PORT"

if secret_exists "SMTP_USER"; then

    echo "Existing SMTP_USER found."

else

    read -rp "Enter SMTP username/email: " SMTP_USER

    if [[ -z "$SMTP_USER" ]]; then
        echo "ERROR: SMTP username cannot be empty."
        exit 1
    fi

    create_or_update_secret "SMTP_USER" "$SMTP_USER"

    unset SMTP_USER
fi

if secret_exists "SMTP_PASS"; then

    echo "Existing SMTP_PASS found."

else

    read -rsp "Enter SMTP password/app password: " SMTP_PASS
    echo

    if [[ -z "$SMTP_PASS" ]]; then
        echo "ERROR: SMTP password cannot be empty."
        exit 1
    fi

    create_or_update_secret "SMTP_PASS" "$SMTP_PASS"

    unset SMTP_PASS
fi

# ============================================================
# 14. Grant Secret Manager access to Cloud Run runtime SA
# ============================================================

echo
echo "==> Granting Cloud Run access to secrets..."

for SECRET in \
    DATABASE_URL \
    DB_PASSWORD \
    ADMIN_JWT_SECRET \
    ADMIN_PASSWORD \
    SMTP_USER \
    SMTP_PASS
do

    gcloud secrets add-iam-policy-binding "$SECRET" \
        --member="serviceAccount:${RUNTIME_SA}" \
        --role="roles/secretmanager.secretAccessor" \
        --project="$PROJECT_ID" \
        --quiet >/dev/null

done

# ============================================================
# 15. Remove old PORT env if it exists
# ============================================================

echo
echo "==> Checking for old Cloud Run PORT configuration..."

if gcloud run services describe "$BACKEND_SERVICE" \
    --region="$REGION" \
    --project="$PROJECT_ID" >/dev/null 2>&1; then

    gcloud run services update "$BACKEND_SERVICE" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --remove-env-vars=PORT \
        --quiet || true
fi

# ============================================================
# 16. Build backend
# ============================================================

echo
echo "============================================================"
echo " Building backend"
echo "============================================================"

gcloud builds submit ./backend \
    --tag="$BACKEND_IMAGE" \
    --project="$PROJECT_ID"

# ============================================================
# 17. Deploy backend
# ============================================================

echo
echo "============================================================"
echo " Deploying backend"
echo "============================================================"

gcloud run deploy "$BACKEND_SERVICE" \
    --image="$BACKEND_IMAGE" \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --service-account="$RUNTIME_SA" \
    --add-cloudsql-instances="${PROJECT_ID}:${REGION}:${DB_INSTANCE}" \
    --set-env-vars="NODE_ENV=production,ADMIN_EMAIL=${ADMIN_EMAIL},SMTP_HOST=${SMTP_HOST},SMTP_PORT=${SMTP_PORT},CORS_ORIGIN=http://localhost:5173" \
    --set-secrets="DATABASE_URL=DATABASE_URL:latest,ADMIN_JWT_SECRET=ADMIN_JWT_SECRET:latest,ADMIN_PASSWORD=ADMIN_PASSWORD:latest,SMTP_USER=SMTP_USER:latest,SMTP_PASS=SMTP_PASS:latest" \
    --project="$PROJECT_ID"

# ============================================================
# 18. Get backend URL
# ============================================================

BACKEND_URL="$(
    gcloud run services describe "$BACKEND_SERVICE" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --format='value(status.url)'
)"

echo
echo "Backend URL:"
echo "$BACKEND_URL"

# ============================================================
# 19. Build frontend
#
# VITE_API_BASE is a BUILD-TIME variable.
# It gets baked into the Vite-generated JavaScript.
# ============================================================

echo
echo "============================================================"
echo " Building frontend"
echo "============================================================"

FRONTEND_CLOUDBUILD_CONFIG="$(mktemp)"

trap 'rm -f "$FRONTEND_CLOUDBUILD_CONFIG"' EXIT

cat > "$FRONTEND_CLOUDBUILD_CONFIG" <<EOF
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '--build-arg'
      - 'VITE_API_BASE=${BACKEND_URL}/api'
      - '-t'
      - '${FRONTEND_IMAGE}'
      - './arth-frontend'

images:
  - '${FRONTEND_IMAGE}'
EOF

gcloud builds submit . \
    --config="$FRONTEND_CLOUDBUILD_CONFIG" \
    --project="$PROJECT_ID"

# ============================================================
# 20. Deploy frontend
# ============================================================

echo
echo "============================================================"
echo " Deploying frontend"
echo "============================================================"

gcloud run deploy "$FRONTEND_SERVICE" \
    --image="$FRONTEND_IMAGE" \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --port=8080 \
    --project="$PROJECT_ID"

# ============================================================
# 21. Get frontend URL
# ============================================================

FRONTEND_URL="$(
    gcloud run services describe "$FRONTEND_SERVICE" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --format='value(status.url)'
)"

# ============================================================
# 22. Update backend CORS
# ============================================================

echo
echo "============================================================"
echo " Updating backend CORS"
echo "============================================================"

gcloud run services update "$BACKEND_SERVICE" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --update-env-vars="CORS_ORIGIN=${FRONTEND_URL}" \
    --quiet

# ============================================================
# 23. Final output
# ============================================================

echo
echo
echo "============================================================"
echo " Arth deployment completed"
echo "============================================================"
echo
echo "Frontend:"
echo "$FRONTEND_URL"
echo
echo "Backend:"
echo "$BACKEND_URL"
echo
echo "Backend API:"
echo "${BACKEND_URL}/api"
echo
echo "============================================================"