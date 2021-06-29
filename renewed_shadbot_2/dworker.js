const DecompressLZ4 = require("./build/Release/decompressor").decompress;

const Packet = function(packet) {
  this.packet = packet;
  this.at = 0;
};
Packet.prototype.readVU = function() {
  var number = 0;
  var count = 0;
  do {
    number |= (this.packet[this.at] & 0x7f) << (7 * count++);
  } while((this.packet[this.at++] >> 7) == 1);
  return number;
};
Packet.prototype.writeVU = function(num) {
  let output = [];
  while(num > 0x7f) {
    output[output.length] = (num & 0x7f) | 0x80;
    num >>>= 7;
  }
  output[output.length] = num;
  return output;
};

const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8082 });

let pending;

server.on('connection', function(ws) {
  if(pending != undefined) {
    ws.send(pending);
    pending = undefined;
  }
  ws.on('message', function(message) {
    const data = new Packet(Array.from(message));
    const id = data.readVU();
    const result = DecompressLZ4(data.packet.slice(data.at));
    if(ws.readyState == 1) {
      ws.send(new Uint8Array([...data.writeVU(id), ...result]));
    } else {
      pending = new Uint8Array([...data.writeVU(id), ...result]);
    }
  });
  ws.on('close', function() {});
  ws.on('error', function() {});
});