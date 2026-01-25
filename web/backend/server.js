const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

console.log('WebSocket server started on port 8080');

wss.on('connection', function connection(ws) {
  console.log('Client connected');

  ws.on('message', function incoming(data) {
    // Convert Buffer to string if necessary, though ws handles diverse types
    const message = data.toString();
    console.log('received: %s', message);

    // Broadcast to all other clients
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
