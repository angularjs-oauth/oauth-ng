'use strict';

describe('AuthInterceptor', function() {
	var theOAuthConfigurationProvider, theOAuthConfiguration, OAuthConfiguration, AccessToken, AuthInterceptor, $location, result;
	var protectedConfig, unprotectedConfig;
	
	beforeEach(module('oauth'));
	
	var expires_at = '2014-08-17T17:38:37.584Z';
	var fragment = 'access_token=token&token_type=bearer&expires_in=7200&state=/path&extra=stuff'
	
	
	beforeEach(function() {
		var fakeModule = angular.module('test.app.config', function(){});
		fakeModule.config(function(OAuthConfigurationProvider, $httpProvider) {
			theOAuthConfigurationProvider = OAuthConfigurationProvider;
			theOAuthConfigurationProvider.init({protectedResources:['http://api.protected']}, $httpProvider);
			theOAuthConfiguration = theOAuthConfigurationProvider.$get();
		})
		module('oauth', 'test.app.config');
		
		inject(function() {});
	})
	
	beforeEach(inject(function() { OAuthConfiguration = theOAuthConfiguration }));
	beforeEach(inject(function($injector) { $location = $injector.get('$location'); }));
	beforeEach(inject(function($injector) { AccessToken = $injector.get('AccessToken'); AccessToken.destroy(); } ));
	beforeEach(inject(function($injector) { AuthInterceptor = $injector.get('AuthInterceptor'); }));
	
	beforeEach(function() {
		protectedConfig = { url: 'http://api.protected', headers: { 'Accept': 'application/json'} };
		unprotectedConfig = { url: 'http://api.unprotected', headers: { 'Accept': 'application/json' } };
	});
	
	describe('when the resource is protected', function() {
		beforeEach(function() {
			$location.hash(fragment);
			AccessToken.set();
			result = AuthInterceptor.request(protectedConfig);
		});
		
		it('should have the token in the header', function() {
			expect(result.headers.Authorization).toEqual('Bearer token');
		});
	});
	
	describe('when the resource is unprotected', function() {
		beforeEach(function() {
			$location.hash(fragment);
			AccessToken.set();
			result = AuthInterceptor.request(unprotectedConfig);
		});
		
		it('should not have the token in the header', function() {
			expect(result.headers.Authorization).toBeUndefined();
		});
	});
	
	describe('when the user is not logged in', function() {
		beforeEach(function() {
			AccessToken.destroy();
			result = AuthInterceptor.request(protectedConfig);
		});
		
		it('should not have anything in the authorization header', function() {
			expect(result.headers.Authorization).toBeUndefined();
		});
	});
	
})