'use strict';

// App libraries
var app = angular.module('oauth', [
  'oauth.directive',      // login directive
  'oauth.accessToken',    // access token service
  'oauth.endpoint',       // oauth endpoint service
  'oauth.profile',        // profile model
  'oauth.interceptor'     // bearer token interceptor
])

angular.module('oauth').config(['$locationProvider','$httpProvider',
  function($locationProvider, $httpProvider) {
    $locationProvider.html5Mode(true).hashPrefix('!');
    $httpProvider.interceptors.push('ExpiredInterceptor');
  }]);
