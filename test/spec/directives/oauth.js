// TODO set the login template
// beforeEach(module('tpl/tabs.html', 'tpl/pane.html'));
// TODO move this template in tests/templates and make it dry.

//describe('oauth', function() {

  //var $location, $cookies, $httpBackend, $rootScope, AccessToken, Endpoint, element, scope, result, config, callback;

  //var uri      = 'http://example.com/oauth/authorize?response_type=token&client_id=client-id&redirect_uri=http://example.com/redirect&scope=scope&state=/';
  //var fragment = 'access_token=token&token_type=bearer&expires_in=7200&state=/path';
  //var denied   = 'error=access_denied&error_description=error';
  //var headers  = { 'X-XSRF-TOKEN': undefined, 'Accept': 'application/json, text/plain, */*', 'X-Requested-With': 'XMLHttpRequest', 'Authorization': 'Bearer token' }
  //var profile  = { id: '1', fullname: 'Alice Wonderland', email: 'alice@example.com' };

  //beforeEach(module('oauth'));
  //beforeEach(module('templates'));

  //beforeEach(inject(function($injector) { $rootScope   = $injector.get('$rootScope') }));
  //beforeEach(inject(function($injector) { $compile     = $injector.get('$compile') }));
  //beforeEach(inject(function($injector) { $location    = $injector.get('$location') }));
  //beforeEach(inject(function($injector) { $cookies     = $injector.get('$cookies') }));
  //beforeEach(inject(function($injector) { $httpBackend = $injector.get('$httpBackend') }));
  //beforeEach(inject(function($injector) { AccessToken  = $injector.get('AccessToken') }));
  //beforeEach(inject(function($injector) { Endpoint     = $injector.get('Endpoint') }));
  //beforeEach(inject(function($injector) { config       = $injector.get('oauth.config') }));
  //beforeEach(inject(function($injector) { callback     = jasmine.createSpy('callback') }));

  //beforeEach(inject(function($rootScope, $compile) {
    //element = angular.element(
      //'<span class="xyze-widget">' +
        //'<oauth ng-cloak site="http://example.com"' +
          //'client="client-id"' +
          //'redirect="http://example.com/redirect"' +
          //'scope="scope"' +
          //'profile="http://example.com/me"' +
          //'template="views/templates/default.html"' +
          //'storage="cookies">Sign In</oauth>' +
      //'</span>'
    //);
  //}));

  //var compile = function() {
    //scope = $rootScope;
    //$compile(element)(scope);
    //scope.$digest();
  //}


  //describe('when logged in', function() {

    //beforeEach(function() {
      //config.profile = 'http://example.com/me';
    //});

    //beforeEach(function() {
      //$location.hash(fragment);
    //});

    //beforeEach(function() {
      //$httpBackend.whenGET('http://example.com/me', headers).respond(profile);
    //});

    //beforeEach(function() {
      //$rootScope.$on('oauth:success', callback);
    //});

    //beforeEach(function() {
      //compile($rootScope, $compile);
    //});

    //it('shows the link "Logout #{profile.email}"', function() {
      //$httpBackend.flush();
      //result = element.find('.logout').text();
      //expect(result).toBe('Logout Alice Wonderland');
    //});

    //it('removes the fragment', function() {
      //expect($location.hash()).toBe('');
    //});

    //it('shows the logout link', function() {
      //expect(element.find('.login').css('display')).toBe('none');
      //expect(element.find('.logout').css('display')).toBe('');
    //});

    //it('fires the oauth:login event', function() {
      //var event = jasmine.any(Object);
      //var token = AccessToken.get();
      //expect(callback).toHaveBeenCalledWith(event, token);
    //});


    //describe('when refreshes the page', function() {

      //beforeEach(function() {
        //$rootScope.$on('oauth:success', callback);
      //});

      //beforeEach(function() {
        //$location.path('/');
      //});

      //it('keeps being logged in', function() {
        //$httpBackend.flush();
        //result = element.find('.logout').text();
        //expect(result).toBe('Logout Alice Wonderland');
      //});

      //it('shows the logout link', function() {
        //expect(element.find('.login').css('display')).toBe('none');
        //expect(element.find('.logout').css('display')).toBe('');
      //});

      //it('fires the oauth:login event', function() {
        //var event = jasmine.any(Object);
        //var token = AccessToken.get();
        //expect(callback).toHaveBeenCalledWith(event, token);
      //});
    //});


    //describe('when logs out', function() {

      //beforeEach(function() {
        //element.find('.logout').click();
      //});

      //it('shows the login link', function() {
        //expect(element.find('.login').css('display')).toBe('');
        //expect(element.find('.logout').css('display')).toBe('none');
      //});

      //it('fires the oauth:logout event', function() {
        //var event = jasmine.any(Object);
        //var token = AccessToken.get();
        //expect(callback).toHaveBeenCalledWith(event, token);
      //});
    //});
  //});


  //describe('when logged out', function() {

    //beforeEach(function() {
      //$rootScope.$on('oauth:logout', callback);
    //});

    //beforeEach(function() {
      //compile($rootScope, $compile)
    //});

    //beforeEach(function() {
      //spyOn(Endpoint, 'redirect');
    //});

    //it('shows the text "Sing In"', function() {
      //result = element.find('.login').text();
      //expect(result).toBe('Sign In');
    //});

    //it('sets the href attribute', function() {
      //result = element.find('.login').click();
      //expect(Endpoint.redirect).toHaveBeenCalled();
    //});

    //it('shows the login link', function() {
      //expect(element.find('.login').css('display')).toBe('');
      //expect(element.find('.logout').css('display')).toBe('none');
    //});

    //it('fires the oauth:logout event', function() {
      //var event = jasmine.any(Object);
      //expect(callback).toHaveBeenCalledWith(event);
    //});
  //});


  //describe('when denied', function() {

    //beforeEach(function() {
      //$location.hash(denied);
    //});

    //beforeEach(function() {
      //$rootScope.$on('oauth:denied', callback);
    //});

    //beforeEach(function() {
      //compile($rootScope, $compile)
    //});

    //beforeEach(function() {
      //spyOn(Endpoint, 'redirect');
    //});

    //it('shows the text "Denied"', function() {
      //result = element.find('.denied').text();
      //expect(result).toBe('Access denied. Try again.');
    //});

    //it('sets the href attribute', function() {
      //result = element.find('.denied').click();
      //expect(Endpoint.redirect).toHaveBeenCalled();
    //});

    //it('shows the login link', function() {
      //expect(element.find('.login').css('display')).toBe('none');
      //expect(element.find('.logout').css('display')).toBe('none');
      //expect(element.find('.denied').css('display')).toBe('');
    //});

    //it('fires the oauth:denied event', function() {
      //var event = jasmine.any(Object);
      //expect(callback).toHaveBeenCalledWith(event);
    //});
  //});
//});

