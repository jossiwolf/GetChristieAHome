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
var Uber = require('node-uber');
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

var uber = new Uber({
    client_id: 'YroEvS_bNpOPyz3W9SvqF3UcC9sBmLa3',
    client_secret: 'IZeYd38VexEvw_a6Mtivd2MfOvPh6goK-NxYLbBp',
    server_token: 'HY2MtwwMSd0a60X6EB4laJqVtLI1aS5sKYgZjdAP',
    redirect_uri: 'http://localhost:8080/uber/callback',
    name: 'GetChristieAHome',
    sandbox: true // optional, defaults to false
});

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

function findBestShelterAvailableBasedOnUserData(userdata, city, state, uberresponse) {
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


        //preparedistancesarray(requestUber(distances));
        preparedistancesarray(function(distances) {
            requestUber(distances, uberresponse)
        })


        //console.log(snapshot.val());
    }, state, city, userdata)

}

function returnbestshelter(data) {
    return data;
}

function requestUber(distances, uberresponse) {
    sortByKey(distances, 'exactdistance')
    console.log("Best shelter for given requirements: " + distances[0].agency_program_name + ". Distance: " + distances[0].exactdistance + "km");
    console.log("Ordering Uber...")
    /*uber.requests.create({
        "product_id": uberproduct,
        "start_latitude": 38.632499,
        "start_longitude": -90.227829,
        "end_latitude": parseInt(distances[0].latitude),
        "end_longitude": parseInt(distances[0].longitude)
    }, function(err, res) {
        if (err) {
            console.error(err);
            console.log(res.body)
        } else {
            //console.log(res);
            uberresponse.json(res)
            console.log("Ordered Uber!")
        }
    });*/
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

//findBestShelterAvailableBasedOnUserData(exampleuserdata, "stlouis", "mo");
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
app.get("/shelters/:state/:city.json", function(req, res) {
    getSurroundingShelters(function(snapshot) {
        res.json(snapshot.val());
    }, req.params.state, req.params.city)
});
app.get("/shelters/:state/:city.kml", function(req, res) {
    console.log(req.params.city)
    getSurroundingShelters(function(snapshot) {
        res.set('Content-Type', 'application/vnd.google-earth.kml+xml');
        res.send(coverter.genKML(snapshot.val()));
    }, req.params.state, req.params.city)
});

app.get('/requestuber/', function(req, uberresponse) {
    findBestShelterAvailableBasedOnUserData(exampleuserdata, "stlouis", "mo", uberresponse);


    /*databaseref = firebaseapp.database().ref("shelters/" + state + "/" + city);
    databaseref.on("value", function(snapshot) {
        //console.log(snapshot.val()[1].agency_address);
        uber.requests.create({
            "product_id": uberproduct,
            "start_latitude": 38.632499,
            "start_longitude": -90.227829,
            "end_latitude": parseInt(snapshot.val()[0].latitude),
            "end_longitude": parseInt(snapshot.val()[0].longitude)
        }, function(err, res) {
            if (err) {
              console.error(err);
              console.log(res.body)
            } else {
              //console.log(res);
              uberresponse.json(res)
            }
        });
    }, function(errorObject) {
        if (LogErrors) {
            console.log("getSnapshotFromDatabase error: " + errorObject.code);
        }
    });*/
});



//NEEDED FOR THE UBER API

app.get('/uber/callback', function(request, response) {
    uber.authorization({
        authorization_code: request.query.code
    }, function(err, access_token, refresh_token) {
        if (err) {
            console.error(err);
        } else {
            // store the user id and associated access token
            // redirect the user back to your actual app
            //response.redirect('/web/index.html');
            response.send(access_token)
        }
    });
});

app.get('/uber/login', function(req, res) {
    res.redirect(uber.getAuthorizeUrl(['request'], 'http://localhost:8080/uber/callback'));
    console.log(req.get('host') + '/uber/callback')
    //res.redirect(uber.getAuthorizeUrl(['request'], req.get('host') + '/uber/callback'));
});

app.get('/uber/products', function(request, response) {
    // extract the query from the request URL
    uber.products.getAllForLocation(38.632499, -90.227829, function(err, res) {
        if (err) console.error(err);
        else response.json(res)
    });
});

app.listen(8080);
console.log("App listening on port 8080");
