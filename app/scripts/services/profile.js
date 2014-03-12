'use strict';

var client = angular.module('oauth.profile', [])

client.factory('Profile', ['$http', function($http) {
  var service = {}

  service.get = function(uri) {
    return $http.get(uri);
  }

  return service;
}]);
