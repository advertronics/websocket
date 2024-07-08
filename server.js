import { createServer } from "http"
import { Server } from "socket.io"

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: "https://cinema-google.vercel.app/",
    methods: ["GET", "POST"]
  }
})

//============= SOCKET IO FOR TRACKING LOGGED IN USERS ==========//
let activeUsers = []

const loggedInUsers = io.of("/logged-in-users")

loggedInUsers.on("connection", socket => {
  let checkIfUserExists

  socket.on("authentication", ({ userEmail, loggedInID }) => {
    checkIfUserExists = activeUsers.find(user => user.userEmail == userEmail)
    if (!checkIfUserExists) {
      activeUsers.push({ userEmail, loggedInID })
      console.log(loggedInID)
      socket.join(loggedInID)
    } else {
      const message = "Logging out of other signed in devices"
      socket.emit("userExist", { loggenId: checkIfUserExists.loggedInID, newId: loggedInID, message })

      loggedInUsers.to(checkIfUserExists.loggedInID).emit("logout", "you are about to be logged out")
      const filteredActiveUsers = activeUsers.filter(user => user.loggedInID != checkIfUserExists.loggedInID)

      activeUsers.length = 0
      activeUsers = []
      activeUsers = [...filteredActiveUsers]
      activeUsers.push({ userEmail, loggedInID })
      socket.join(loggedInID)
    }
  })
})

//============== SOCKET IO FOR PAYMENTS ===============//
let merchantId = ""
let resultDesc = ""
let receiver = ""

let onGoingPayments = []

const addNewPayment = (id, socket) => {
  !onGoingPayments.some(payment => payment.merchantId === id) && onGoingPayments.push({ merchantId: id, socket })
}

const getOnePayment = id => {
  return onGoingPayments.find(payment => payment.merchantId == id)
}

const removePayment = id => {
  return onGoingPayments.filter(payment => payment.id != id)
}

io.on("connection", socket => {
  socket.on("registerPayment", merchantId => {
    addNewPayment(merchantId, socket.id)
  })
  socket.on("safCallbackResponse", ({ merchantRequestID, resultDesc, mpesaReceiptNumber }) => {
    merchantId = merchantRequestID
    resultDesc = resultDesc
    receiver = getOnePayment(merchantId)

    io.to(merchantRequestID).emit("eventId", { merchantRequestID, resultDesc, mpesaReceiptNumber })
    console.log("receiver is: ", receiver)

    console.log("merchantId: ", merchantId)
  })

  socket.on("join_room", data => {
    socket.join(data)
  })

  socket.on("disconnect", () => {
    removePayment(socket.id)
  })
})

httpServer.listen(5000)
