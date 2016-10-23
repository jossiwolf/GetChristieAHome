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
var wait = require('wait.for');

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
    redirect_uri: 'https://getchristieahome.herokuapp.com/uber/callback',
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

function findBestShelterAvailableBasedOnUserData(userdata, city, state, uberresponse, phonenumber, firstName) {
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
            if (shelters.length < 1) {
                shelters = meetsrequierements(snapshot, {
                    capacity: {
                        value: 0,
                        type: "biggerThan"
                    }
                })
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
                }, "38.632499, -90.227829", shelters[g].agency_address, g);
            }
        }


        //preparedistancesarray(requestUber(distances));
        preparedistancesarray(function(distances) {
            requestUber(distances, uberresponse, phonenumber, firstName)
        })


        //console.log(snapshot.val());
    }, state, city, userdata)

}

function returnbestshelter(data) {
    return data;
}

function requestUber(distances, uberresponse, phonenumber, firstName) {
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
        body: "Hey " + firstName + "! Your ShelterRide is on the way! ",
    }, function(err, message) {
        //console.log(message.sid);
        if (err) console.log(err)
        uberresponse.json(message);
    });

    /*console.log("Ordering Uber...")
        //uberresponse.send("Hallo")
    console.log(distances[0].latitude)
    console.log(parseFloat(distances[0].latitude))
    var end_lat = parseFloat(distances[0].latitude);
    var end_long = parseFloat(distances[0].longitude);
    uber.requests.create({
        "product_id": uberproduct,
        "start_latitude": 38.632499,
        "start_longitude": -90.227829,
        "end_latitude": end_lat,
        "end_longitude": end_long
    }, function(err, res) {
        if (err) {
            console.error(err);
            console.log(res.body)
        } else {
            //console.log(res);

            /*uber.requests.getCurrent(function(err, ucurrentres) {
                if (!err) {
                    console.log("current uber data: " + JSON.stringify(ucurrentres))
                    var accountSid = 'AC0472f48b5bc8d5a9729a5e1e567bccc7';
                    var authToken = '36fb064a34107f3705e8415005bee098';
                    //require the Twilio module and create a REST client
                    var tclient = require('twilio')(accountSid, authToken);
                    console.log("Tclient: " + phonenumber)
                    tclient.messages.create({
                        to: "+" + phonenumber, //"+13142240815",
                        from: "+16367357057",
                        body: "Your ShelterRide will arrive in about " + ucurrentres.pickup.eta + "mins",
                    }, function(err, message) {
                        //console.log(message.sid);
                        if(err) console.log(err)
                        uberresponse.json(message);
                    });
                }
            });

    //uberresponse.json(res)
    console.log("Ordered Uber!")
}
}); */
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
        res.set('Content-Type', 'text/xml')
        res.send(coverter.genKML(snapshot.val()));
    }, req.params.state, req.params.city)
});

app.get('/sms/send', function(req, res) {
    // Twilio Credentials
    var accountSid = 'AC0472f48b5bc8d5a9729a5e1e567bccc7';
    var authToken = '36fb064a34107f3705e8415005bee098';

    //require the Twilio module and create a REST client
    var tclient = require('twilio')(accountSid, authToken);

    tclient.messages.create({
        //to: "+13142240815",
        to: "+13142240815",
        from: "+16367357057 ",
        body: "Hey " +  + "your ShelterRide is on the way",
    }, function(err, message) {
        console.log(message.sid);
        if (!err) {
            res.json(message);
        }
    });

})

GLOBAL.phonenumber = 0;

function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

app.get('/requestride/login/:phonenumber', function(req, res) {
    GLOBAL.phonenumber = req.params.phonenumber;
    //res.redirect(uber.getAuthorizeUrl(['request'], 'https://getchristieahome.herokuapp.com/uber/callback'));
    res.send("<iframe src=" + uber.getAuthorizeUrl(['request'], 'https://getchristieahome.herokuapp.com/uber/callback') + "></iframe>");
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

    var userdata = {
        capacity: {
            value: 0,
            type: "biggerThan"
        }
    }


    firebaseapp.database().ref("newclients/" + req.query.From.replace("+1", "")).on("value", function(snapshot, err) {
      if(err) {
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
            console.log(message.sid);
            if (!err) {
                res.json(message);
            }
        });
        return;
      }
        if (snapshot.val().gender.toUpperCase() == "F") {
            userdata["capacity_women"] = {
                value: 0,
                type: "biggerThan"
            }
            findBestShelterAvailableBasedOnUserData(userdata, "stlouis", "mo", uberresponse, req.query.From.replace("+", ""), snapshot.val().firstName);
        } else if (snapshot.val().gender.toUpperCase() == "M") {
            userdata["capacity_men"] = {
                value: 0,
                type: "biggerThan"
            }
            findBestShelterAvailableBasedOnUserData(userdata, "stlouis", "mo", uberresponse, req.query.From.replace("+", ""), snapshot.val().firstName);
        }
    }, function(errorObject) {
        if (LogErrors) {
            console.log("getSnapshotFromDatabase error: " + errorObject.code);
        }
    });


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
            //response.send(access_token)
            response.redirect('/requestuber/' + GLOBAL.phonenumber)
        }
    });
});

app.get('/uber/login', function(req, res) {
    res.redirect(uber.getAuthorizeUrl(['request'], 'https://getchristieahome.herokuapp.com/uber/callback'));
    console.log(req.get('host') + '/uber/callback')
    console.log("Auth url for uber: " + uber.getAuthorizeUrl(['request'], 'https://getchristieahome.herokuapp.com/uber/callback'));
    //res.redirect(uber.getAuthorizeUrl(['request'], req.get('host') + '/uber/callback'));
});

app.get('/uber/fakelogin', function(req, res) {
    //var url = uber.getAuthorizeUrl(['request'], 'https://getchristieahome.herokuapp.com/uber/callback');
    res.send("<!DOCTYPE html> <html> <head> <title>Test</title> <meta http-equiv='Content-Type' content='text/html; charset=utf-8' /> <script type='text/javascript' charset='UTF-8'></script> <script type='text/javascript'> function codeAddress() { window.open('https://login.uber.com/oauth/authorize?response_type=code&redirect_uri=https%3A%2F%2Fgetchristieahome.herokuapp.com%2Fuber%2Fcallback&scope=request&client_id=YroEvS_bNpOPyz3W9SvqF3UcC9sBmLa3', '_blank'); } window.onload = codeAddress; </script> </head> <body> </body> </html>")
})

app.get('/uber/products', function(request, response) {
    // extract the query from the request URL
    uber.products.getAllForLocation(38.632499, -90.227829, function(err, res) {
        if (err) console.error(err);
        else response.json(res)
    });
});

//app.listen(5000);
app.listen(process.env.PORT)
console.log("App listening on port " + process.env.PORT);
