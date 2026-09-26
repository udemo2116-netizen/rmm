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
        // Handle registration messages
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

        // 1. If message comes from the AGENT, broadcast screen frames to all viewers
        if (ws === agentConnection) {
            for (let viewer of viewers) {
                if (viewer.readyState === WebSocket.OPEN) {
                    // Prevent buffer congestion lag
                    if (viewer.bufferedAmount < 1024 * 1024) {
                        viewer.send(message);
                    }
                }
            }
            return;
        }

        // 2. If message comes from a VIEWER, forward mouse/keyboard commands to the agent
        if (viewers.has(ws)) {
            if (agentConnection && agentConnection.readyState === WebSocket.OPEN) {
                agentConnection.send(message);
            }
            return;
        }
    });

    ws.on('close', () => {
        if (ws === agentConnection) {
            console.log('>>> RMM Agent Disconnected');
            agentConnection = null;
        }
        if (viewers.has(ws)) {
            console.log('>>> Viewer Disconnected');
            viewers.delete(ws);
        }
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Relay server listening on port ${PORT}`);
});
