const dgram = require("dgram");
const net = require("net");
const { createClient } = require("redis");
const fs = require("fs");
const dotnet = require('dotenv');

dotnet.config();
console.log("Starting syslog relay");
//redis server
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_CHANNEL = process.env.REDIS_CHANNEL || "syslog";

//remote syslog server to send logs
const SYSLOG_HOST = process.env.SYSLOG_HOST;
const SYSLOG_PORT = process.env.SYSLOG_PORT || 514;
const SYSLOG_PROTOCOL = process.env.SYSLOG_PROTOCOL || "tcp";

console.log("REDIS_HOST:", REDIS_HOST);
console.log("REDIS_PORT:", REDIS_PORT);
console.log("REDIS_CHANNEL:", REDIS_CHANNEL);
console.log("SYSLOG_HOST:", SYSLOG_HOST);
console.log("SYSLOG_PORT:", SYSLOG_PORT);
console.log("SYSLOG_PROTOCOL:", SYSLOG_PROTOCOL);

const filePath = "output.log";

const stream = fs.createWriteStream(filePath, { flags: "a" });

function writeLine(line) {
  stream.write(line + "\n");
}


const redisPublisher = createClient({ url: `redis://${REDIS_HOST}:${REDIS_PORT}` });
redisPublisher.connect().catch(console.error);

const redisSubscriber = createClient({ url: `redis://${REDIS_HOST}:${REDIS_PORT}` });
redisSubscriber.connect().catch(console.error);

const udpClient = dgram.createSocket("udp4");

async function sendToRedis(message) {
    try {
        await redisPublisher.publish(REDIS_CHANNEL, message);
        console.log(message);
        
    } catch (error) {
        console.error("Error:", error);
    }
}

function sendToSyslog(message) {
    if (SYSLOG_PROTOCOL === "udp") {
        udpClient.send(message, SYSLOG_PORT, SYSLOG_HOST, (err) => {
            if (err) console.error("Error", err);
        });
    } else if (SYSLOG_PROTOCOL === "tcp") {
        const tcpClient = new net.Socket();
        tcpClient.connect(SYSLOG_PORT, SYSLOG_HOST, () => {
            tcpClient.write(message + "\n", () => {
                tcpClient.end();
            });
        });

        tcpClient.on("error", (err) => {
            console.error("Error enviando a Syslog TCP:", err);
        });
    }
}

function startUdpServer() {
    const server = dgram.createSocket("udp4");

    server.on("message", (msg) => {
        const logMessage = msg.toString();
        sendToRedis(logMessage);
    });

    server.bind(514);
}

function startTcpServer() {
    const server = net.createServer((socket) => {
        socket.on("data", (data) => {
            const logMessage = data.toString();
            sendToRedis(logMessage)
        });
    });

    server.listen(514);
}

async function startRelay() {
  await redisSubscriber.subscribe(REDIS_CHANNEL, (message) => {
    sendToSyslog(message);
    writeLine(message);

});
}

startUdpServer();
startTcpServer();
startRelay();