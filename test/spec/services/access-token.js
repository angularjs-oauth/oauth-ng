'use strict';

describe('AccessToken', function() {

  var result, $location, $sessionStorage, AccessToken, date;

  var fragment = 'access_token=token&token_type=bearer&expires_in=7200&state=/path';
  var denied   = 'error=access_denied&error_description=error';
  var token    = { access_token: 'token', token_type: 'bearer', expires_in: 7200, state: '/path' };

  beforeEach(module('oauth'));

  beforeEach(inject(function($injector) { $location       = $injector.get('$location') }));
  beforeEach(inject(function($injector) { $sessionStorage = $injector.get('$sessionStorage') }));
  beforeEach(inject(function($injector) { AccessToken     = $injector.get('AccessToken') }));


  describe('#set', function() {

    describe('when sets the access token', function() {

      beforeEach(function() {
        $location.hash(fragment);
      });

      beforeEach(function() {
        result = AccessToken.set();
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
        result = AccessToken.set();
      });

      it('sets the access token', function() {
        expect(result.access_token).toEqual('token');
      });

      it('removes the fragment string', function() {
        expect($location.hash()).toEqual('');
      });

      it('stores the token in the session', function() {
        var stored_token = $sessionStorage.token;
        expect(result.access_token).toEqual('token');
      });
    });

    describe('with the access token stored in the session', function() {

      beforeEach(function() {
        $sessionStorage.token = token;
      });

      beforeEach(function() {
        result = AccessToken.set();
      });

      it('sets the access token from session', function() {
        expect(result.access_token).toEqual('token');
      });
    });

    describe('with the denied message in the fragment URI', function() {

      beforeEach(function() {
        $location.hash(denied);
      });

      beforeEach(function() {
        result = AccessToken.set();
      });

      it('sets the access token', function() {
        expect(result.error).toEqual('access_denied');
      });

      it('removes the fragment string', function() {
        expect($location.hash()).toEqual('');
      });

      it('stores the error message in the session', function() {
        var stored_token = $sessionStorage.token;
        expect(result.error).toBe('access_denied');
      });
    });
  });


  describe('#get', function() {

    beforeEach(function() {
      $location.hash(fragment);
    });

    beforeEach(function() {
      AccessToken.set();
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
      AccessToken.set();
    });

    beforeEach(function() {
      result = AccessToken.destroy();
    });

    it('sets the access token', function() {
      expect(result).toBeNull();
    });

    it('reset the cache', function() {
      expect($sessionStorage.token).toBeUndefined;
    });
  });


  describe('#expired', function() {

    beforeEach(function() {
      $location.hash(fragment);
    });

    beforeEach(function() {
      AccessToken.set();
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
        date.setTime(date.getTime() + 86400000);
      });

      beforeEach(function() {
        Timecop.install();
        Timecop.travel(date); // go to the future for one day
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
