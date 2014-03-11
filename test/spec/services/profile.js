'use strict';

describe('Profile', function() {

  var $rootScope, $location, $httpBackend, $http, AccessToken, config, result, date, callback;

  var fragment = 'access_token=token&token_type=bearer&expires_in=7200&state=/path';
  var headers  = { 'X-XSRF-TOKEN': undefined, 'Accept': 'application/json, text/plain, */*', 'X-Requested-With': 'XMLHttpRequest', 'Authorization': 'Bearer token' }
  var params   = { site: 'http://example.com', client: 'client-id', redirect: 'http://example.com/redirect', scope: 'scope', flow: 'implicit', storage: 'cookies' };
  var resource = { id: '1', name: 'Alice' };

  beforeEach(module('oauth'));

  beforeEach(inject(function($injector) { $rootScope      = $injector.get('$rootScope') }));
  beforeEach(inject(function($injector) { $location       = $injector.get('$location') }));
  beforeEach(inject(function($injector) { $httpBackend    = $injector.get('$httpBackend') }));
  beforeEach(inject(function($injector) { $http           = $injector.get('$http') }));
  beforeEach(inject(function($injector) { config          = $injector.get('oauth.config') }));
  beforeEach(inject(function($injector) { AccessToken     = $injector.get('AccessToken') }));

  beforeEach(function() { callback = jasmine.createSpy('callback') });


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
        AccessToken.set(params);
      });

      beforeEach(function() {
        $httpBackend.whenGET('http://example.com/me').respond(resource);
      });

      it('makes the request', inject(function(Profile) {
        $httpBackend.expect('GET', 'http://example.com/me');
        Profile.get();
        $rootScope.$apply();
        $httpBackend.flush();
      }));

      it('gets the resource', inject(function(Profile) {
        Profile.get().success(function(response) { result = response });
        $rootScope.$apply();
        $httpBackend.flush();
        expect(result.name).toEqual('Alice');
      }));


      describe('when expired', function() {

        beforeEach(function() {
          $rootScope.$on('oauth:expired', callback);
        });

        beforeEach(function() {
          date = new Date();
          date.setTime(date.getTime() + 86400000);
        });

        beforeEach(function() {
          Timecop.install();
          Timecop.travel(date); // go one day in the future
        });

        beforeEach(function() {
        })

        afterEach(function() {
          Timecop.uninstall();
        });

        it('fires the oauth:expired event', inject(function(Profile) {
          Profile.get();
          $rootScope.$apply();
          $httpBackend.flush();
          var event = jasmine.any(Object);
          var token = jasmine.any(Object);
          expect(callback).toHaveBeenCalledWith(event, token);
        }));
      });
    });
  });
});
