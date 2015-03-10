'use strict';

var storageService = angular.module('oauth.storage', ['ngStorage']);

storageService.factory('Storage', function($rootScope, $sessionStorage, $localStorage){

    var service = {
        storage: $sessionStorage // By default
    };

    /**
     * Deletes the item from storage,
     * Returns the item's previous value
     */
    service.delete = function (name) {
        var stored = this.get(name);
        delete this.storage[name];
        return stored;
    };

    /**
     * Returns the item from storage
     */
    service.get = function (name) {
        return this.storage[name];
    };

    /**
     * Sets the item in storage to the value specified
     * Returns the item's value
     */
    service.set = function (name, value) {
        this.storage[name] = value;
        return this.get(name);
    };

    /**
     * Change the storage service being used
     */
    service.use = function (storage) {
        if (storage === 'sessionStorage') {
            this.storage = $sessionStorage;
        } else if (storage === 'localStorage') {
            this.storage = $localStorage;
        }
    };

    return service;
});