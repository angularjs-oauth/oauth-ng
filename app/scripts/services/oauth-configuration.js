'use strict';

var oauthConfigurationService = angular.module('oauth.configuration', []);

oauthConfigurationService.provider('OAuthConfiguration', function() {
	var _config = {};
	
	this.init = function(config, httpProvider) {
		_config.protectedResources = config.protectedResources || [];
		httpProvider.interceptors.push('AuthInterceptor');
	};
	
	this.$get = function() {
		return {
			getConfig: function() {
				return _config;
			}
		};
	};
})
.factory('AuthInterceptor', function($q, $rootScope, OAuthConfiguration, AccessToken) {
	return {
		'request': function(config) {
			OAuthConfiguration.getConfig().protectedResources.forEach(function(resource) {
				// If the url is one of the protected resources, we want to see if there's a token and then
				// add the token if it exists.
				if (config.url.indexOf(resource) > -1) {
					var token = AccessToken.get();
					if (token) {
						config.headers.Authorization = 'Bearer ' + token.access_token;
					}
				}
			});
			
			return config;
		}
	};
});