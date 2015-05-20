import {chan, go, put, take, putAsync, alts} from "js-csp"
import {map, compose} from "transducers.js"
import "babel/polyfill"



///////////////
/// Helpers
/// ///////////

// fake http request simulator
function doRequest(cb) {
    console.log("REQUEST")
    setTimeout(function() {
        console.log("RESPONSE")
        cb(null, "some data")
    }, 2000)
}

var $result = document.querySelector("#result")

// fake result process, displays data on page
function doDisplayData(data) {
    $result.innerHTML = data;
}



//////////////////////////////////////////////////////////////
// Use case
// Prevent multiple clicks to trigger concurrent HTTP requests
//////////////////////////////////////////////////////////////

// With classical javascript

/* Uncomment this line to disable this implementation

// GLOBAL STATE
var isRequestPending = false

document.querySelector("#button").addEventListener("click", function(e) {
    // STATE/COORDINIATION
    if (!isRequestPending) {


        // STATE/COORDINIATION
        isRequestPending = true

        // COUPLE EVENT AND REQUEST
        doRequest(function(err, data) {
            if (err) {
                console.error("error", err)
                return
            }

            // COUPLE REQUEST AND RESULT PROCESSING
            // AND DEEP IN CALLBACK HELL
            doDisplayData(data)

            // STATE/COORDINATION
            isRequestPending = false
        })
    }
    // Too much things happening in this handler :
    // event handling, logic, display
    // Coordination is implicit, must read all code to understand it
})
// */



// With CSP

// /* Uncomment this line to disable this implementation

// Helpers that wrap callback-expecting functions to use channels

function listenTo(selector, event) {
    var channel = chan()
    document.querySelector(selector).addEventListener(event, function(e) {
        putAsync(channel, e)
    })
    return channel
}

function wrappedDoRequest() {
    var channel = chan()
    doRequest(function() {
        putAsync(channel, "some data")
    })
    return channel
}

// Let's go (pun intended) !

go(function* () {
    var clickChannel = listenTo("#button", "click")

    while (true) {
        // Wait until click happens
        yield take(clickChannel)

        // Then issue request
        var reqChannel = wrappedDoRequest()

        // Choose request over click, and loop while click happened first
        // This way, we drop clicks until request completed
        var result = yield alts([clickChannel, reqChannel])

        while (result.channel === clickChannel) {
            result = yield alts([clickChannel, reqChannel])
        }

        doDisplayData(result.value)
    }
})
