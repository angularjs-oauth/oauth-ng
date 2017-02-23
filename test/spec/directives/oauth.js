'use strict';

describe('oauth', function() {

  var $rootScope, $location, Storage, $httpBackend, $compile, AccessToken, Endpoint, element, scope, result, callback,
      validCallback, invalidCallback;

  var fragment = 'access_token=token&token_type=bearer&expires_in=7200&state=/path';
  var denied = 'error=access_denied&error_description=error';
  var headers = { 'Accept': 'application/json, text/plain, */*', 'Authorization': 'Bearer token' };
  var profile = { id: '1', full_name: 'Alice Wonderland', email: 'alice@example.com' };
  var session = { valid: true , expires: ((new Date()).getTime() + 356*24*60*60) };
  var invalidSession = { valid: false };
  var invalidProfile = { valid: false };

  beforeEach(module('oauth'));
  beforeEach(module('templates'));

  beforeEach(inject(function($injector) { $rootScope = $injector.get('$rootScope'); }));
  beforeEach(inject(function($injector) { $compile = $injector.get('$compile'); }));
  beforeEach(inject(function($injector) { $location = $injector.get('$location'); }));
  beforeEach(inject(function($injector) { Storage = $injector.get('Storage'); }));
  beforeEach(inject(function($injector) { $httpBackend = $injector.get('$httpBackend'); }));
  beforeEach(inject(function($injector) { AccessToken = $injector.get('AccessToken'); }));
  beforeEach(inject(function($injector) { Endpoint = $injector.get('Endpoint'); }));

  beforeEach(function() {
    element = angular.element(
      '<span class="xyze-widget">' +
        '<oauth ng-cloak site="http://example.com"' +
          'client="client-id"' +
          'redirect="http://example.com/redirect"' +
          'scope="scope"' +
          'profile-uri="http://example.com/me"' +
          'session-path="/session"' +
          '>Sign In' +
          '</oauth>' +
      '</span>'
    );
  });

  var compile = function() {
    scope = $rootScope;
    $compile(element)(scope);
    scope.$digest();
  };

  describe('when logged in', function() {

    beforeEach(function() {
      callback = jasmine.createSpy('callback');
      validCallback = jasmine.createSpy('validCallback');
      $rootScope.$on('oauth:valid', validCallback);
    });

    beforeEach(function() {
      $location.hash(fragment);
    });

    describe('invalid session', function () {
      beforeEach(function () {
        invalidCallback = jasmine.createSpy('invalidCallback');
        $httpBackend.whenGET('http://example.com/me', headers).respond(invalidProfile);
        $httpBackend.whenGET('http://example.com/session?token=token').respond(invalidSession);
        $rootScope.$on('oauth:invalid', invalidCallback);
      });

      beforeEach(function () {
        compile($rootScope, $compile);
      });

      it('hits the session and is invalid', function () {
        $httpBackend.flush();
        expect(invalidCallback.calls.count()).toBe(1);
      });
    });

    describe('valid session', function () {

      beforeEach(function () {
        $httpBackend.whenGET('http://example.com/me', headers).respond(profile);
        $httpBackend.whenGET('http://example.com/session?token=token').respond(session);
      });

      beforeEach(function () {
        $rootScope.$on('oauth:authorized', callback);
      });

      beforeEach(function () {
        $rootScope.$on('oauth:login', callback);
      });

      beforeEach(function () {
        compile($rootScope, $compile);
      });

      it('shows the link "Logout #{profile.email}"', function () {
        $rootScope.$apply();
        $httpBackend.flush();
        result = element.find('.logged-in').text();
        expect(result).toBe('Logout alice@example.com');
      });

      it('removes the fragment', function () {
        expect($location.hash()).toBe('');
      });

      it('shows the logout link', function () {
        expect(element.find('.logged-out').attr('class')).toMatch('ng-hide');
        expect(element.find('.logged-in').attr('class')).not.toMatch('ng-hide');
      });

      it('fires the oauth:login and oauth:authorized event', function () {
        AccessToken.get();
        expect(callback.calls.count()).toBe(2);
      });

      it('hits the session and is valid', function () {
        $httpBackend.flush();
        expect(validCallback.calls.count()).toBe(1);
      });


      describe('when refreshes the page', function () {

        beforeEach(function () {
          callback = jasmine.createSpy('callback');
        });

        beforeEach(function () {
          $rootScope.$on('oauth:authorized', callback);
        });

        beforeEach(function () {
          $location.path('/');
        });

        beforeEach(function () {
          compile($rootScope, $compile);
        });

        it('keeps being logged in', function () {
          $rootScope.$apply();
          $httpBackend.flush();
          result = element.find('.logged-in').text();
          expect(result).toBe('Logout alice@example.com');
        });

        it('shows the logout link', function () {
          expect(element.find('.logged-out').attr('class')).toMatch('ng-hide');
          expect(element.find('.logged-in').attr('class')).not.toMatch('ng-hide');
        });

        it('fires the oauth:authorized event', function () {
          var event = jasmine.any(Object);
          var token = AccessToken.get();
          expect(callback).toHaveBeenCalledWith(event, token);
        });

        it('does not fire the oauth:login event', function () {
          AccessToken.get();
          expect(callback.calls.count()).toBe(1);
        });
      });


      describe('when logs out', function () {

        beforeEach(function () {
          callback = jasmine.createSpy('callback');
        });

        beforeEach(function () {
          $rootScope.$on('oauth:logout', callback);
        });

        beforeEach(function () {
          $rootScope.$on('oauth:loggedOut', callback);
        });

        beforeEach(function () {
          element.find('.logged-in').click();
        });

        it('shows the login link', function () {
          expect(element.find('.logged-out').attr('class')).not.toMatch('ng-hide');
          expect(element.find('.logged-in').attr('class')).toMatch('ng-hide');
        });

        it('fires the oauth:logout and oauth:loggedOut event', function () {
          var event = jasmine.any(Object);
          expect(callback).toHaveBeenCalledWith(event);
          expect(callback.calls.count()).toBe(2);
        });
      });
    });
  });


  describe('when logged out', function() {

    beforeEach(function() {
      callback = jasmine.createSpy('callback');
      invalidCallback = jasmine.createSpy('invalidCallback');
      $httpBackend.whenGET('http://example.com/session?token=token').respond(invalidSession);
      $rootScope.$on('oauth:invalid', invalidCallback);
    });

    beforeEach(function() {
      $rootScope.$on('oauth:loggedOut', callback);
    });

    beforeEach(function() {
      AccessToken.destroy();
    });

    beforeEach(function() {
      compile($rootScope, $compile);
    });

    beforeEach(function() {
      spyOn(Endpoint, 'redirect');
    });

    it('shows the text "Sign In"', function() {
      result = element.find('.logged-out').text();
      expect(result).toBe('Sign In');
    });

    it('sets the href attribute', function() {
      result = element.find('.logged-out').click();
      expect(Endpoint.redirect).toHaveBeenCalled();
    });

    it('shows the login link', function() {
      expect(element.find('.logged-out').attr('class')).not.toMatch('ng-hide');
      expect(element.find('.logged-in').attr('class')).toMatch('ng-hide');
    });

    it('fires the oauth:loggedOut event', function() {
      var event = jasmine.any(Object);
      expect(callback).toHaveBeenCalledWith(event);
    });

    it('does not fire the oauth:logout event', function() {
      expect(callback.calls.count()).toBe(1);
    });

    it('fires the oauth:invalid event', function () {
      expect(invalidCallback.calls.count()).toBe(1);
    });
  });


  describe('when denied', function() {

    beforeEach(function() {
      callback = jasmine.createSpy('callback');
      $httpBackend.whenGET('http://example.com/session?token=undefined').respond(invalidSession);
    });

    beforeEach(function() {
      $location.hash(denied);
    });

    beforeEach(function() {
      $rootScope.$on('oauth:denied', callback);
    });

    beforeEach(function() {
      compile($rootScope, $compile);
    });

    beforeEach(function() {
      spyOn(Endpoint, 'redirect');
    });

    it('shows the text "Denied"', function() {
      result = element.find('.denied').text();
      expect(result).toBe('Access denied. Try again.');
    });

    it('sets the href attribute', function() {
      result = element.find('.denied').click();
      expect(Endpoint.redirect).toHaveBeenCalled();
    });

    it('shows the login link', function() {
      expect(element.find('.logged-out').attr('class')).toMatch('ng-hide');
      expect(element.find('.logged-in').attr('class')).toMatch('ng-hide');
      expect(element.find('.denied').attr('class')).not.toMatch('ng-hide');
    });

    it('fires the oauth:denied event', function() {
      var event = jasmine.any(Object);
      expect(callback).toHaveBeenCalledWith(event);
    });
  });


  describe('with no custom template', function() {

    beforeEach(function() {
      AccessToken.destroy();
    });

    beforeEach(function() {
      compile($rootScope, $compile);
    });

    it('shows the default template', function() {
      expect(element.find('.btn-oauth').text()).toBe('');
    });
  });


  describe('with custom template', function() {

    beforeEach(function() {
      AccessToken.destroy();
    });

    beforeEach(function() {
      compile($rootScope, $compile);
    });

    beforeEach(function() {
      $rootScope.$broadcast('oauth:template:update', 'views/templates/button.html');
      $rootScope.$apply();
    });

    it('shows the button template', function() {
      expect(element.find('.oauth .logged-out').text()).toBe('Login Button');
    });
  });



  describe('with custom authorize path', function() {

    beforeEach(function() {
      element = angular.element(
        '<oauth ng-cloak site="http://example.com"' +
          'client="client-id"' +
          'redirect="http://example.com/redirect"' +
          'authorize-path="/new-authorize-path">Sign In</oauth>'
      );
    });

    beforeEach(function() {
      AccessToken.destroy();
    });

    beforeEach(function() {
      compile($rootScope, $compile);
    });

    it('shows the text "Denied"', function() {
      expect(Endpoint.get()).toMatch('new-authorize-path');
    });
  });
});
