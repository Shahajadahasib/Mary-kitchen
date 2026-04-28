#!/bin/bash
# ─── Mary Kitchen – Development Environment Setup ────────────────────────────
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}   Mary Kitchen – Setup Script        ${NC}"
echo -e "${BLUE}======================================${NC}\n"

# ─── Python venv + backend ────────────────────────────────────────────────────
echo -e "${GREEN}[1/6] Creating Python virtual environment...${NC}"
cd "$(dirname "$0")/backend"
python3 -m venv venv
source venv/bin/activate

echo -e "${GREEN}[2/6] Installing Python dependencies...${NC}"
pip install --upgrade pip
pip install -r requirements.txt

echo -e "${GREEN}[3/6] Setting up .env file...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    # Generate a random secret key
    SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
    sed -i.bak "s/your-secret-key-change-in-production/$SECRET/" .env && rm -f .env.bak
    echo -e "${YELLOW}  .env created from template. Review and update DB credentials.${NC}"
else
    echo -e "${YELLOW}  .env already exists – skipping.${NC}"
fi

echo -e "${GREEN}[4/6] Running database migrations...${NC}"
python manage.py migrate --settings=mary_kitchen.settings.development

echo -e "${GREEN}[5/6] Creating superuser (optional)...${NC}"
echo -e "${YELLOW}  You can create one now or skip (Ctrl+C to skip)${NC}"
python manage.py createsuperuser --settings=mary_kitchen.settings.development || true

cd ..

# ─── Frontend ─────────────────────────────────────────────────────────────────
echo -e "${GREEN}[6/6] Installing Node.js dependencies...${NC}"
cd frontend
if [ ! -f .env.local ]; then
    cp .env.local.example .env.local
    echo -e "${YELLOW}  .env.local created. Update NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.${NC}"
fi
npm install

echo -e "\n${BLUE}======================================${NC}"
echo -e "${BLUE}   Setup Complete!                    ${NC}"
echo -e "${BLUE}======================================${NC}\n"
echo -e "Start the development servers:"
echo -e ""
echo -e "  ${GREEN}# Terminal 1 – Django backend${NC}"
echo -e "  cd backend && source venv/bin/activate"
echo -e "  python manage.py runserver"
echo -e ""
echo -e "  ${GREEN}# Terminal 2 – Celery worker (optional)${NC}"
echo -e "  cd backend && source venv/bin/activate"
echo -e "  celery -A mary_kitchen worker -l info"
echo -e ""
echo -e "  ${GREEN}# Terminal 3 – Next.js frontend${NC}"
echo -e "  cd frontend && npm run dev"
echo -e ""
echo -e "  ${GREEN}# Or use Docker (all-in-one)${NC}"
echo -e "  docker-compose up --build"
echo -e ""
echo -e "  Backend: http://localhost:8000"
echo -e "  API Docs: http://localhost:8000/api/docs/"
echo -e "  Frontend: http://localhost:3000"
echo -e ""
