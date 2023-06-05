let wordFilter = ["nutte", "fuck"]
let string = "Hallo du Nutte, fuck you"

wordFilter.forEach(w => {
    let newWord = w.replace(/./g, "*")
    string = string.replace(new RegExp(w, "gi"), newWord)
});

console.log(string)