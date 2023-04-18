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

let chats = {}

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

app.get("/db", (req, res) => {
    res.send(accounts.db)
})

app.get("/chat", (req, res) => {
    res.send(chats)
})

app.get("/sessions", (req, res) => {
    res.send(sessions)
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
    if (
        accs.length === 1
    ) {
        let session = {
            id: accs[0].id,
            expiringTime: Date.now() + newSessionDuration * 60 * 1000,
            updateChat: false
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

    socket.on("disconnect", () => {
        console.log(currentProfile)
    })

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
            // acc.matches.forEach(m => {
            //     let match = accounts.get({ id: m })[0]
            //     matches.push({ id: match.id, name: match.name })
            // });

            for (m in acc.matches) {
                let match = accounts.get({ id: m })[0]
                matches.push({ id: match.id, name: match.name })
            }

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
            })[0] // get own account
            let uuid = acc.matches[data.cnt.id] // get the chat uuid
            // console.log(chats[uuid])

            // gen new chat if 
            if (!chats[uuid]) {
                // chats[uuid] = {
                //     users: [acc.id, data.cnt.id],
                //     msgs: {}
                // }
                chats[uuid] = {
                    users: [acc.id, data.cnt.id],
                    msgs: []
                }
            }

            res(
                { msgs: chats[uuid].msgs }
            )
        }
    })

    socket.on("sendMessage", (data) => {
        if (sessions.hasOwnProperty(data.token)) {
            acc = accounts.get({
                id: sessions[data.token].id
            })[0]
            let chat_uuid = acc.matches[data.cnt.to]
            let msg = null
            switch (data.cnt.type) {
                case "text":
                    msg = {
                        type: "text",
                        text: data.cnt.txt,
                        author: acc.id,
                        timestamp: Date.now(),
                        id: randomUUID()
                    }
                    console.log(msg)
                    break;

                default:
                    break;
            }
            if (msg) {
                chats[chat_uuid].msgs.push(msg)
                console.log()
                chats[chat_uuid].users.forEach(u => {

                });
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
                    accounts.db[accounts.db.findIndex((a) => a.id == acc.id)].liked.push(currentProfile.id) // push to own like-list

                    if (accounts.db[accounts.index(currentProfile)].liked.includes(acc.id)) { // if a match
                        let uuid = randomUUID()
                        accounts.db[accounts.index(currentProfile)].matches[acc.id] = uuid

                        let i = accounts.db.findIndex((a) => a.id == acc.id) // index of acc
                        accounts.db[i].matches[currentProfile.id] = uuid

                        chats[uuid] = {
                            users: [acc.id, currentProfile.id],
                            msgs: []
                        }

                        socket.emit("updateMatches", accounts.db[i].matches) // send update to client
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