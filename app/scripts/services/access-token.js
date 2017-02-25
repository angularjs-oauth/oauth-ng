'use strict';

var accessTokenService = angular.module('oauth.accessToken', []);

accessTokenService.factory('AccessToken', ['Storage', '$rootScope', '$http', '$q', '$location', '$interval', '$timeout', 'IdToken', function(Storage, $rootScope, $http, $q, $location, $interval, $timeout, IdToken) {

    var service = {
            token: null,
            typedLogin: "",
            typedPassword: "",
            scope: "",
            runExpired: null
        },
        hashFragmentKeys = [
            //Oauth2 keys per http://tools.ietf.org/html/rfc6749#section-4.2.2
            'access_token', 'token_type', 'expires_in', 'scope', 'state',
            'error', 'error_description',
            //Additional OpenID Connect key per http://openid.net/specs/openid-connect-core-1_0.html#ImplicitAuthResponse
            'id_token'
        ];
    var expiresAtEvent = null;
    var refreshTokenUri = null;

    /**
     * Returns the access token.
     */
    service.get = function() {
        return this.token;
    };

    /**
     * Sets and returns the access token. It tries (in order) the following strategies:
     * - Get the token using the code in the url
     * - takes the token from the fragment URI
     * - takes the token from the sessionStorage
     */
    service.set = function(scope) {
        refreshTokenUri = scope.site + scope.tokenPath;
        this.runExpired = scope.runExpired;

        if ($location.search().code) {
            return this.setTokenFromCode($location.search(), scope);
        }

        this.setTokenFromString($location.hash());

        //If hash is present in URL always use it, cuz its coming from oAuth2 provider redirect

        var deferred = $q.defer();

        if (this.token) {
            deferred.resolve(this.token);
        } else {
            deferred.reject();
        }

        if (null === service.token) {
            return setTokenFromSession();
        } else {
            return deferred.promise;
        }
    };

    service.setTokenFromPassword = function(scope, token, typedLogin, typedPassword, oauthScope) {
        this.runExpired = scope.runExpired;
        if (typedLogin && typedPassword && oauthScope) {
            service.typedLogin = typedLogin;
            service.typedPassword = typedPassword;
            service.scope = oauthScope;
        }
        setToken(token);
        $rootScope.$broadcast('oauth:login', token);
    }

    /**
     * Delete the access token and remove the session.
     * @returns {null}
     */
    service.destroy = function() {
        cancelExpiresAtEvent();
        Storage.delete('token');
        this.token = null;
        return this.token;
    };

    /**
     * Tells if the access token is expired.
     */
    service.expired = function() {
        return (this.token && this.token.expires_at && new Date(this.token.expires_at) < new Date());
    };

    service.setTokenFromCode = function(search, scope) {
        return $http({
            method: "POST",
            url: scope.site + scope.tokenPath,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            transformRequest: function(obj) {
                var str = [];
                for (var p in obj)
                    str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                return str.join("&");
            },
            data: {
                grant_type: "authorization_code",
                code: search.code,
                redirect_uri: scope.redirectUri,
                client_id: scope.clientId
            }
        }).then(function(result) {
            setToken(result.data);
            $rootScope.$broadcast('oauth:login', service.token);
            $location.url($location.path());
        });
    }

    /**
     * Get the access token from a string and save it
     * @param hash
     */
    service.setTokenFromString = function(hash) {
        var params = getTokenFromString(hash);

        if (params) {
            removeFragment();
            setToken(params);
            // We have to save it again to make sure expires_at is set
            //  and the expiry event is set up properly
            setToken(this.token);
            $rootScope.$broadcast('oauth:login', service.token);
        }
    };

    /**
     * updates the expiration of the token
     */
    service.updateExpiry = function(newExpiresIn) {
        this.token.expires_in = newExpiresIn;
        setExpiresAt();
    };

    service.forceRefresh = function(connect) {
        refreshToken(connect);
    };

    /* * * * * * * * * *
     * PRIVATE METHODS *
     * * * * * * * * * */

    /**
     * Set the access token from the sessionStorage.
     */
    var setTokenFromSession = function() {
        var params = Storage.get('token');
        if (params) {
            setToken(params);
            if (!params.refresh_token) {
                var deferred = $q.defer();
                deferred.resolve(params);
                $rootScope.$broadcast('oauth:login', params);
                return deferred.promise;
            } else {
                return refreshToken(true);
            }
        } else {
            var deferred = $q.defer();
            deferred.reject();
            return deferred.promise;
        }
    };

    var refreshToken = function(connect) {
        if (service.token && service.token.refresh_token) {
            return $http({
                method: "POST",
                url: refreshTokenUri,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                transformRequest: function(obj) {
                    var str = [];
                    for (var p in obj)
                        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                    return str.join("&");
                },
                data: {
                    grant_type: "refresh_token",
                    refresh_token: service.token.refresh_token
                }
            }).then(function(result) {
                angular.extend(service.token, result.data);
                setExpiresAt();
                setTokenInSession();
                if (connect) {
                    $rootScope.$broadcast('oauth:login', service.token);
                } else {
                    $rootScope.$broadcast('oauth:refresh', service.token);
                }
                return result.data;
            }, function(error) {
                if (!!service.typedLogin && !!service.typedPassword) {
                    return reconnect();
                } else {
                    cancelExpiresAtEvent();
                    Storage.delete('token');
                    $rootScope.$broadcast('oauth:expired');
                    service.runExpired();
                }
            });
        } else {
            var deferred = $q.defer();
            deferred.reject();
            return deferred.promise;
        }
    };

    var reconnect = function() {
        return $http({
            method: "POST",
            url: refreshTokenUri,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            transformRequest: function(obj) {
                var str = [];
                for (var p in obj)
                    str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                return str.join("&");
            },
            data: {
                grant_type: "password",
                username: service.typedLogin,
                password: service.typedPassword,
                scope: service.scope
            }
        }).then(function(result) {
            angular.extend(service.token, result.data);
            setTokenInSession();
            $rootScope.$broadcast('oauth:refresh', service.token);
        }, function() {
            $rootScope.$broadcast('oauth:denied');
        });
    };

    /**
     * Set the access token.
     *
     * @param params
     * @returns {*|{}}
     */
    var setToken = function(params) {
        service.token = service.token || {}; // init the token
        angular.extend(service.token, params); // set the access token params
        setTokenInSession(); // save the token into the session
        setExpiresAt();
        setExpiresAtEvent(); // event to fire when the token expires

        return service.token;
    };

    /**
     * Parse the fragment URI and return an object
     * @param hash
     * @returns {{}}
     */
    var getTokenFromString = function(hash) {
        var params = {},
            regex = /([^&=]+)=([^&]*)/g,
            m;

        while ((m = regex.exec(hash)) !== null) {
            params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
        }

        // OpenID Connect
        if (params.id_token && !params.error) {
            IdToken.validateTokensAndPopulateClaims(params);
            return params;
        }

        // Oauth2
        if (params.access_token || params.error) {
            return params;
        }
    };

    /**
     * Save the access token into the session
     */
    var setTokenInSession = function() {
        Storage.set('token', service.token);
    };

    /**
     * Set the access token expiration date (useful for refresh logics)
     */
    var setExpiresAt = function() {
        if (!service.token) {
            return;
        }
        if (typeof(service.token.expires_in) !== 'undefined' && service.token.expires_in !== null) {
            var expires_at = new Date();
            expires_at.setSeconds(expires_at.getSeconds() + parseInt(service.token.expires_in) - 60); // 60 seconds less to secure browser and response latency
            service.token.expires_at = expires_at;
        } else {
            service.token.expires_at = null;
        }
    };


    /**
     * Set the interval at which the expired event is fired
     */
    var setExpiresAtEvent = function() {
        // Don't bother if there's no expires token
        if (typeof(service.token.expires_at) === 'undefined' || service.token.expires_at === null) {
            return;
        }
        cancelExpiresAtEvent();
        var time = (new Date(service.token.expires_at)) - (new Date());
        if (time && time > 0 && time <= 2147483647) {
            if (service.token.refresh_token) {
                expiresAtEvent = $interval(function() {
                    refreshToken();
                }, time);
            } else {
                expiresAtEvent = $timeout(function() {
                    $rootScope.$broadcast('oauth:expired');
                    service.runExpired();
                }, time, 1);
            }
        }
    };

    var cancelExpiresAtEvent = function() {
        if (expiresAtEvent) {
            if (service.token.refresh_token) {
                $interval.cancel(expiresAtEvent);
            } else {
                $timeout.cancel(expiresAtEvent);
            }
            expiresAtEvent = undefined;
        }
    };

    /**
     * Remove the oAuth2 pieces from the hash fragment
     */
    var removeFragment = function() {
        var curHash = $location.hash();
        angular.forEach(hashFragmentKeys, function(hashKey) {
            var re = new RegExp('&' + hashKey + '(=[^&]*)?|^' + hashKey + '(=[^&]*)?&?');
            curHash = curHash.replace(re, '');
        });

        $location.hash(curHash);
    };

    return service;

}]);
