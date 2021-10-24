const Discord = require("discord.js");
const ytdl = require("ytdl-core");
const client = new Discord.Client();
const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const fetch = require("node-fetch");
let urlAPI = "https://www.googleapis.com/youtube/v3/videos?part=snippet&id=";
let APIKEY = process.env.YOUTUBEAPI;
const getVideoId = require("get-video-id");
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Global Variables
let queue = [];
let titleQueue = [];
let isPlaying = false;
const port = 3000;
let dispatcher;
let play;

// Functions

// Discord Bot
const AddToQueueHandler = async (link, msg) => {
  console.log(`Added to queue ${link}`);
  queue.push(link);
  if (isPlaying) {
    msg.reply(`Agregado a la fila ${link}`);
  }
  const newQueue = await GetSongTitles(queue);
  io.emit("newSongAdded", { queue: newQueue });
};

const GetNextSongHandler = (msg) => {
  let newSong = queue[0];
  queue = queue.slice(1);
  console.log(`Removing ${newSong} from playlist`);
  msg.reply(`Reproduciendo ${newSong}`);
  return newSong;
};

// Public HTML
const GetSongTitles = async (queue) => {
  if (queue.length === 0) return;
  let TitleQueue = [];
  for (let link of queue) {
    let key = getVideoId(link).id;
    await fetch(urlAPI + key + "&key=" + APIKEY)
      .then((res) => res.json())
      .then(async (res) => {
        console.log(res.items[0].snippet.title);
        TitleQueue.push(res.items[0].snippet.title);
      });
  }
  console.log(TitleQueue);
  return TitleQueue;
};

// Middleware
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

client.on("message", async (msg) => {
  let msgLower = msg.content.toLowerCase();
  if (msgLower.startsWith("-play") && !isPlaying) {
    const youtubeLink = msg.content.slice(6);
    AddToQueueHandler(youtubeLink, msg);

    const connection = await msg.member.voice.channel.join();
    play = () => {
      isPlaying = true;
      dispatcher = connection.play(
        ytdl(GetNextSongHandler(msg), {
          filter: "audioonly",
        })
      );
      dispatcher.on("finish", async () => {
        if (queue.length === 0) {
          await msg.member.voice.channel.leave();
          isPlaying = false;
        } else {
          play();
        }
      });
    };
    play();
  } else if (msgLower.startsWith("-play") && isPlaying) {
    AddToQueueHandler(msg.content.slice(6), msg);
  }
  if (msg.content === "-stop") {
    await msg.member.voice.channel.leave();
    isPlaying = false;
  }
  if (msgLower === "-skip") {
    if (queue.length === 0) {
      msg.reply(`Adios`);
      isPlaying = false;
      dispatcher.destroy();
      await msg.member.voice.channel.leave();
    } else {
      play();
    }
  }
});

client.login(process.env.TOKENDISCORD);

io.on("connection", async (socket) => {
  console.log("Usuario conectado");

  let newQueue = await GetSongTitles(queue);

  socket.emit("welcomeInfo", { queue: newQueue });

  socket.on("newSong", async (data) => {
    queue.push(data.link);
    let TitleQueue = await GetSongTitles(queue);
    console.log(TitleQueue);
    socket.emit("newSongConfirm", {
      id: data.id,
      queue: TitleQueue,
    });
  });
});

http.listen(process.env.PORT, () => {
  console.log("listening on *:3000");
});
