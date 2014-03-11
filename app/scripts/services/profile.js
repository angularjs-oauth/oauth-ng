'use strict';

var client = angular.module('oauth.profile', ['ngResource'])

client.factory('Profile', ['$http', 'oauth.config', function($http, config) {
  var service = {}

  service.get = function() {
    return $http.get(config.profile);
  }

  return service;
}]);
