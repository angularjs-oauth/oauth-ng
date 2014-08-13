'use strict';

var profileClient = angular.module('oauth.profile', [])

profileClient.factory('Profile', function($http, AccessToken) {
  var service = {};
  var profile;

  service.find = function(uri) {
    var promise = $http.get(uri, { headers: headers() });
    promise.success(function(response) { profile = response });
    return promise;
  };

  service.get = function(uri) {
    return profile;
  };

  service.set = function(resource) {
    profile = resource;
    return profile;
  };

  var headers = function() {
    return { Authorization: 'Bearer ' + AccessToken.get().access_token };
  };

  return service;
});
