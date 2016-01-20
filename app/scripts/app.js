'use strict';

// App libraries
angular.module('oauth', [
  'oauth.directive',      // login directive
  'oauth.idToken',        // id token service (only for OpenID Connect)
  'oauth.oidcConfig',     // for loading OIDC configuration from .well-known/openid-configuration endpoint
  'oauth.accessToken',    // access token service
  'oauth.endpoint',       // oauth endpoint service
  'oauth.profile',        // profile model
  'oauth.storage',        // storage
  'oauth.interceptor',     // bearer token interceptor
  'oauth.configuration'   // token appender
])
  .config(['$locationProvider','$httpProvider',
  function($locationProvider, $httpProvider) {
    $httpProvider.interceptors.push('ExpiredInterceptor');
  }]);
