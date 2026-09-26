const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('RMM Relay Server is Running\n');
});

const wss = new WebSocket.Server({ server });

let agentConnection = null;
const viewers = new Set();

wss.on('connection', (ws) => {
    console.log('New connection established.');

    ws.on('message', (message) => {
        const msgStr = message.toString().trim();

        if (msgStr === 'register_agent') {
            agentConnection = ws;
            console.log('>>> RMM Agent Registered');
            return;
        }
        if (msgStr === 'register_viewer') {
            viewers.add(ws);
            console.log('>>> Viewer Connected');
            return;
        }

        // If message comes from the agent, broadcast to all viewers
        if (ws === agentConnection) {
            for (let viewer of viewers) {
                if (viewer.readyState === WebSocket.OPEN) {
                    viewer.send(message);
                }
            }
        }
    });

    ws.on('close', () => {
        if (ws === agentConnection) {
            console.log('>>> RMM Agent Disconnected');
            agentConnection = null;
        }
        viewers.delete(ws);
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Relay server listening on port ${PORT}`);
});
