'use strict';

// App libraries
angular.module('oauth', [
  'oauth.directive',       // login directive
  'oauth.accessToken',     // access token service
  'oauth.endpoint',        // oauth endpoint service
  'oauth.requestWrapper',  // requests wrapper (inject the access token into the header)
  'oauth.profile',         // profile model
  'oauth.config'           // configurations
])

// HTML5 mode
angular.module('oauth').config(['$locationProvider', function($locationProvider) {
  $locationProvider.html5Mode(true).hashPrefix('!');
}]);

