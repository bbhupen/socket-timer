const express = require("express");
const app = express();
const cors = require('cors');
const server = require('http').createServer(app);
require('dotenv').config();
const WebSocket = require('ws');
const { selectAllExamCandidate, updateExamCandidate } = require("./data_access/examCandidate");
app.use(cors());


const wss = new WebSocket.Server({ server });

const clients = new Map();
const redis = {}

const now = new Date(); 
const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0, 0, 0); // Set to 1 AM
const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0, 0); // Set to 1 AM
const duration = endTime - startTime

const getCurrentTime = () => {
    return new Date();
};


/*
    --- On connection ---
    - candidates connects to the system and start the exam.
    - logic takes the remaining_duration from the database and sends to all clients
    - logic stores the connect_time to database
    - as usual exam goes on

    --- On disconnect ---
    - the disconnect time is recorded and stored
    - the remaining time is recorded and updated in db

    --- On reconnect ---
    - the connect time is updated and stored
    - exam goes on

*/

const HEARTBEAT_TIMEOUT = 1000; // 10 seconds

function heartbeat() {
    this.isAlive = true;
}

wss.on('connection', function connection(ws) {
    ws.isAlive = true;
    ws.on('pong', heartbeat);

    console.log(`\nClient connected at ${getCurrentTime()}`);

    ws.on('message', async function incoming(message) {
        const receivedMessage = JSON.parse(message);

        if (clients.has(ws)) {
            // Handle reconnection logic if needed
        }

        const connect_time = getCurrentTime();
        clients.set(ws, {"regno": receivedMessage.regno, "exam_id": receivedMessage.exam_id});

        const candidateRecord = await selectAllExamCandidate(receivedMessage);
        const data = {
            "connect_time": connect_time,
            "exam_id": receivedMessage.exam_id,
            "regno": receivedMessage.regno
        };

        updateExamCandidate(data);
        ws.send(JSON.stringify(candidateRecord));
    });

    ws.on('close', async function close() {
        if (clients.has(ws)) {
            const client = clients.get(ws); 
            const dc_time = getCurrentTime();

            const candidateRecord = await selectAllExamCandidate(client);
            const connect_time = new Date(candidateRecord[0].connect_time);
            const elapsed_time = dc_time - connect_time;

            const data = {
                "remaining_duration": candidateRecord[0].remaining_duration - elapsed_time + 2000,
                "disconnect_time": dc_time,
                "exam_id": client.exam_id,
                "regno": client.regno
            };

            updateExamCandidate(data);
            clients.delete(ws);
            console.log(`\nClient ${client.regno} disconnected at ${getCurrentTime()}`);
        }
    });

    ws.on('error', function error(err) {
        console.error('WebSocket error: ', err);
    });


});

// Heartbeat checking
setInterval(() => {
    console.log("pinging now");
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
    });
}, HEARTBEAT_TIMEOUT);


app.get("/", (req, res) => {
    res.send("Hello World");
});

app.get("/heartbeat", (req, res) => {
    res.send("beating");
});

server.listen(3000, () => console.log('Server running on port: 3000'));

