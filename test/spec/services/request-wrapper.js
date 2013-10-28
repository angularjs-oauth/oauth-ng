'use strict';

describe('RequestWrapper', function() {

  var result, $location, $cookies, $httpBackend, AccessToken, config;

  var fragment = 'access_token=token&token_type=bearer&expires_in=7200&state=/path';
  var headers  = { 'X-XSRF-TOKEN': undefined, 'Accept': 'application/json, text/plain, */*', 'X-Requested-With': 'XMLHttpRequest', 'Authorization': 'Bearer token' }
  var scope    = { site: 'http://example.com', client: 'client-id', redirect: 'http://example.com/redirect', scope: 'scope', flow: 'implicit', storage: 'cookies' };
  var resource = { id: '1', name: 'Alice' };

  beforeEach(module('oauth'));

  beforeEach(inject(function($injector) { $location    = $injector.get('$location') }));
  beforeEach(inject(function($injector) { $cookies     = $injector.get('$cookies') }));
  beforeEach(inject(function($injector) { $httpBackend = $injector.get('$httpBackend') }));
  beforeEach(inject(function($injector) { config       = $injector.get('oauth.config') }));
  beforeEach(inject(function($injector) { AccessToken  = $injector.get('AccessToken') }));


  describe('.get', function() {

    beforeEach(function() {
      config.profile = 'http://example.com/me';
    });

    afterEach(function() {
      config.profile = null;
    });

    describe('when authenticated', function() {

      beforeEach(function() {
        $location.hash(fragment);
      });

      beforeEach(function() {
        AccessToken.set(scope);
      });

      beforeEach(function() {
        $httpBackend.whenGET('http://example.com/me', headers).respond(resource);
      });

      it('gets the resource', inject(function(Profile) {
        var result = Profile.get();
        $httpBackend.flush();
        expect(result.name).toEqual('Alice');
      }));
    });
  });
});
