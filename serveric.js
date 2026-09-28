const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('RMSCI Relay Server is Running\n');
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
            console.log('>>> RMSCI Agent Registered');
            return;
        }
        if (msgStr === 'register_viewer') {
            viewers.add(ws);
            console.log('>>> RMSCI Viewer Connected');
            return;
        }

        // Forward screen bytes from agent -> all viewers
        if (ws === agentConnection) {
            for (let viewer of viewers) {
                if (viewer.readyState === WebSocket.OPEN) {
                    viewer.send(message);
                }
            }
        } 
        // Forward JSON controls from viewer -> agent
        else if (viewers.has(ws)) {
            if (agentConnection && agentConnection.readyState === WebSocket.OPEN) {
                agentConnection.send(message);
            }
        }
    });

    ws.on('close', () => {
        if (ws === agentConnection) {
            console.log('>>> RMSCI Agent Disconnected');
            agentConnection = null;
        }
        viewers.delete(ws);
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`RMSCI Relay server listening on port ${PORT}`);
});
