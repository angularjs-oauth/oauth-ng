'use strict';

var service = angular.module('oauth.interceptor', []);

service.factory('OAuthInterceptor', ['$rootScope', '$q', '$sessionStorage',
  function ($rootScope, $q, $sessionStorage) {

    var service = {};

    service.request = function(config) {
      var token = JSON.parse($sessionStorage.token);

      if (token)
        config.headers.Authorization = 'Bearer ' + token.access_token;

      if (token && expired(token))
        $rootScope.$broadcast('oauth:expired', token);

      return config;
    };

    var expired = function(token) {
      return (token && token.expires_at && new Date(token.expires_at) < new Date())
    }

    return service;
  }]);

