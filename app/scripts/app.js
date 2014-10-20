'use strict';

// App libraries
var app = angular.module('oauth', [
  'oauth.directive',      // login directive
  'oauth.accessToken',    // access token service
  'oauth.endpoint',       // oauth endpoint service
  'oauth.profile',        // profile model
  'oauth.interceptor',    // bearer token interceptor
  'LocalStorageModule'
]);

angular.module('oauth').config(['$locationProvider','$httpProvider','localStorageServiceProvider',
  function($locationProvider, $httpProvider, localStorageServiceProvider) {
    $httpProvider.interceptors.push('ExpiredInterceptor');
    localStorageServiceProvider.setStorageType('sessionStorage');
  }]);
