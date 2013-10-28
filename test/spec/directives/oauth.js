// TODO set the login template
// beforeEach(module('tpl/tabs.html', 'tpl/pane.html'));
// TODO move this template in tests/templates and make it dry.

describe('oauth', function() {

  var $location, $cookies, $httpBackend, AccessToken, Endpoint, element, scope, result, config;

  var uri      = 'http://example.com/oauth/authorize?response_type=token&client_id=client-id&redirect_uri=http://example.com/redirect&scope=scope&state=/';
  var fragment = 'access_token=token&token_type=bearer&expires_in=7200&state=/path';
  var denied   = 'error=access_denied&error_description=error';
  var headers  = { 'X-XSRF-TOKEN': undefined, 'Accept': 'application/json, text/plain, */*', 'X-Requested-With': 'XMLHttpRequest', 'Authorization': 'Bearer token' }
  var profile  = { id: '1', fullname: 'Alice Wonderland', email: 'alice@example.com' };

  beforeEach(module('oauth'));
  beforeEach(module('views/templates/default.html'));

  beforeEach(inject(function($injector) { $location    = $injector.get('$location') }));
  beforeEach(inject(function($injector) { $cookies     = $injector.get('$cookies') }));
  beforeEach(inject(function($injector) { $httpBackend = $injector.get('$httpBackend') }));
  beforeEach(inject(function($injector) { AccessToken  = $injector.get('AccessToken') }));
  beforeEach(inject(function($injector) { Endpoint     = $injector.get('Endpoint') }));
  beforeEach(inject(function($injector) { config       = $injector.get('oauth.config') }));


  beforeEach(inject(function($rootScope, $compile) {
    element = angular.element(
      '<span class="xyze-widget">' +
        '<oauth ng-cloak site="http://example.com"' +
          'client="client-id"' +
          'redirect="http://example.com/redirect"' +
          'scope="scope"' +
          'profile="http://example.com/me"' +
          'template="views/templates/default.html"' +
          'storage="cookies">Sign In</oauth>' +
      '</span>'
    );
  }));

  var compile = function($rootScope, $compile) {
    scope = $rootScope;
    $compile(element)(scope);
    scope.$digest();
  }


  describe('when logged in', function() {


    beforeEach(inject(function() {
      config.profile = 'http://example.com/me';
    }));

    beforeEach(function() {
      $location.hash(fragment);
    });

    beforeEach(function() {
      $httpBackend.whenGET('http://example.com/me', headers).respond(profile);
    });

    beforeEach(inject(function($rootScope, $compile) {
      compile($rootScope, $compile);
    }));

    it('shows the link "Logout #{profile.email}"', inject(function(Profile) {
      $httpBackend.flush();
      result = element.find('.logout').text();
      expect(result).toBe('Logout Alice Wonderland');
    }));

    it('removes the fragment', function() {
      expect($location.hash()).toBe('');
    });

    it('shows the logout link', inject(function(Profile) {
      expect(element.find('.login').css('display')).toBe('none');
      expect(element.find('.logout').css('display')).toBe('');
    }));


    describe('when refreshes the page', function() {

      beforeEach(function() {
        $location.path('/');
      });

      it('keeps being logged in', inject(function(Profile) {
        $httpBackend.flush();
        result = element.find('.logout').text();
        expect(result).toBe('Logout Alice Wonderland');
      }));

      it('shows the logout link', inject(function(Profile) {
        expect(element.find('.login').css('display')).toBe('none');
        expect(element.find('.logout').css('display')).toBe('');
      }));
    });


    describe('when logs out', function() {

      beforeEach(function() {
        element.find('.logout').click();
      });

      it('shows the login link', inject(function(Profile) {
        expect(element.find('.login').css('display')).toBe('');
        expect(element.find('.logout').css('display')).toBe('none');
      }));
    });
  });


  describe('when logged out', function() {

    beforeEach(inject(function($rootScope, $compile) {
      compile($rootScope, $compile)
    }));

    beforeEach(inject(function($rootScope, $compile) {
      spyOn(Endpoint, 'redirect');
    }));

    it('shows the text "Sing In"', inject(function($compile, $rootScope) {
      result = element.find('.login').text();
      expect(result).toBe('Sign In');
    }));

    it('sets the href attribute', inject(function($compile, $rootScope) {
      result = element.find('.login').click();
      expect(Endpoint.redirect).toHaveBeenCalled();
    }));

    it('shows the login link', inject(function(Profile) {
      expect(element.find('.login').css('display')).toBe('');
      expect(element.find('.logout').css('display')).toBe('none');
    }));
  });


  describe('when denied', function() {

    beforeEach(function() {
      $location.hash(denied);
    });

    beforeEach(inject(function($rootScope, $compile) {
      compile($rootScope, $compile)
    }));

    beforeEach(inject(function($rootScope, $compile) {
      spyOn(Endpoint, 'redirect');
    }));

    it('shows the text "Denied"', inject(function($compile, $rootScope) {
      result = element.find('.denied').text();
      expect(result).toBe('Access denied. Try again.');
    }));

    it('sets the href attribute', inject(function($compile, $rootScope) {
      result = element.find('.denied').click();
      expect(Endpoint.redirect).toHaveBeenCalled();
    }));

    it('shows the login link', inject(function(Profile) {
      expect(element.find('.login').css('display')).toBe('none');
      expect(element.find('.logout').css('display')).toBe('none');
      expect(element.find('.denied').css('display')).toBe('');
    }));
  });
});

