'use strict';

describe('RequestWrapper', function() {

  var result, $location, $cookies, $httpBackend, AccessToken, Endpoint, config, date;

  var fragment    = 'access_token=token&token_type=bearer&expires_in=7200&state=/path';
  var headers     = { 'X-XSRF-TOKEN': undefined, 'Accept': 'application/json, text/plain, */*', 'X-Requested-With': 'XMLHttpRequest', 'Authorization': 'Bearer token' }
  var headers_401 = { 'X-XSRF-TOKEN': undefined, 'Accept': 'application/json, text/plain, */*', 'X-Requested-With': 'XMLHttpRequest' }
  var scope       = { site: 'http://example.com', client: 'client-id', redirect: 'http://example.com/redirect', scope: 'scope', flow: 'implicit', storage: 'cookies' };
  var resource    = { id: '1', name: 'Alice' };

  beforeEach(module('oauth'));

  beforeEach(inject(function($injector) { $location    = $injector.get('$location') }));
  beforeEach(inject(function($injector) { $cookies     = $injector.get('$cookies') }));
  beforeEach(inject(function($injector) { $httpBackend = $injector.get('$httpBackend') }));
  beforeEach(inject(function($injector) { config       = $injector.get('oauth.config') }));
  beforeEach(inject(function($injector) { AccessToken  = $injector.get('AccessToken') }));
  beforeEach(inject(function($injector) { Endpoint     = $injector.get('Endpoint') }));


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

      it('gets the user profile', inject(function(Profile) {
        var result = Profile.get();
        $httpBackend.flush();
        expect(result.name).toBe('Alice');
      }));


      describe('when token is expired', function() {

        beforeEach(function() {
          date = new Date();
          date.setTime(date.getTime() + 86400000); // 1 day
        });

        beforeEach(function() {
          Timecop.install();
          Timecop.travel(date);
        });

        afterEach(function() {
          Timecop.uninstall();
        });

        beforeEach(function() {
          spyOn(Endpoint, 'redirect');
        });

        it('redirects the user', inject(function(Profile) {
          Profile.get();
          $httpBackend.flush();
          expect(Endpoint.redirect).toHaveBeenCalled();
        }));
      });
    });


    describe('when not authenticated', function() {

      beforeEach(function() {
        $httpBackend.whenGET('http://example.com/me', headers_401).respond(401);
      });

      beforeEach(function() {
        spyOn(Endpoint, 'redirect');
      });

      it('gets the user profile', inject(function(Profile) {
        var result = Profile.get();
        $httpBackend.flush();
        expect(result.name).toBeNull;
      }));

      it('gets the user profile', inject(function(Profile) {
        Profile.get();
        $httpBackend.flush();
        expect(Endpoint.redirect).not.toHaveBeenCalled();
      }));
    });

  });
});
