#!/bin/bash

# Deploy Frontend to S3 - Local Deployment Script
# Usage: ./deploy-s3.sh

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Deploying MicroArt Frontend to S3${NC}"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Create a .env file with:"
    echo "  REACT_APP_GRAPHQL_URL"
    echo "  REACT_APP_GRAPHQL_WS_URL"
    echo "  REACT_APP_API_URL"
    echo "  REACT_APP_VAPID_PUBLIC_KEY"
    echo "  S3_BUCKET"
    echo "  CLOUDFRONT_DISTRIBUTION_ID (optional)"
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Validate required variables
if [ -z "$S3_BUCKET" ]; then
    echo -e "${RED}❌ S3_BUCKET not set in .env${NC}"
    exit 1
fi

if [ -z "$REACT_APP_GRAPHQL_URL" ]; then
    echo -e "${RED}❌ REACT_APP_GRAPHQL_URL not set in .env${NC}"
    exit 1
fi

# Install dependencies
echo -e "${YELLOW}📥 Installing dependencies...${NC}"
npm ci --silent

# Build application
echo -e "${YELLOW}🔨 Building application...${NC}"
NODE_OPTIONS="--max-old-space-size=768" npm run build

# Check build success
if [ ! -d "build" ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed${NC}"

# Upload to S3
echo -e "${YELLOW}☁️  Uploading to S3: s3://${S3_BUCKET}${NC}"

# Sync all files except index.html
aws s3 sync build/ s3://${S3_BUCKET}/ \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "index.html" \
    --exclude "service-worker.js" \
    --exclude "manifest.json"

# Upload index.html with no-cache
aws s3 cp build/index.html s3://${S3_BUCKET}/index.html \
    --cache-control "no-cache, no-store, must-revalidate" \
    --content-type "text/html"

# Upload service-worker.js with no-cache
if [ -f "build/service-worker.js" ]; then
    aws s3 cp build/service-worker.js s3://${S3_BUCKET}/service-worker.js \
        --cache-control "no-cache, no-store, must-revalidate" \
        --content-type "application/javascript"
fi

# Upload manifest.json
if [ -f "build/manifest.json" ]; then
    aws s3 cp build/manifest.json s3://${S3_BUCKET}/manifest.json \
        --cache-control "public, max-age=3600" \
        --content-type "application/json"
fi

echo -e "${GREEN}✅ Upload completed${NC}"

# Invalidate CloudFront
if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo -e "${YELLOW}🔄 Invalidating CloudFront cache...${NC}"
    
    aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
        --paths "/*" \
        --output text > /dev/null
    
    echo -e "${GREEN}✅ CloudFront cache invalidated${NC}"
fi

echo ""
echo -e "${GREEN}✨ Deployment complete!${NC}"
echo -e "${GREEN}🌐 Your app is live at: https://app.imagecare.in${NC}"
