angular.module('GetChristieAHome', ['ngMessages', 'material.svgAssetsCache']).controller('IntakeController', IntakeController);

function IntakeController($scope) {
    $scope.appname = "ShelterRide"
    $scope.requirements = [{number: 1, name: "require_id"}, {number: 2, name: "require_id"}]
    $scope.addRequirement = function() {
        $scope.requirements.push({number: $scope.requirements.length+1, name: "Please fill in name"})
    }
    $scope.mdl_textfield_click = function(nr) {
      $('#label_requirement' + nr + "-text").val("");
    }
}
