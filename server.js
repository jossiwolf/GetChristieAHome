// set up ========================
var express = require('express');
var app = express(); // create our app w/ express
var bodyParser = require('body-parser'); // pull information from HTML POST (express4)
var morgan = require('morgan');
var fs = require('fs');
var async = require('async');
var request = require('request');
var firebase = require('firebase');
var lodash = require('lodash');
var sql = require('mssql');
var GoogleMapsAPI = require('googlemaps');
var jsonfile = require('jsonfile');
var url = require('url');
const coverter = require('./kmlConverter.js');

app.use(morgan('dev')); // log every request to the console
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
}
app.use(allowCrossDomain);

Array.min = function(array) {
    return Math.min.apply(Math, array);
};

var firebaseapp = firebase.initializeApp({
    apiKey: ' AIzaSyAlfkqy1BWgPqMaeWVG3khQDpjiSbDhhbs',
    authDomain: 'https://get-christie-a-home.firebaseapp.com',
    databaseURL: 'https://get-christie-a-home.firebaseio.com'
});

var mapsApiKey = "AIzaSyCXP7pko_Rd7IjbxKLaktC2RMNaaiD6hB0";

var publicConfig = {
    key: 'AIzaSyDp2QEwlmqXGgBcFvF2Z_C05yo16FToAA8',
    secure: true // use https
};
var gmAPI = new GoogleMapsAPI(publicConfig);

var uberproduct = "98ecfda2-a228-4f1f-8d1e-2f85b8fa466d";

var getDistanceToPoint = function(callback, start, end, i) {
    var params = {
        origins: start,
        destinations: end,
        mode: 'driving',
        departure_time: new Date(),
        units: 'metric',
        language: 'en-GB'
    };
    gmAPI.distance(params, function(err, result) {
        //console.log(result.rows[0].elements[0]);
        distance = result.rows[0].elements[0].distance.value;
        callback(distance, i);
    });
}

function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key];
        var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

var getSurroundingShelters = function(callback, state, city) {
    firebaseapp.database().ref("shelters/" + state + "/" + city).on("value", function(snapshot) {
        callback(snapshot);
    }, function(errorObject) {
        if (LogErrors) {
            console.log("getSnapshotFromDatabase error: " + errorObject.code);
        }
    });
}

var getSurroundingSheltersForUser = function(callback, state, city, userdata) {
    databaseref = firebaseapp.database().ref("shelters/" + state + "/" + city);
    databaseref.on("value", function(snapshot) {
        //console.log(snapshot.val()[1].agency_address);
        callback(snapshot);
    }, function(errorObject) {
        if (LogErrors) {
            console.log("getSnapshotFromDatabase error: " + errorObject.code);
        }
    });
}

function getDistanceToShelter(start, end) {
    getDistanceToPoint(function(distance) {
        console.log(distance);
    }, start, end);
}

function findBestShelterAvailableBasedOnUserData(userdata, city, state, uberresponse, phonenumber, firstName, location) {
    getSurroundingSheltersForUser(function(snapshot) {

        shelters = meetsrequierements(snapshot, userdata);
        console.log("")
        console.log("Conditions met by following shelters:")
        var preparedistancesarray = function(newcallback) {
            var distances = [];
            var completedcallbacks = 0
            if (shelters.length < 1) {
                //if there are no shelter available that meet the persons requirements
                /*console.log("Shelterslength<1")
                var objkeys = Object.keys(userdata);
                var newuserdata = {};

                stuff()
                if(shelters.length<1) {
                  stuff();
                }

                function stuff() {
                  for (var l = 0; l <= objkeys.length - 1; l++) {
                      newuserdata[objkeys[l]] = userdata[l]
                  }
                  console.log(JSON.stringify(newuserdata))
                  shelters = meetsrequierements(snapshot, newuserdata);
                  console.log(JSON.stringify(shelters))
                }*/

                /*keys = Object.keys(userdata);

                function doStuff(i) {
                    console.log("Userdata before:" + JSON.stringify(userdata))
                    delete userdata[keys[i]];
                    console.log("Userdata after:" + JSON.stringify(userdata))
                }
                var p = 0;
                doStuff(p);
                p++
                shelters = meetsrequierements(snapshot, userdata);
                console.log(JSON.stringify(shelters))
                if (shelters.length < 1) {
                    doStuff(p)
                    p++
                }
                console.log(JSON.stringify(shelters))*/
                shelters = meetsrequierements(snapshot, {});
            }
            for (var g = 0; g < shelters.length; g++) {
                console.log("g before callback: " + g)
                console.log("shelters.length" + shelters.length)
                getDistanceToPoint(function(distance, g) {
                    completedcallbacks += 1;
                    console.log("completedcallbacks: " + completedcallbacks)
                    console.log("distance: " + distance);
                    var newshelter = shelters[g];
                    newshelter["exactdistance"] = distance;
                    distances.push(newshelter);
                    if (completedcallbacks == shelters.length) {
                        newcallback(distances);
                    }
                }, location, shelters[g].agency_address, g);
            }
        }
        preparedistancesarray(function(distances) {
            requestUber(distances, uberresponse, phonenumber, firstName, state, city)
        })
    }, state, city, userdata)

}

function insertToFirebase(objecttobepushed, databaseRef) {
    var newPostRef = databaseRef.push();
    newPostRef.set(objecttobepushed);
}

function requestUber(distances, uberresponse, phonenumber, firstName, city, state) {
    sortByKey(distances, 'exactdistance')
    console.log("Best shelter for given requirements: " + distances[0].agency_program_name + ". Distance: " + distances[0].exactdistance + "m");

    var accountSid = 'AC0472f48b5bc8d5a9729a5e1e567bccc7';
    var authToken = '36fb064a34107f3705e8415005bee098';
    //require the Twilio module and create a REST client
    var tclient = require('twilio')(accountSid, authToken);
    console.log("Tclient: " + phonenumber)
    tclient.messages.create({
        to: "+" + phonenumber, //"+13142240815",
        from: "+16367357057",
        body: "Hey " + firstName + "! Your ShelterRide is on the way! We will bring you to " + distances[0].agency_program_name + ".",
    }, function(err, message) {
        //console.log(message.sid);
        if (err) console.log(err)
        if (!err) {
            /*firebaseapp.auth().signInWithEmailAndPassword("jossiwolf@gmx.net", "globalhack").then(function() {
                insertToFirebase({
                    occupancy
                }, firebaseapp.database().ref("shelters/" + state + "/" + city))
            });*/
            firebaseapp.database().ref("shelters/" + state + "/" + city).orderBy("agency_program_name").equalTo(distances[0].agency_program_name).update({
              "occupancy" : 99
            });
            //firebaseapp.database().ref("newclients/" + req.query.From.replace("+1", "")).on("value", function(snapshot, err) {
        }
    });
}

function meetsrequierements(snapshot, userdata) {
    //Keys => the requirements
    objkeys = Object.keys(userdata);
    shelters = []
    for (j = 0; j < snapshot.val().length; j++) {
        var counter = 0;
        var shelter = snapshot.val()[j];
        dbsearch = {};
        for (var k = 0; k < objkeys.length; k++) {
            if (typeof userdata[objkeys[k]] === 'object') {
                switch (userdata[objkeys[k]].type) {
                    case 'biggerThan':
                        if (shelter[objkeys[k]] < userdata[objkeys[k]].value && shelter["occupancy"] - shelter["capacity"] >= 1) counter++;
                    case 'biggerEqualThan':
                        if (shelter[objkeys[k]] <= userdata[objkeys[k]].value && shelter["occupancy"] - shelter["capacity"] >= 1) counter++;
                    case 'smallerThan':
                        if (shelter[objkeys[k]] > userdata[objkeys[k]].value && shelter["occupancy"] - shelter["capacity"] >= 1) counter++;
                    case 'smallerEqualThan':
                        if (shelter[objkeys[k]] >= userdata[objkeys[k]].value && shelter["occupancy"] - shelter["capacity"] >= 1) counter++;
                }
            } else if (typeof userdata[objkeys[k]] === 'string' | typeof userdata[objkeys[k]] === 'number') {
                if (shelter[objkeys[k]] == userdata[objkeys[k]] && shelter["occupancy"] - shelter["capacity"] >= 1) counter++;
            }
        }
        if (counter == objkeys.length) {
            shelters.push(shelter);
        }
    }
    return shelters;
}

function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

app.get("/shelters/:state/:city.json", function(req, res) {
    getSurroundingShelters(function(snapshot) {
        res.json(snapshot.val());
    }, req.params.state, req.params.city)
});
app.get("/shelters/:state/:city.kml", function(req, res) {
    console.log(req.params.city)
    getSurroundingShelters(function(snapshot) {
        res.set('Content-Type', 'text/xml')
        res.send(coverter.genKML(snapshot.val()));
    }, req.params.state, req.params.city)
});

app.get('/requestride', function(req, uberresponse) {

    console.log("Query data: " + req.query.From.replace("+1", ""));

    var exampleuserdata = {
        require_id: "no",
        gender: 0,
        other_elig_requirement: "none",
        capacity: {
            value: 0,
            type: "biggerThan"
        }
    }

    var userdata = {}

    if (req.query.Body.toLowerCase() == "pickmeup" | req.query.Body.toLowerCase() == "pick me up") {
        firebaseapp.database().ref("newclients/" + req.query.From.replace("+1", "")).on("value", function(snapshot, err) {
            if (snapshot.val() == null) {
                var accountSid = 'AC0472f48b5bc8d5a9729a5e1e567bccc7';
                var authToken = '36fb064a34107f3705e8415005bee098';

                //require the Twilio module and create a REST client
                var tclient = require('twilio')(accountSid, authToken);

                tclient.messages.create({
                    //to: "+13142240815",
                    to: req.query.From,
                    from: "+16367357057 ",
                    body: "We couldn't find you in our databse. Please contact your social worker.",
                }, function(err, message) {
                    if (!err) {
                        console.log(message.sid);
                    }
                });
                return;
            } else {
                var keys = Object.keys(snapshot.val().requirements);
                console.log(JSON.stringify(keys));
                for (var i = 0; i <= keys.length; i++) {
                    userdata[keys[i]] = snapshot.val().requirements[keys[i]];
                }
                if (snapshot.val().gender.toUpperCase() == "F") {
                    /*userdata["capacity_women"] = {
                        value: 0,
                        type: "biggerThan"
                    }*/
                    findBestShelterAvailableBasedOnUserData(userdata, "stlouis", "mo", uberresponse, req.query.From.replace("+", ""), snapshot.val().firstName, snapshot.val().location);
                } else if (snapshot.val().gender.toUpperCase() == "M") {
                    /*userdata["capacity_men"] = {
                        value: 0,
                        type: "biggerThan"
                    }*/
                    findBestShelterAvailableBasedOnUserData(userdata, "stlouis", "mo", uberresponse, req.query.From.replace("+", ""), snapshot.val().firstName, snapshot.val().location);
                }
            }
        }, function(errorObject) {
            if (LogErrors) {
                console.log("getSnapshotFromDatabase error: " + errorObject.code);
            }
        });
    } else {
        var accountSid = 'AC0472f48b5bc8d5a9729a5e1e567bccc7';
        var authToken = '36fb064a34107f3705e8415005bee098';

        //require the Twilio module and create a REST client
        var tclient = require('twilio')(accountSid, authToken);

        tclient.messages.create({
            //to: "+13142240815",
            to: req.query.From,
            from: "+16367357057 ",
            body: "Command not recognized. To get picked up, send the message 'pickmeup' (without quotes).",
        }, function(err, message) {
            if (!err) {
                console.log(message.sid);
            }
        });
        return;
    }

});
app.listen(process.env.PORT)
console.log("App listening on port " + process.env.PORT);
