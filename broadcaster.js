const WebSocket = require('ws');
let args = process.argv.slice(2);

let port = args[0] || 9999;
const wss = new WebSocket.Server({port: port, clientTracking: true});
console.log('starting on port: ' + port + '...');

wss.on('listening', () => console.log('server started'));

wss.on('connection', function connection(ws) {
	console.log('new connection');
	console.log('connections: ' + wss.clients.size);
	ws.on('close', function () {
		console.log('connection closed');
		console.log('connections: ' + wss.clients.size);
	});
	ws.on('message', function incoming(data) {
		// Broadcast to everyone else.
		wss.clients.forEach(function each(client) {
			if (client !== ws && client.readyState === WebSocket.OPEN) {
				client.send(data);
			}
		});
	});
});