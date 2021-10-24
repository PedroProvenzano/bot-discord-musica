const socket = io();

const LocalId = Math.floor(Math.random() * 100);

const AppData = {
  queue: [],
};

// Components
const ButtonSend = document.querySelector("#button");

// Components Events
ButtonSend.addEventListener("click", () => {
  const inputLink = document.querySelector("#input");
  if (inputLink.value === "") return;
  sendNewTheme(inputLink.value);
});

// Socket Listeners
socket.on("newSongConfirm", (data) => {
  console.log(data);
  if (data.id !== LocalId) return;
  const inputLink = document.querySelector("#input");
  inputLink.value = "";
  QueuePrinter(data.queue);
});

socket.on("newSongAdded", (data) => {
  QueuePrinter(data.queue, data.nowPlaying);
});

socket.on("welcomeInfo", (data) => {
  console.log(data);
  QueuePrinter(data.queue);
});

// Functions
const QueuePrinter = (queue, nowPlaying = null) => {
  const ListQueue = document.querySelector(".cont-list");
  ListQueue.innerHTML = "";
  if (nowPlaying) {
    let divNowPlaying = document.querySelector("#nowPlaying");
    divNowPlaying.innerHTML = `<p> Estas escuchando: ${nowPlaying}</p>`;
  }
  if (queue?.length >= 1) {
    for (let link of queue) {
      let newDiv = document.createElement("div");
      newDiv.classList.add("item");
      newDiv.innerHTML = `<p>${link}</p>`;
      ListQueue.append(newDiv);
    }
  }
};

const sendNewTheme = (link) => {
  socket.emit("newSong", { link, id: LocalId });
};
