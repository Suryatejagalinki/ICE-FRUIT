const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let users = [];

io.on('connection', (socket) => {
    console.log('A user connected');

    users.push(socket.id);

    socket.on('start chat', () => {
        const otherUsers = users.filter(id => id !== socket.id);
        if (otherUsers.length > 0) {
            const partnerId = otherUsers[Math.floor(Math.random() * otherUsers.length)];
            socket.emit('chat partner', partnerId);
            socket.to(partnerId).emit('chat partner', socket.id);
        }
    });

    socket.on('signal', (data) => {
        socket.to(data.to).emit('signal', {
            from: socket.id,
            signal: data.signal
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        users = users.filter(user => user !== socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});