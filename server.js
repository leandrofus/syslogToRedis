const dgram = require("dgram");
const net = require("net");
const { createClient } = require("redis");
const fs = require("fs");

const REDIS_HOST = "10.10.0.21";
const REDIS_PORT = 6379;
const REDIS_CHANNEL = "syslog";

const SYSLOG_HOST = "localhost";
const SYSLOG_PORT = 515;
const SYSLOG_PROTOCOL = "udp";

const UDP_PORT = 514;
const TCP_PORT = 514;

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
        const logMessage = msg;
        console.log(logMessage);
        sendToRedis(msg.toString());
    });

    server.bind(UDP_PORT);
}

function startTcpServer() {
    const server = net.createServer((socket) => {
        socket.on("data", (data) => {
            const logMessage = data.toString();
            console.log(logMessage);
            sendToRedis(data.toString());
        });
    });

    server.listen(TCP_PORT);
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