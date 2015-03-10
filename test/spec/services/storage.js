'use strict';

describe('Storage', function() {

  var $sessionStorage, $localStorage, Storage;
  var token    = 'MOCK TOKEN';

  beforeEach(module('oauth'));

  beforeEach(inject(function($injector) { $sessionStorage = $injector.get('$sessionStorage') }));
  beforeEach(inject(function($injector) { $localStorage   = $injector.get('$localStorage') }));
  beforeEach(inject(function($injector) { Storage         = $injector.get('Storage') }));

  it('should use sessionStorage by default', function () {
    expect(Storage.storage).toEqual($sessionStorage);
  });

  describe('#use', function () {

    beforeEach(function () {
      $sessionStorage.$reset();
      $localStorage.$reset();
      Storage.storage = null;
    });

    it('should use sessionStorage when specified', function () {
      Storage.use('sessionStorage');
      expect(Storage.storage).toEqual($sessionStorage);
    });

    it('should use localStorage when specified', function () {
      Storage.use('localStorage');
      expect(Storage.storage).toEqual($localStorage);
    });

  });

  describe('#set', function() {

    beforeEach(function () {
      $sessionStorage.$reset();
      $localStorage.$reset();
    });

    it('should set something in sessionStorage', function () {
      Storage.storage = $sessionStorage;
      Storage.set('token', token);
      expect($sessionStorage.token).toEqual(token);
    });

    it('should set something in sessionStorage', function () {
      Storage.storage = $localStorage;
      Storage.set('token', token);
      expect($localStorage.token).toEqual(token);
    });

  });

  describe('#get', function() {

    beforeEach(function () {
      $sessionStorage.$reset();
      $localStorage.$reset();
    });

    it('should set something in sessionStorage', function () {
      $sessionStorage.token = token
      Storage.storage = $sessionStorage;
      expect(Storage.get('token')).toEqual(token);
    });

    it('should set something in sessionStorage', function () {
      $localStorage.token = token
      Storage.storage = $localStorage;
      expect(Storage.get('token')).toEqual(token);
    });

  });

  describe('#delete', function() {

    beforeEach(function () {
      $sessionStorage.$reset();
      $localStorage.$reset();
    });

    it('should delete the token from the sessionStorage', function () {
      $sessionStorage.token = token;
      Storage.storage = $sessionStorage;
      expect(Storage.delete('token')).toEqual(token);
      expect($sessionStorage.token).not.toBeDefined();
    });

    it('should delete the token from the sessionStorage', function () {
      $localStorage.token = token;
      Storage.storage = $localStorage;
      expect(Storage.delete('token')).toEqual(token);
      expect($localStorage.token).not.toBeDefined();
    });

  });

});
