

module.exports = {
    getRandomInt : getRandomInt,
    randRound : randRound,
    simpleRandom : simpleRandom,
    combineObjects : combineObjects,
    parseIntOrRange : parseIntOrRange,
    testIntOrRange : testIntOrRange,
    makeID : makeID,
}

// Randomness

function getRandomInt(min, max) {
    return min + Math.floor(Math.random() * (max-min+1));
}

function randRound(n) {
    var min = Math.floor(n);
    if (Math.random() < n - min) return Math.ceil(n);
    else return Math.floor(n);
}

function simpleRandom(n) {
    return Math.random() < n;
}

// Special Parsing

function parseIntOrRange(obj) {
    if (typeof(obj) == "number") return obj;
    return getRandomInt(obj.min, obj.max);
}

function testIntOrRange(obj, n) {
    if (typeof(obj) == "number") return obj == n;
    return obj.min <= n && obj.max >= n;
}

// Misc

// todo this is terrible and needs to be redone at some point
function makeID() {
    return getRandomInt(0,9999999999);
}

// obj1 takes precedence!
function combineObjects(obj1, obj2) {
    new_obj = {};

    for (p in obj2) {
        new_obj[p] = obj2[p];
    }

    for (p in obj1) {
        new_obj[p] = obj1[p];
    }

    return new_obj;
}