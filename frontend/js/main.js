angular.module('HIMSapp', ['ngMaterial', 'ngMessages', 'material.svgAssetsCache']).controller('AppCtrl', AppCtrl);

function AppCtrl($scope) {
    $scope.criticalUser = {
        firstName: 'Jane',
        lastName: 'Doe',
        DOB: '10/12/1998',
        gender: 'Female',
        SSN: '000-00-0000',
        issuedPhone: '',
        ID: '',
        IDtype: '',
        IDnum: '',
        spouse: 'false',
        children: 'false',
        veteran: 'false',
        lgbTolerant: 'false',
        sober: 'false',
        hiv: 'false',
        sexOffend: 'false',
        employer: '',
        manager: '',
        employerPhone: '',
        emergencyContactFirst: '',
        emergencyContactLast: '',
        emergencyPhone: '',
        primaryDoctor: '',
        pharmacy: '',
        medInsCo: '',
        medInsPol: '',
        medVisitsMonth: '',
        serviceUseMonth: '',
        avgDailyMeals: '',
    };


    $scope.catalystRep = {
        organizationName: 'Default',
        organizationType: '',
        Address: '',
        City: '',
        State: '',
        postalCode: '###-###-####',
        firstName: '',
        lastName: '',
        stakeholderPhone: '',
        issuedPhone: '',
        submissionDate: '',
        notes: 'Report Not Sent',
        bedsNeed: '',
    }

    $scope.shelter = {
        id: '',
        agency_program_name: '',
        agency_address: '',
        capacity: '',
        occupancy: ''
    }
    $scope.states = ('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS ' +
        'MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI ' +
        'WY').split(' ').map(function(state) {
        return {
            abbrev: state
        };
    });

    function insertToFirebase(objecttobepushed, databaseRef) {
        var newPostRef = databaseRef.push();
        newPostRef.set(objecttobepushed);
    }

  /*  function updateOccupancy(bedsNeed){
        var occupancy = firebase.database().ref('stlouis');
        occupancy.on('value', function(snapshot){
          occupancy = snapshot.val() - bedsNeed;
        })
    } */

    firebase.auth().signInWithEmailAndPassword("jossiwolf@gmx.net", "globalhack").catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
    });
    //$scope.fetchServiceCenter();

    $scope.fetchServiceCenter = function() {
        var databaseref = firebase.database().ref("shelters/mo/stlouis/"+$scope.shelter.id);
           databaseref.once("value", function(snapshot) {
           $scope.shelter = snapshot.val()
        });
    }

    $scope.admitClient = function() {
        alert('Client Admitted Successfully!');
    }

    $scope.registerClient = function() {
        //alert('Hello World'+$scope.criticalUser);
        var keys = Object.keys($scope.criticalUser)
        for (var i = 0; i < keys.length; i++) {
            //console.log(keys[i])
            //console.log($scope.criticalUser[keys[i]])
        }
        insertToFirebase($scope.criticalUser, firebase.database().ref('newclients/'+$scope.criticalUser.issuedPhone))
    }

    $scope.catalystRepUpdate = function() {
        //alert('Hello World'+$scope.criticalUser);
        var keys = Object.keys($scope.catalystRep)
        for (var i = 0; i < keys.length; i++) {
            //console.log(keys[i])
            //console.log($scope.criticalUser[keys[i]])
        }
        insertToFirebase($scope.catalystRep, firebase.database().ref('newclients/'+$scope.catalystRep.issuedPhone))
    }

    $scope.change = function() {
        if ($scope.data.cb1) {
            document.getElementById('idInfoRow').style.display = 'block';
        } else {
            document.getElementById('idInfoRow').style.display = 'none';
        }
    };

}
