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

app.get("/debug", (req, res) => {
    res.send(accounts.db)
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

app.post("/logout", (req, res) => {
    delete sessions[req.cookies["session_token"]]
    res.redirect("/home")
})

io.on("connection", (socket) => {
    let currentProfile = null

    socket.on("disconnect", () => {
    })

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

    socket.on("getMatches", (data, res) => {
        if (sessions.hasOwnProperty(data.token)) {
            acc = accounts.get({
                id: sessions[data.token].id
            })[0]
            res({
                acc_matches: acc.matches
            })
        }
    })

    socket.on("getCard", (data) => {
        if (sessions.hasOwnProperty(data.token)) {
            acc = accounts.get({
                id: sessions[data.token].id
            })[0]

            let a = getCard(acc)
            currentProfile = a
            if (currentProfile == null) {
                socket.emit("newProfile", null)
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

        filter = {
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

function log(txt) {
    let date = new Date()
    let ts = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
    console.log(ts + " - " + txt)
}

server.listen(80)