const { randomUUID } = require('crypto')

let list = []

let token = Math.floor(Math.random() * 100)
let i = 0

while (!list.includes(token)) {
    console.clear()
    i++
    console.log(i)
    list.push(token)
    token = Math.floor(Math.random() * 100)
}

console.log("END AT " + i)

