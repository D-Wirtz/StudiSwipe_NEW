const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server)

const bp = require('body-parser')
const { randomUUID } = require('crypto')
const cookieParser = require('cookie-parser')

const DB = require("./libs/db")

const accounts = new DB("./data/accounts.json")

app.set('view engine', 'ejs')
app.use(bp.json())
app.use(bp.urlencoded({ extended: true }))
app.use(cookieParser())

let sessions = {}

setInterval(() => {
    for (let x in sessions) {
        // console.log(sessions[x].expiringTime)
        if (sessions[x].expiringTime < Date.now()) {
            delete sessions[x]
        }
    }
}, 5 * 1000);

app.get("/", (req, res) => {
    let token = req.cookies["session_token"]
    if (!token || !sessions.hasOwnProperty(token)) {
        res.render("login")
    } else {
        res.render("home")
    }
})

app.get("*", (req, res) => {
    res.redirect("/")
})

app.post("/login", (req, res) => {
    let accs = accounts.get(req.body)
    if (accs.length === 1) {
        let session = {
            id: accs[0].id,
            expiringTime: Date.now() + 15 * 60 * 1000
        }
        let token = randomUUID()
        sessions[token] = session
        res.cookie("session_token", token,)
        res.redirect("/home")
    } else {
        res.redirect("/login")
    }
})

io.on("connection", (socket) => {
    log("Socket connect")
    socket.on("disconnect", () => {
        log("Socket disconnect")
    })

    socket.on("getAccount", (data, res) => {
        log("getAccount")
        if (sessions.hasOwnProperty(data)) {
            acc = accounts.get({
                id: sessions[data].id
            })[0]
            res({
                acc_name: acc.name,
                acc_bio: acc.bio
            })
        }
    })
})

function log(txt) {
    let date = new Date()
    let ts = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
    console.log(ts + " - " + txt)
}

server.listen(80)