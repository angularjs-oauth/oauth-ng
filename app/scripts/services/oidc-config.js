(function() {
  'use strict';

  angular.module('oauth.oidcConfig', [])
    .factory('OidcConfig', ['Storage', '$http', '$q', OidcConfig]);

  function OidcConfig(Storage, $http, $q) {
    var cache = null;
    return {
      load: load
    };

    function load(scope) {
      if (scope.issuer && scope.wellKnown && scope.wellKnown !== "false") {
        var promise = loadConfig(scope.issuer);
        if (scope.wellKnown === "sync") {
          return promise;
        }
      }
      return $q.when(1);
    }

    function loadConfig(iss) {
      if (cache === null) {
        cache = Storage.get('oidcConfig');
      }
      if (angular.isDefined(cache)) {
        return $q.when(cache);
      } else {
        return loadOpenidConfiguration(iss)
                .then(saveCache)
                .then(loadJwks)
                .then(saveCache);
      }
    }

    function saveCache(o) {
      Storage.set('oidcConfig', cache);
      return o;
    }

    function joinPath(x,y) {
      return x + (x.charAt(x.length - 1) === '/' ? '' : '/') + y;
    }

    function loadOpenidConfiguration(iss) {
      return $http.get(joinPath(iss, ".well-known/openid-configuration")).then(function(res) {
        return cache = res.data;
      });
    }

    function loadJwks(oidcConf) {
      if (oidcConf.jwks_uri) {
        return $http.get(oidcConf.jwks_uri).then(function(res) {
          return oidcConf.jwks = res.data;
        });
      } else {
        return $q.reject("No jwks_uri found.");
      }
    }
  }
})();
