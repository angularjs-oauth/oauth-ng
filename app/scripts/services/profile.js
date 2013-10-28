'use strict';

var client = angular.module('oauth.profile', ['ngResource'])

client.factory('Profile', ['RequestWrapper', '$resource', 'oauth.config',
  function(RequestWrapper, $resource, config) {

    var resource = $resource(config.profile, {}, {
      //get: { method: 'JSONP', params: { callback: 'JSON_CALLBACK' } }
    });
    return RequestWrapper.wrap(resource, ['get']);
}]);
