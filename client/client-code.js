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
            html = html.concat('<div class="w3-padding"><span class="w3-left">Sorry, but it looks like you don\'t have any matches at the moment</span></div>')
        } else {
            res.acc_matches.forEach(e => {
                html = html.concat('<div class="w3-padding"><button class="w3-button w3-block w3-theme-l2 w3-hover-theme" onclick="openChat(\'' + e.id + '\')"><span class="w3-left">' + e.name + '</span></button></div>')
            })
        }
        document.getElementById("matches").innerHTML = html
    })
}

function getMessages(id) {
    // id -> chatPartner
    socket.emit("getMessages", { token: token, id: id }, (res) => {
        console.log(res)
        document.getElementById("chat_title").innerHTML = res.sender.name
        document.getElementById("chat_msgs").innerHTML = ""
        res.msgs.forEach(msg => {
            newMessage(msg, res.sender)
            // console.log(msg)
        });
    })
}

socket.on("newCard", (data) => {
    // if so students are left
    if (data == null) {
        // hide all the card elements and show the sry message
        document.getElementById("swipe_name").style.display = "none"
        document.getElementById("swipe_bio").style.display = "none"
        document.getElementById("swipe_pass").style.display = "none"
        document.getElementById("swipe_like").style.display = "none"
        document.getElementById("swipe_null").style.display = "block"
    } else {
        // update the card elements
        document.getElementById("swipe_name").innerText = data.name
        document.getElementById("swipe_bio").innerText = data.bio

        // hide the sry message and show all the card elements
        document.getElementById("swipe_name").style.display = "block"
        document.getElementById("swipe_bio").style.display = "block"
        document.getElementById("swipe_pass").style.display = "block"
        document.getElementById("swipe_like").style.display = "block"
        document.getElementById("swipe_null").style.display = "none"
    }

    //like
    document.getElementById("swipe_like").onclick = () => {
        socket.emit("voteCard", { token: token, action: "like" })
        socket.emit("getCard", { token: token })
    }

    //pass
    document.getElementById("swipe_pass").onclick = () => {
        socket.emit("voteCard", { token: token, action: "pass" })
        socket.emit("getCard", { token: token })
    }
})

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
    switch (currentEdit) {
        case "bio":
            document.getElementById("edit_title").innerHTML = p.charAt(0).toUpperCase() + p.slice(1)
            document.getElementById("edit_txt").value = acc.acc_bio
            document.getElementById("edit_modal").style.display = "block"
            break;

        default:
            break;
    }
}

function closeEdit() {
    switch (currentEdit) {
        case "bio":
            acc.acc_bio = document.getElementById("edit_txt").value
            socket.emit("editAccount", {
                token: token,
                param: currentEdit,
                value: document.getElementById("edit_txt").value
            })
            getAccount()
            document.getElementById('edit_modal').style.display = "none"
            break;

        default:
            break;
    }
    currentEdit = null
}


function newMessage(msg, sender) {
    let newMsg = document.createElement("div")
    newMsg.classList = "w3-container"

    switch (msg.type) {
        case "text":
            console.log("new text")
            if (msg.id == sender.id) {
                newMsg.innerHTML = '<p class="w3-padding w3-theme-l3" style="width:fit-content; border-radius: 20px 20px 20px 00px;" onClick="alert(this.id)" id="' + msg.id + '">' + msg.text + '</p>'
            } else {
                // if msg is from you
                newMsg.innerHTML = '<p class="w3-padding w3-theme-l2 w3-right" style="width:fit-content; border-radius: 20px 20px 00px 20px;" onClick="alert(this.id)" id="' + msg.id + '">' + msg.text + '</p>'
            }
            break;
        case "test":
            console.log("new test")
            newMsg.innerHTML = '<div class="w3-container"><p class="w3-block w3-padding w3-theme-l2 w3-center" style="border-radius: 20px 20px 00px 00px;" onClick="alert(this.id)" id="' + msg.id + '">' + msg.text + '</p></div>'
            break;

        default:
            break;
    }
    document.getElementById("chat_msgs").appendChild(newMsg)
}

function sendMessage(cnt) {
    socket.emit("sendMessage", {
        token: token,
        cnt: cnt
    })
}

getAccount()
getMatches()

// update matches
setInterval(() => {
    getMatches()
}, 1000);

// update messages
setInterval(() => {
    if (currentChat != null) {
        getMessages(currentChat)
        // document.getElementById("chat_msgs").scrollTop = document.getElementById("chat_msgs").scrollHeight
    }
}, 50);

socket.emit("getCard", { token: token })