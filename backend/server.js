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
        var file = 'data.json'
        jsonfile.writeFile(file, result, function(err) {
                err != "" ? false : console.error(err);
            })
            //return secondsToMinutes(result.rows[0].elements[0].duration_in_traffic.value);
    });
}

var getSurroundingShelters = function(callback, state, city) {
    firebaseapp.database().ref("shelters/" + state + "/" + city).on("value", function(snapshot) {
        //console.log(snapshot.val()[1].agency_address);
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

function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key];
        var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

function findBestShelterAvailableBasedOnUserData(userdata, city, state) {
    getSurroundingSheltersForUser(function(snapshot) {

        jsonfile.writeFile('data.json', snapshot.val(), function(err) {
            err != "" ? false : console.error(err);
        })

        shelters = meetsrequierements(snapshot, userdata);
        console.log("")
        console.log("Conditions met by following shelters:")
        var morestuff = function(acallback) {

        }
        var preparedistancesarray = function(newcallback) {
            var distances = [];
            var completedcallbacks = 0
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
                }, "38.632499, -90.227829", shelters[g].agency_address, g);
            }
        }

        preparedistancesarray(function(distances) {
            sortByKey(distances, 'exactdistance')
            console.log("HELLO")
            console.log(distances)
            console.log("Best shelter for given requirements: " + distances[0].agency_program_name) + ". Distance: " + distances[0].exactdistance + "km";
        })


        //console.log(snapshot.val());
    }, state, city, userdata)

}

function returnbestshelter(data) {
    return data;
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
                        if (shelter[objkeys[k]] < userdata[objkeys[k]].value) counter++;
                    case 'biggerEqualThan':
                        if (shelter[objkeys[k]] <= userdata[objkeys[k]].value) counter++;
                    case 'smallerThan':
                        if (shelter[objkeys[k]] > userdata[objkeys[k]].value) counter++;
                    case 'smallerEqualThan':
                        if (shelter[objkeys[k]] >= userdata[objkeys[k]].value) counter++;
                }
            } else if (typeof userdata[objkeys[k]] === 'string' | typeof userdata[objkeys[k]] === 'number') {
                if (shelter[objkeys[k]] == userdata[objkeys[k]]) counter++;
            }
        }
        if (counter == objkeys.length) {
            shelters.push(shelter);
        }
    }
    return shelters;
}

var exampleuserdata = {
    require_id: "no",
    gender: 0,
    other_elig_requirement: "none",
    capacity: {
        value: 0,
        type: "biggerThan"
    }
}

findBestShelterAvailableBasedOnUserData(exampleuserdata, "stlouis", "mo");
//console.log("Best shelter for given requirements: " + findBestShelterAvailableBasedOnUserData(exampleuserdata, "stlouis", "mo").agency_program_name);



var LogErrors = false;
var ref = firebaseapp.database().ref("shelters");
ref.on("value", function(snapshot) {
    //console.log(snapshot.val()[1].agency_address);
    for (var i = 0; i < snapshot.val().length; i++) {
        console.log(snapshot.val()[i].agency_program_name + ":" + snapshot.val()[i].agency_address);
    }
}, function(errorObject) {
    if (LogErrors) {
        console.log("getSnapshotFromDatabase error: " + errorObject.code);
    }
});
app.get("/shelters/:state/:city", function(req, res) {
    getSurroundingShelters(function(snapshot) {
        /*console.log("Callback: " + snapshot.val()[1].agency_address)
        console.log("Callback: " + JSON.stringify(snapshot.val()));*/
        res.json(snapshot.val());
    }, req.params.state, req.params.city)
});
app.get("/shelters_kml/:state/:city", function(req, res) {
  getSurroundingShelters(function(snapshot) {
    /*console.log("Callback: " + snapshot.val()[1].agency_address)
    console.log("Callback: " + JSON.stringify(snapshot.val()));*/
    res.json(coverter.genKML(snapshot.val()));
  }, req.params.state, req.params.city)
});

app.post('/requestuber/:clientuuid', function(req, res) {
    console.log(req.body);
    console.log(req.params.clientuuid);
    res.json({
        "test": req.params.clientuuid
    });
});

app.listen(8080);
console.log("App listening on port 8080");
