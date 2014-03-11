'use strict';

describe('Endpoint', function() {

  var result, $location, $sessionStorage, Endpoint;

  var fragment = 'access_token=token&token_type=bearer&expires_in=7200&state=/path';
  var params   = { site: 'http://example.com', client: 'client-id', redirect: 'http://example.com/redirect', scope: 'scope', flow: 'implicit', storage: 'cookies', authorizePath: '/oauth/authorize' };
  var uri      = 'http://example.com/oauth/authorize?response_type=token&client_id=client-id&redirect_uri=http://example.com/redirect&scope=scope&state=/';

  beforeEach(module('oauth'));

  beforeEach(inject(function($injector) { $location       = $injector.get('$location') }));
  beforeEach(inject(function($injector) { $sessionStorage = $injector.get('$sessionStorage') }));
  beforeEach(inject(function($injector) { Endpoint   = $injector.get('Endpoint') }));


  describe('#set', function() {

    beforeEach(function() {
      result = Endpoint.set(params);
    });

    it('returns the oauth server endpoint', function() {
      expect(result).toEqual(uri);
    });

    describe('when in a specific /path', function() {

      beforeEach(function() {
        $location.path('/path');
      });

      beforeEach(function() {
        result = Endpoint.set(params);
      });

      it('returns previous path in status', function() {
        expect(result).toEqual(uri + 'path');
      });
    });
  });


  describe('#get', function() {

    beforeEach(function() {
      Endpoint.set(params);
    });

    beforeEach(function() {
      result = Endpoint.get();
    });

    it('returns the oauth server endpoint', function() {
      expect(result).toEqual(uri);
    });
  });
});
