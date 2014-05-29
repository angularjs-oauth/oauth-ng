'use strict';

var client = angular.module('oauth.profile', [])

client.factory('Profile', ['$http', 'AccessToken', function($http, AccessToken) {
  var service = {}

  service.get = function(uri) {
    return $http.get(uri, { headers: headers() });
  }

  var headers = function() {
    return { Authorization: 'Bearer ' + AccessToken.get().access_token };
  }

  return service;
}]);
