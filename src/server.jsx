// @flow

import { Map, Set } from 'immutable';
import express from 'express';
import http from 'http';
import path from 'path';
import { Server as WebSocketServer } from 'uws';
import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';

import config from '../config';

const speech = require('@google-cloud/speech')({
  projectId: 'caramel-graph-108315',
  keyFilename: './key.json',
});

var request = {
  config: {
    encoding: 'LINEAR16',
    sampleRate: 36000
  },
  singleUtterance: false,
  interimResults: false
};

function setup(stream, name) {
  console.log('setup')
  stream.pipe(speech.createRecognizeStream(request))
    .on('close', () => setup(stream, name))
    .on('error', error => console.log('!!' + error))
    .on('data', data => {
      if (data.results.length > 0 && streams.has(name)) {
        streams.get(name).sockets.forEach(ws => ws.send(data.results));
      }
    });
}


const app = express();
const server = http.Server(app);
const wss = new WebSocketServer({ server });

let streams = new Map();
let socketToStream = new Map();

let nextSocketID = 0;
let nextPort = 3001;

function setupStream(stream) {
  let port = nextPort++;
  if (nextPort === 4000) nextPort = 3001;
  streams.get(stream).port = port
  streams.get(stream).process = spawn(
    'streamlink', 
    [
      `twitch.tv/${stream}`,  
      'audio_only', 
      '--player-external-http', 
      '--player-external-http-port', 
      `${port}`,
    ]
  );
  let counter = 0;
  streams.get(stream).process.stdout.on('data', data => {
    counter++;
    console.log(data.toString())
    if (counter === 3) {
      http.get(`http://127.0.0.1:${port}/`, res => {
        const command = ffmpeg(res).format('s16le').audioFrequency(16000)
        const stream2 = command.pipe();
        stream2.on('error', err => console.log(err))
        setup(stream2, stream);
      });
    }
  })
  // streams.get(stream).process.stderr.on('data', data => console.log(data))
  // 
}

function stopStream(stream) {
  streams.get(stream).process.kill();
  console.log("KILLED")
}

wss.on('connection', ws => {
  console.log('connect')
  const id = nextSocketID++;
  ws.on('message', data => {
    console.log(data)
    const msg = JSON.parse(data);
    switch (msg.type) {
      case 'load':
        if (socketToStream.has(id)) {
          streams.get(socketToStream.get(id)).sockets = streams.get(socketToStream.get(id)).sockets.delete(ws);
          if (streams.get(socketToStream.get(id)).sockets.size === 0) {
            stopStream(socketToStream.get(id));
            streams = streams.delete(socketToStream.get(id));
          }
        }
        socketToStream = socketToStream.set(id, msg.stream);
        if (!streams.has(msg.stream)) {
          streams = streams.set(msg.stream, { sockets: new Set(), process: null });
          setupStream(msg.stream);
        }
        streams.get(msg.stream).sockets = streams.get(msg.stream).sockets.add(ws);
        break;
    }
  });

  ws.on('close', () => {
    if (socketToStream.has(id)) {
      streams.get(socketToStream.get(id)).sockets = streams.get(socketToStream.get(id)).sockets.delete(ws);
      if (streams.get(socketToStream.get(id)).sockets.size === 0) {
        stopStream(socketToStream.get(id));
        streams = streams.delete(socketToStream.get(id));
      }
    }
  });
});

server.listen(process.env.PORT || config.ports.express, () => {
  console.log('listening on port ' + process.env.PORT || config.ports.express);
});

app.use('/assets', express.static(
  path.join(__dirname, 'static')
));

let jsFile;
if (process.env.NODE_ENV === 'production') {
  jsFile = `/assets/${config.files.client.out}/${config.files.client.outFile}`;
} else {
  jsFile = `http://localhost:${config.ports.webpack}/${config.files.client.outFile}`;
}

app.use((req, res) => {
  const html = `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Transcribe Twitch</title>
    </head>
    <body>
      <div id="root"></div>
      <script async defer src="${jsFile}"></script>
    </body>
  </html>`;
  res.send(html);
});
