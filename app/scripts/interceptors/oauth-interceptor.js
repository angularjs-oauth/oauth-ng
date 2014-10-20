'use strict';

var interceptorService = angular.module('oauth.interceptor', []);

interceptorService.factory('ExpiredInterceptor', function ($rootScope, $q, localStorageService) {

  var service = {};

  service.request = function(config) {
    var token = localStorageService.get('token');

    if (token && expired(token))
      $rootScope.$broadcast('oauth:expired', token);

    return config;
  };

  var expired = function(token) {
    return (token && token.expires_at && new Date(token.expires_at) < new Date())
  };

  return service;
});
