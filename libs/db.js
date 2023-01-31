const fs = require("fs")

class DB {
    db = null
    path = null

    constructor(path) {
        this.path = path
        this.load()
    }

    load() {
        let raw_db = fs.readFileSync(this.path)
        this.db = JSON.parse(raw_db)
    }

    write() {
        fs.writeFileSync(this.path, JSON.stringify(this.db), () => { })
    }

    get(filter) {
        let ret = []
        let filter_keys = Object.keys(filter)
        let filter_values = Object.values(filter)
        this.db.forEach(e => {
            let push = true
            let e_keys = Object.keys(e)
            let e_values = Object.values(e)
            for (let n = 0; n < filter_keys.length; n++) {
                if (filter_values[n] != e_values[e_keys.indexOf(filter_keys[n])]) {
                    push = false
                }
            }
            if (push) {
                ret.push(e)
            }
        })
        return ret
    }

    index(e) {
        let i = this.db.findIndex((db_e) => e == db_e)
        return i
    }
}

module.exports = DB