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

function getDistanceToPoint(start, end) {
    var params = {
        origins: start,
        destinations: end,
        mode: 'driving',
        departure_time: new Date(),
        units: 'metric',
        language: 'en-GB'
    };
    gmAPI.distance(params, function(err, result) {
        console.log(result);
        var file = 'data.json'
        jsonfile.writeFile(file, result, function(err) {
            err != "" ? false : console.error(err);
        })
        //return secondsToMinutes(result.rows[0].elements[0].duration_in_traffic.value);
    });
}

getDistanceToPoint("38.632499, -90.227829", "N. 19th St. St. Louis, MO 63106");

var getSurroundingShelters = function(callback, city) {
  firebaseapp.database().ref("shelters/" + city).on("value", function(snapshot) {
      //console.log(snapshot.val()[1].agency_address);
      callback(snapshot);
  }, function(errorObject) {
      if (LogErrors) {
          console.log("getSnapshotFromDatabase error: " + errorObject.code);
      }
  });
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
app.get("/shelters/:city", function(req, res) {
  getSurroundingShelters(function(snapshot) {
    /*console.log("Callback: " + snapshot.val()[1].agency_address)
    console.log("Callback: " + JSON.stringify(snapshot.val()));*/
    res.json(snapshot.val());
  }, req.params.city)
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
