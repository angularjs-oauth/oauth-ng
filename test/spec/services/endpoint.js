'use strict';

describe('Endpoint', function() {

  var result, $location, $cookies, Endpoint;

  var fragment = 'access_token=token&token_type=bearer&expires_in=7200&state=/path';
  var scope    = { site: 'http://example.com', client: 'client-id', redirect: 'http://example.com/redirect', scope: 'scope', flow: 'implicit', storage: 'cookies', authorizePath: '/oauth/authorize' };
  var uri      = 'http://example.com/oauth/authorize?response_type=token&client_id=client-id&redirect_uri=http://example.com/redirect&scope=scope&state=/';

  beforeEach(module('oauth'));

  beforeEach(inject(function($injector) { $location = $injector.get('$location') }));
  beforeEach(inject(function($injector) { $cookies  = $injector.get('$cookies') }));
  beforeEach(inject(function($injector) { Endpoint  = $injector.get('Endpoint') }));


  describe('#set', function() {

    beforeEach(function() {
      result = Endpoint.set(scope);
    });

    it('returns the oauth server endpoint', inject(function() {
      expect(result).toEqual(uri);
    }));

    describe('when in a specific /path', function() {

      beforeEach(function() {
        $location.path('/path');
      });

      beforeEach(function() {
        result = Endpoint.set(scope);
      });

      it('returns previous path in status', inject(function() {
        expect(result).toEqual(uri + 'path');
      }));
    });
  });


  describe('#get', function() {

    beforeEach(function() {
      Endpoint.set(scope);
    });

    beforeEach(function() {
      result = Endpoint.get();
    });

    it('returns the oauth server endpoint', inject(function() {
      expect(result).toEqual(uri);
    }));
  });
});
