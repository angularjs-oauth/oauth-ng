'use strict';

describe('Profile', function() {

  var $rootScope, $location, $httpBackend, $http, AccessToken, Profile;
  var result, date, callback;

  var fragment = 'access_token=token&token_type=bearer&expires_in=7200&state=/path';
  var headers  = { 'Accept': 'application/json, text/plain, */*', 'Authorization': 'Bearer token' }
  var params   = { site: 'http://example.com', client: 'client-id', redirect: 'http://example.com/redirect', scope: 'scope', profileUri: 'http://example.com/me' };
  var resource = { id: '1', name: 'Alice' };

  beforeEach(module('oauth'));

  beforeEach(inject(function($injector) { $rootScope      = $injector.get('$rootScope') }));
  beforeEach(inject(function($injector) { $location       = $injector.get('$location') }));
  beforeEach(inject(function($injector) { $httpBackend    = $injector.get('$httpBackend') }));
  beforeEach(inject(function($injector) { $http           = $injector.get('$http') }));
  beforeEach(inject(function($injector) { AccessToken     = $injector.get('AccessToken') }));
  beforeEach(inject(function($injector) { Profile         = $injector.get('Profile') }));

  beforeEach(function() { callback = jasmine.createSpy('callback') });


  describe('.get', function() {

    describe('when authenticated', function() {

      beforeEach(function() {
        $location.hash(fragment);
        AccessToken.set(params);
      });

      beforeEach(function() {
        $httpBackend.whenGET('http://example.com/me', headers).respond(resource);
      });

      describe('when gets the profile', function() {

        it('makes the request', function() {
          $httpBackend.expect('GET', 'http://example.com/me');
          Profile.find(params.profileUri);
          $rootScope.$apply();
          $httpBackend.flush();
        });

        it('gets the resource', inject(function(Profile) {
          Profile.find(params.profileUri).success(function(response) { result = response });
          $rootScope.$apply();
          $httpBackend.flush();
          expect(result.name).toEqual('Alice');
        }));

        it('caches the profile', function() {
          Profile.find(params.profileUri);
          $rootScope.$apply();
          $httpBackend.flush();
          expect(Profile.get().name).toEqual('Alice');
        });

        it('fires oauth:profile event', function(done) {

          $rootScope.$on('oauth:profile', function (event, profile) {
            expect(typeof profile).toBe('object');
            done();
          });

          Profile.find(params.profileUri);
          $rootScope.$apply();
          $httpBackend.flush();

        });


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

          afterEach(function() {
            Timecop.uninstall();
          });

          it('fires the oauth:expired event', inject(function(Profile) {
            Profile.find(params.profileUri);
            $rootScope.$apply();
            $httpBackend.flush();
            var event = jasmine.any(Object);
            var token = jasmine.any(Object);
            expect(callback).toHaveBeenCalledWith(event, token);
          }));
        });
      });


      describe('when sets the profile', function() {

        beforeEach(function() {
          Profile.set(resource);
        });

        it('caches the profile', function() {
          expect(Profile.get().name).toEqual('Alice');
        });

      });
    });
  });
});
