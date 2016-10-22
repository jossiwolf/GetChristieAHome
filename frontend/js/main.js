angular.module('BlankApp', ['ngMaterial', 'ngMessages', 'material.svgAssetsCache']).controller('AppCtrl', AppCtrl);

function AppCtrl($scope) {
    $scope.test = 'page1';
}
