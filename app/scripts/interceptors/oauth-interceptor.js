'use strict';

var service = angular.module('oauth.interceptor', []);

service.factory('ExpiredInterceptor', ['$rootScope', '$q', '$sessionStorage',
  function ($rootScope, $q, $sessionStorage) {

    var service = {};

    service.request = function(config) {
      var token = $sessionStorage.token;

      if (token && expired(token))
        $rootScope.$broadcast('oauth:expired', token);

      return config;
    };

    var expired = function(token) {
      return (token && token.expires_at && new Date(token.expires_at) < new Date())
    }

    return service;
  }]);

