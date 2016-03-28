(function() {
  'use strict';

  angular.module('oauth.oidcConfig', [])
    .factory('OidcConfig', ['Storage', '$http', '$q', '$log', OidcConfig]);

  function OidcConfig(Storage, $http, $q, $log) {
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
                .then(saveCache, errorLogger);
      }
    }

    function errorLogger(err) {
      $log.error("Could not load OIDC config:", err);
      return $q.reject(err);
    }

    function saveCache(o) {
      Storage.set('oidcConfig', cache);
      return o;
    }

    function joinPath(x,y) {
      return x + (x.charAt(x.length - 1) === '/' ? '' : '/') + y;
    }

    function loadOpenidConfiguration(iss) {
      var configUri = joinPath(iss, ".well-known/openid-configuration");
      return $http.get(configUri).then(function(res) {
        return cache = res.data;
      }, function(err) {
        return $q.reject("Could not get config info from " + configUri + ' . Check the availability of this url.');
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
