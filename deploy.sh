#!/bin/bash
cd ~/segwise
# Setup backend
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
# Setup frontend
cd frontend
npm install
npm run build
cd ..
# Start with PM2
npm install -g pm2
pm2 start uvicorn --name "segwise-api" -- backend.main:app --host 0.0.0.0 --port 8000
cd frontend
pm2 start npm --name "segwise-ui" -- start
pm2 save
