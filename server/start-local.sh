#!/bin/bash
pkill -f 'src/index.js' 2>/dev/null
sleep 1
cd /home/kali/motivCasino/server
nohup env WEBHOOK_URL='' node src/index.js > /tmp/casino-server.log 2>&1 &
disown
sleep 2
cat /tmp/casino-server.log
curl -s http://localhost:3000/health
echo