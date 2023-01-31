const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server)

const session = require('express-session')
const bp = require('body-parser')

const DB = require("./libs/db")

const accounts = new DB("./data/accounts.json")

app.set('view engine', 'ejs')
app.use(session({
    secret: 'top-secret',
    resave: false,
    saveUninitialized: false
}))
app.use(bp.json())
app.use(bp.urlencoded({ extended: true }))

app.get("/", (req, res) => {
    res.redirect("/login",)
})

app.get("/login", (req, res) => {
    res.render("login")
})

app.post("/login", (req, res) => {
    let accs = accounts.get(req.body)
    req.session.loggedin = false
    if (accs.length === 1) {
        {
            req.session.loggedin = true
            req.session.username = accs[0].name
            req.session.bio = accs[0].bio
            req.session.matches = accs[0].matches
        }
        res.redirect("/home")
    } else {
    }
})

app.all("/logout", (req, res) => {
    req.session = null
    res.redirect("/login")
})

app.get("/home", (req, res) => {
    if (req.session.loggedin) {
        res.render("home", { username: req.session.username, bio: req.session.bio, matches: req.session.matches })
    } else {
        res.redirect("/login")
    }
})

app.get('*', function (req, res) {
    res.redirect("/")
})

io.on("connection", (socket) => {
    log("Socket connect")
    socket.on("disconnect", () => {
        log("Socket disconnect")
    })
})

function log(txt) {
    let date = new Date()
    let ts = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
    console.log(ts + " - " + txt)
}

server.listen(80)