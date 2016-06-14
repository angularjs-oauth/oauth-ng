'use strict';

var storageService = angular.module('oauth.storage', ['ngStorage']);

storageService.factory('Storage', ['$rootScope', '$sessionStorage', '$localStorage', '$cookies', function($rootScope, $sessionStorage, $localStorage, $cookies){

  var service = {
    type:'localStorage',
    storage: $sessionStorage // By default
  };

  /**
   * Deletes the item from storage,
   * Returns the item's previous value
   */
  service.delete = function (name) {
    var stored = this.get(name);
    if (this.type === 'cookieStorage') {
      this.storage.remove(name);
    } else {
      delete this.storage[name];
    }
    return stored;
  };

  /**
   * Returns the item from storage
   */
  service.get = function (name) {
    return (this.type === 'cookieStorage')?this.storage.getObject(name):this.storage[name];
  };

  /**
   * Sets the item in storage to the value specified
   * Returns the item's value
   */
  service.set = function (name, value) {
    if (this.type === 'cookieStorage') {
      this.storage.putObject(name, value)
    } else {
      this.storage[name] = value;
    }
    return this.get(name);
  };

  /**
   * Change the storage service being used
   */
  service.use = function (storage) {
    this.type = storage;
    if (storage === 'sessionStorage') {
      this.storage = $sessionStorage;
    } else if (storage === 'localStorage') {
      this.storage = $localStorage;
    } else if (storage === 'cookieStorage') {
      this.storage = $cookies;
    }
  };

  return service;
}]);
