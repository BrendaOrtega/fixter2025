import { Server, type Socket } from "socket.io";
// @todo move io to deno
// import { Server } from "node-static";
// import { createServer } from "http";
//@ts-ignore
const io = new Server(8000, {
  cors: {
    origin: "*",
  },
});

const onConnection = (socket: Socket) => {
  console.log("Conection coming");
  // registerOrderHandlers(io, socket);
  // registerUserHandlers(io, socket);
  socket.on("test", (test: string) => {
    console.log("Working?");
    socket.broadcast.emit("Testing perro: ", test);
  });
};

io.on("connection", onConnection);

io.sockets.on("connection", (socket) => {
  socket.on("test", (test: string) => {
    console.log("Working?");
    socket.broadcast.emit("Testing perro: ", test);
  });
});

export const startSocketsServer = (request: Request) => {};
