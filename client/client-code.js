var socket = io()
let token = document.cookie.split("; ").find((row) => row.startsWith("session_token="))?.split("=")[1]

var chat_modal = document.getElementById("chat_modal")
window.onclick = function (event) {
    if (event.target == chat_modal) {
        chat_modal.style.display = "none"
    }
}

let acc = {}
function getAccount() {
    socket.emit("getAccount", { token: token }, (res) => {
        acc = res
        for (let x in res) {
            document.getElementById(x).innerText = res[x]
        }
    })
}

function getMatches() {
    socket.emit("getMatches", { token: token }, (res) => {
        let html = ""
        if (res.acc_matches.length == 0) {

        } else {
            res.acc_matches.forEach(e => {
                html = html.concat('<div class="w3-padding"><button class="w3-button w3-block w3-theme-l2 w3-hover-theme" onclick="openChat(\'' + e.id + '\')"><span class="w3-left">' + e.name + '</span></button></div>')
            })
        }
        document.getElementById("matches").innerHTML = html
    })
}

function getMessages(id) {
    socket.emit("getMessages", { token: token, id: id }, (res) => {
        document.getElementById("chat_title").innerHTML = res.sender.name
        document.getElementById("chat_msgs").innerHTML = ""
        res.msgs.forEach(msg => {
            newMessage(msg, res.sender)
            // console.log(msg)
        });
    })
}

function newCard() {
    socket.on("newCard", (data) => {
        if (data == null) {
            alert("There are no more persons")
            res(null)
        } else {
            document.getElementById("swipe_name").innerText = data.name
            document.getElementById("swipe_bio").innerText = data.bio
        }

        document.getElementById("swipe_pass").onclick = () => {
            socket.emit("voteCard", { token: token, action: "pass" })
            socket.emit("getCard", { token: token })
        }

        document.getElementById("swipe_like").onclick = () => {
            socket.emit("voteCard", { token: token, action: "like" })
            socket.emit("getCard", { token: token })
        }
    })
}

let currentChat = null
function openChat(id) {
    currentChat = id
    getMessages(currentChat)
    document.getElementById("chat_modal").style.display = "block"
}

function closeChat() {
    document.getElementById("chat_msgs").innerHTML = ""
    document.getElementById('chat_modal').style.display = "none"
    currentChat = null
}

let currentEdit = null
function openEdit(p) {
    currentEdit = p
    document.getElementById("edit_title").innerHTML = p.charAt(0).toUpperCase() + p.slice(1)
    document.getElementById("edit_txt").innerHTML = acc.acc_bio
    document.getElementById("edit_modal").style.display = "block"
}

function closeEdit() {
    socket.emit("editAccount", {
        token: token,
        param: currentEdit,
        value: document.getElementById("edit_txt").value
    })
    getAccount()
    document.getElementById('edit_modal').style.display = "none"
    acc.acc_bio = document.getElementById("edit_txt").innerHTML
    currentEdit = null
}

function newMessage(msg, sender) {
    let newMsg = document.createElement("div")
    newMsg.classList = "w3-container"

    console.log(msg.id)

    switch (msg.type) {
        case "text":
            if (msg.id == sender.id) {
                newMsg.innerHTML = '<p class="w3-padding w3-theme-l3" style="width:fit-content; border-radius: 20px 20px 20px 00px;">' + msg.text + '</p>'
            } else {
                // if msg is from you
                newMsg.innerHTML = '<p class="w3-padding w3-theme-l2 w3-right" style="width:fit-content; border-radius: 20px 20px 00px 20px;">' + msg.text + '</p>'
            }
            break;
        case "":

            break;

        default:
            break;
    }
    document.getElementById("chat_msgs").appendChild(newMsg)
}

function sendMessage(msg) {
    socket.emit("sendMessage", { token: token, id: currentChat, txt: msg })
}

getAccount()
getMatches()
newCard()

// update matches
setInterval(() => {
    getMatches()
}, 1000);

// update messages
setInterval(() => {
    if (currentChat != null) {
        getMessages(currentChat)
    }
}, 900);

socket.emit("getCard", { token: token })