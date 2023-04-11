const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server)

const bp = require('body-parser')
const { randomUUID } = require('crypto')
const cookieParser = require('cookie-parser')

// import my own db class from libs
const DB = require("./libs/db")

const accounts = new DB("./data/accounts.json")

app.set('view engine', 'ejs')
app.use(bp.json())
app.use(bp.urlencoded({ extended: true }))
app.use(cookieParser())

// for every get, use files in client-folder
app.use(express.static("client"))

// empty list for sessions
let sessions = {}

// go through sessions an remove all outdated ones
setInterval(() => {
    for (let x in sessions) {
        if (sessions[x].expiringTime < Date.now()) {
            delete sessions[x]
        }
    }
}, 5 * 1000); // interval speed (5 sec)

app.get("/admin", (req, res) => {
    res.send(accounts.get({ id: "dan123" }))
})

app.get("/", (req, res) => {
    res.render("welcome")
})

app.get("/login", (req, res) => {
    let token = req.cookies["session_token"]
    if (!token || !sessions.hasOwnProperty(token)) {
        res.render("login")
    } else {
        res.redirect("/home")
    }
})

app.get("/home", (req, res) => {
    let token = req.cookies["session_token"]
    if (!token || !sessions.hasOwnProperty(token)) {
        res.redirect("/")
    } else {
        res.render("home")
    }
})

app.get("*", (req, res) => {
    res.redirect("/")
})

const newSessionDuration = 60 // in min
app.post("/login", (req, res) => {
    let accs = accounts.get(req.body)
    if (accs.length === 1) {
        let session = {
            id: accs[0].id,
            expiringTime: Date.now() + newSessionDuration * 60 * 1000
        }
        let token = randomUUID()
        sessions[token] = session
        res.cookie("session_token", token)
        res.redirect("/home")
    } else {
        res.redirect("/login")
    }
})

app.post("/logout", (req, res) => {
    delete sessions[req.cookies["session_token"]]
    res.redirect("/login")
})

io.on("connection", (socket) => {
    let currentProfile = null

    // account
    socket.on("getAccount", (data, res) => {
        if (sessions.hasOwnProperty(data.token)) {
            acc = accounts.get({
                id: sessions[data.token].id
            })[0]
            res({
                acc_name: acc.name,
                acc_bio: acc.bio
            })
        }
    })

    socket.on("editAccount", (data, res) => {
        if (sessions.hasOwnProperty(data.token)) {
            let id = sessions[data.token].id
            let index = accounts.index(accounts.get({ id: id })[0])
            accounts.db[index][data.param] = data.value
        }
    })

    // matches
    socket.on("getMatches", (data, res) => {
        if (sessions.hasOwnProperty(data.token)) {
            acc = accounts.get({
                id: sessions[data.token].id
            })[0]
            let matches = []
            acc.matches.forEach(m => {
                let match = accounts.get({ id: m })[0]
                matches.push({ id: match.id, name: match.name })
            });

            res({
                acc_matches: matches
            })
        }
    })

    // matches
    socket.on("getMessages", (data, res) => {
        if (sessions.hasOwnProperty(data.token)) {
            acc = accounts.get({
                id: sessions[data.token].id
            })[0]
            if (!acc.msgs.hasOwnProperty(data.id)) {
                acc.msgs[data.id] = []
            }
            let msgs = acc.msgs[data.id]
            let sender = {
                id: data.id,
                name: accounts.get({ id: data.id })[0].name
            }
            res({ msgs: msgs, sender: sender })
        }
    })

    socket.on("sendMessage", (data) => {
        console.log(data)
        if (sessions.hasOwnProperty(data.token)) {
            let msg = null
            switch (data.cnt.type) {
                case "text":
                    msg = {
                        type: "text",
                        id: sessions[data.token].id,
                        text: data.cnt.txt
                    }
                    break;

                case "test":
                    msg = {
                        type: "info",
                        text: "Test,..."
                    }
                    break;

                default:
                    break;
            }
            if (!msg) {
                //sender
                accounts.db[accounts.db.findIndex((a) => a.id == sessions[data.token].id)].msgs[data.cnt.to].push(msg)

                //partner
                if (accounts.db[accounts.db.findIndex((a) => a.id == data.cnt.to)].msgs[sessions[data.token].id] == null) {
                    accounts.db[accounts.db.findIndex((a) => a.id == data.cnt.to)].msgs[sessions[data.token].id] = []
                }
                accounts.db[accounts.db.findIndex((a) => a.id == data.cnt.to)].msgs[sessions[data.token].id].push(msg)
            }
        }
    })

    // card
    socket.on("getCard", (data) => {
        if (sessions.hasOwnProperty(data.token)) {
            acc = accounts.get({
                id: sessions[data.token].id
            })[0]

            let a = getCard(acc)
            currentProfile = a
            if (currentProfile == null) {
                socket.emit("newCard", null)
                return
            } else {
                let data = {
                    "name": currentProfile.name,
                    "bio": currentProfile.bio
                }
                socket.emit("newCard", data)
            }
        }
    })

    function getCard(acc) {
        if (acc == null) { return null }

        let filter = {
            "located": acc.dest,
            "dest": acc.located
        }

        let accs = accounts.get(filter)
        let profile = null
        accs.forEach(a => {
            if (
                !acc.liked.includes(a.id) && !acc.passed.includes(a.id)
            ) {
                profile = a
                return
            }
        });
        return profile
    }

    socket.on("voteCard", (data) => {
        if (currentProfile == null) { return null }


        if (sessions.hasOwnProperty(data.token)) {
            acc = accounts.get({
                id: sessions[data.token].id
            })[0]
            switch (data.action) {
                case "like":
                    accounts.db[accounts.db.findIndex((a) => a.id == acc.id)].liked.push(currentProfile.id)
                    if (accounts.db[accounts.index(currentProfile)].liked.includes(acc.id)) {
                        accounts.db[accounts.index(currentProfile)].matches.push(acc.id)
                        let i = accounts.db.findIndex((a) => a.id == acc.id)
                        accounts.db[i].matches.push(currentProfile.id)
                        socket.emit("updateMatches", accounts.db[i].matches)
                    }
                    currentProfile = null
                    break;

                case "pass":
                    accounts.db[accounts.db.findIndex((a) => a.id == acc.id)].passed.push(currentProfile.id)
                    currentProfile = null
                    break;

                default:
                    break;
            }
        }


    })
})

server.listen(80)