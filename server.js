const express = require("express");
const app = express();
const server = require('http').createServer(app);
const WebSocket = require('ws');

const wss = new WebSocket.Server({ server });

const clients = new Map();
const remainingTimeMap = new Map();

const now = new Date(); // Get the current date and time
const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 2, 0, 0, 0); // Set to 1 AM
const remainingTime = endTime - now;


const getCurrentTime = () => {
    return new Date().toLocaleTimeString();
};

wss.on('connection', function connection(ws) {

    console.log(`\nClient connected at ${getCurrentTime()}`);

    ws.on('message', function incoming(message) {
        const receivedMessage = JSON.parse(message);
        console.log('Received: ', receivedMessage);
        if (receivedMessage.status === "just_joined") {
            console.log(2)
            let mapRemainingTime = 0
            clients.set(ws, receivedMessage.reg_no);
            console.log(`Candidate with ${receivedMessage.reg_no} just joined at ${getCurrentTime()}`);


            console.log(remainingTimeMap.has(receivedMessage.reg_no))

            if (remainingTimeMap.has(receivedMessage.reg_no)){
                mapRemainingTime = remainingTimeMap.get(receivedMessage.reg_no);
            }
            else
            {
                mapRemainingTime = remainingTime
            }

            const data = {
                "hasMap": false,
                "remaining_time": mapRemainingTime,
                "just_joined_time": getCurrentTime(),
                "message": `Welcome ${receivedMessage.reg_no} at ${getCurrentTime()}`
            };
            ws.send(JSON.stringify(data));
        }
        else if (receivedMessage.status == "needMap")
        {
            console.log(remainingTimeMap)
            const data = {
                "hasMap": true,
                "map": remainingTimeMap
            }
            ws.send(JSON.stringify(data));
        }
    });

    ws.on('close', function close() {
        const clientId = clients.get(ws);
        clients.delete(ws);
        const remaining_time = remainingTime - (new Date())
        remainingTimeMap.set(clientId,remaining_time);
        console.log(`\nClient ${clientId} disconnected at ${getCurrentTime()}, remaining_time for the client is ${remaining_time}`);
    });

    ws.on('error', function error(err) {
        console.error('WebSocket error: ', err);
    });
});

// Function to send a message to all clients
function sendMessageToAllClients(message) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Function to check if it's the required time and send a message
function checkAndSendMessage() {
    const now = new Date();
    if (now.getHours() === 22 && now.getMinutes() === 52) { // Set the starting time here
        sendMessageToAllClients(`It is ${now.getHours()}:${now.getMinutes()}`);
    }
}

// Calculate time until the next required time
function getMillisecondsUntilNextRequiredTime() {
    const now = new Date();
    let nextRequiredTime = new Date();
    nextRequiredTime.setHours(22, 52, 0, 0); // Set the starting time here

    if (now >= nextRequiredTime) {
        nextRequiredTime.setDate(nextRequiredTime.getDate() + 1); // Move to the next day
    }

    return nextRequiredTime - now;
}

// Set initial timeout for the requested time
const initialDelay = getMillisecondsUntilNextRequiredTime();
setTimeout(() => {
    checkAndSendMessage(); // Send the message at the next requested time
    setInterval(checkAndSendMessage, 60000); // Check every minute thereafter
}, initialDelay);

app.get("/", (req, res) => {
    res.send("Hello World");
});

server.listen(3000, () => console.log('Server running on port: 3000'));
