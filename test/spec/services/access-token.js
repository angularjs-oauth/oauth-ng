'use strict';

describe('AccessToken', function() {

  var result, $location, $cookies, AccessToken, date;

  var fragment = 'access_token=token&token_type=bearer&expires_in=7200&state=/path';
  var denied   = 'error=access_denied&error_description=error';
  var token    = { access_token: 'token', token_type: 'bearer', expires_in: 7200, state: '/path' };
  var scope    = { site: 'http://example.com', client: 'client-id', redirect: 'http://example.com/redirect', scope: 'scope', flow: 'implicit', storage: 'cookies' };

  beforeEach(module('oauth'));

  beforeEach(inject(function($injector) { $location   = $injector.get('$location') }));
  beforeEach(inject(function($injector) { $cookies    = $injector.get('$cookies') }));
  beforeEach(inject(function($injector) { AccessToken = $injector.get('AccessToken') }));


  describe('#set', function() {

    describe('when sets the access token', function() {

      beforeEach(function() {
        $location.hash(fragment);
      });

      beforeEach(function() {
        result = AccessToken.set(scope);
      });

      it('sets the access token', function() {
        expect(result.access_token).toEqual('token');
      });

      it('sets #expires_at', function() {
        var expected_date = new Date();
        expected_date.setSeconds(expected_date.getSeconds() + 7200 - 60);
        expect(parseInt(result.expires_at/100)).toBe(parseInt(expected_date/100)); // 10 ms
      });
    });

    describe('with the access token in the fragment URI', function() {

      beforeEach(function() {
        $location.hash(fragment);
      });

      beforeEach(function() {
        result = AccessToken.set(scope);
      });

      it('sets the access token', function() {
        expect(result.access_token).toEqual('token');
      });

      it('removes the fragment string', function() {
        expect($location.hash()).toEqual('');
      });

      it('stores the token in the cookies', function() {
        var stored_token = $cookies[scope.client];
        expect(result.access_token).toEqual('token');
      });
    });

    describe('with the access token stored in the cookies', function() {

      beforeEach(function() {
        $cookies[scope.client] = JSON.stringify(token);
      });

      beforeEach(function() {
        result = AccessToken.set(scope);
      });

      it('sets the access token from cookies', function() {
        expect(result.access_token).toEqual('token');
      });
    });

    describe('with the denied message in the fragment URI', function() {

      beforeEach(function() {
        $location.hash(denied);
      });

      beforeEach(function() {
        result = AccessToken.set(scope);
      });

      it('sets the access token', function() {
        expect(result.error).toEqual('access_denied');
      });

      it('removes the fragment string', function() {
        expect($location.hash()).toEqual('');
      });

      it('stores the error message in the cookies', function() {
        var stored_token = $cookies[scope.client];
        expect(result.error).toBe('access_denied');
      });
    });
  });


  describe('#get', function() {

    beforeEach(function() {
      $location.hash(fragment);
    });

    beforeEach(function() {
      AccessToken.set(scope);
    });

    beforeEach(function() {
      result = AccessToken.get();
    });

    it('sets the access token', function() {
      expect(result.access_token).toEqual('token');
    });
  });


  describe('#destroy', function() {

    beforeEach(function() {
      $location.hash(fragment);
    });

    beforeEach(function() {
      AccessToken.set(scope);
    });

    beforeEach(function() {
      result = AccessToken.destroy(scope);
    });

    it('sets the access token', function() {
      expect(result).toBeNull();
    });

    it('reset the cache', function() {
      expect($cookies[scope.client]).toBeUndefined;
    });
  });


  describe('#expired', function() {

    beforeEach(function() {
      $location.hash(fragment);
    });

    beforeEach(function() {
      AccessToken.set(scope);
    });

    describe('when not expired', function() {

      beforeEach(function() {
        result = AccessToken.expired();
      });

      it('returns false', function() {
        expect(result).toBe(false);
      });
    });

    describe('when expired', function() {

      beforeEach(function() {
        date = new Date();
        date.setTime(date.getTime() + 86400000); // 1 day
      });

      beforeEach(function() {
        Timecop.install();
        Timecop.travel(date);
      });

      beforeEach(function() {
        result = AccessToken.expired();
      });

      afterEach(function() {
        Timecop.uninstall();
      });

      it('returns true', function() {
        expect(result).toBe(true);
      });
    });
  });
});
