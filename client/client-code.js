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
            try {
                document.getElementById(x).innerText = res[x]
            } catch (e) { }
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
        try {
            document.getElementById("matches").innerHTML = html
        } catch (e) { }

    })
}

var currentMsgs = null
function getMessages(id) {
    // id -> chatPartner
    socket.emit("getMessages", { token: token, cnt: { id: id } }, (res) => {
        if (!currentMsgs || currentMsgs.length != res.msgs.length) {
            currentMsgs = res.msgs
            document.getElementById("chat_msgs").innerHTML = ""
            res.msgs.forEach(msg => {
                newMessage(msg, id)
            });
        }
        // if (currentMsgs.length != res.msgs.length) {

        //     // console.log(res.msgs.length - currentMsgs.length)
        //     // res.msgs.slice(-1).forEach(msg => {
        //     //     console.log(msg.text)
        //     //     newMessage(msg, id)
        //     // });
        //     currentMsgs = res.msgs
        //     document.getElementById("chat_msgs").innerHTML = ""
        //     res.msgs.forEach(msg => {
        //         newMessage(msg, id)
        //     });
        // }
    })
}

var currentMatch = null
function getMatch(id) {
    socket.emit("getMatch", { token: token, cnt: { id: id } }, (res) => {
        console.log("getMatch")
        document.getElementById("chat_title").innerHTML = res.name
        currentMatch = res
    })
}

socket.on("newCard", (data) => {
    // if so students are left
    if (data == null) {
        // hide all the card elements and show the sry message
        try {
            document.getElementById("swipe_name").style.display = "none"
            document.getElementById("swipe_bio").style.display = "none"
            document.getElementById("swipe_pass").style.display = "none"
            document.getElementById("swipe_like").style.display = "none"
            document.getElementById("swipe_null").style.display = "block"
        } catch (e) { }

    } else {
        // update the card elements
        try {
            document.getElementById("swipe_name").innerText = data.name
            document.getElementById("swipe_bio").innerText = data.bio
        } catch (e) { }

        // hide the sry message and show all the card elements
        try {
            document.getElementById("swipe_name").style.display = "block"
            document.getElementById("swipe_bio").style.display = "block"
            document.getElementById("swipe_pass").style.display = "block"
            document.getElementById("swipe_like").style.display = "block"
            document.getElementById("swipe_null").style.display = "none"
        } catch (e) { }
    }

    //like
    try {
        document.getElementById("swipe_like").onclick = () => {
            socket.emit("voteCard", { token: token, action: "like" })
            socket.emit("getCard", { token: token })
        }
    } catch (e) { }


    //pass
    try {
        document.getElementById("swipe_pass").onclick = () => {
            socket.emit("voteCard", { token: token, action: "pass" })
            socket.emit("getCard", { token: token })
        }
    } catch (e) { }

})

let currentChat = null
function openChat(id) {
    currentChat = id
    getMessages(currentChat)
    getMatch(currentChat)
    document.getElementById("chat_modal").style.display = "block"
}

function closeChat() {
    document.getElementById("chat_msgs").innerHTML = ""
    document.getElementById('chat_modal').style.display = "none"
    currentMatch = null
    currentChat = null
    currentMsgs = []
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

getAccount()
getMatches()

// update matches
setInterval(() => {
    getMatches()
}, 1000);

socket.emit("getCard", { token: token })