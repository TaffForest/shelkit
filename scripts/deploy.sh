#!/bin/bash
set -e

echo "=== ShelKit Production Deploy ==="
echo ""

# Check .env
if [ ! -f .env.production ]; then
  echo "Error: .env.production not found. Copy from .env.production.example and fill in values."
  exit 1
fi

# Load env
export $(grep -v '^#' .env.production | xargs)

if [ "$JWT_SECRET" = "CHANGE_ME_TO_A_RANDOM_64_CHAR_STRING" ]; then
  echo "Error: Change JWT_SECRET in .env.production before deploying!"
  exit 1
fi

echo "1. Building and starting containers..."
docker compose --env-file .env.production up -d --build

echo ""
echo "2. Checking health..."
sleep 3
if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
  echo "   ShelKit is running!"
else
  echo "   Waiting for startup..."
  sleep 5
  curl -sf http://localhost:3000/health > /dev/null 2>&1 && echo "   ShelKit is running!" || echo "   Warning: health check failed. Check logs: docker compose logs shelkit"
fi

echo ""
echo "=== Deploy complete ==="
echo ""
echo "App:       https://shelkit.forestinfra.com"
echo "Deploys:   https://<id>.shelkit.forestinfra.com"
echo ""
echo "Next steps:"
echo "  1. Set up DNS: A record for shelkit.forestinfra.com -> this server"
echo "  2. Set up DNS: CNAME *.shelkit.forestinfra.com -> shelkit.forestinfra.com"
echo "  3. Get SSL cert:"
echo "     docker compose run --rm certbot certonly --standalone -d shelkit.forestinfra.com -d '*.shelkit.forestinfra.com'"
echo "  4. Check logs: docker compose logs -f shelkit"
