# Changelog

## 0.4.2 (Jun 19, 2015)

* Make the code more JSHint friendly
* Fix expiry definition in the access token service 

## 0.4.1 (Jun 11, 2015)

* Add OpenID support

## 0.4.0 (May 26, 2015)

* Fix jshint config file
* Token `expires_in` property is now optional

## 0.3.10 (April 20, 2015)

* Add Storage service

## 0.3.9 (April 14, 2015)

* Add inline annotations for dependency injection

## 0.3.8 (February 06, 2015)

* Upgrade to AngularJS v1.3.12.

## 0.3.6 (Dicember 03, 2014)

* Broadcast event oauth:tokenDestroy after a logout.

## 0.3.5 (November 29, 2014)

* Remove access token and change directive text to 'logout' when token is expired.

## 0.3.3 (November 25, 2014)

* Add Fixed Code method option

## 0.3.2 (November 16, 2014)

* Add Authorization Code method option

## 0.3.1 (November 3, 2014)

* Replace $timeout with $interval #50
* Add broadcast “oath:profile” once profile is retrieved. #51
* Add travis

## 0.3.0 (October 30, 2014)

* Fix bug on access token definition from hash
* Correctly running tests with E2E protractor

## 0.2.8 (August 27, 2014)

* Fix `expries_at` not being set in some situations
* Only use session storage when oAuth hash not in URL
* Only remove oAuth2 tokens from hash

## 0.2.7 (August 26, 2014)

* Fix `expires_at` not being set
* Fix `expired()` calculation

## 0.2.6 (August 14, 2014)

* Remove encoding for OAuth 2.0 scope.

## 0.2.4 (August 13, 2014)

* Remove settings for HTML5 mode
* Add logic to fire the oauth:expired event when the token expires. Before it was raised
only when the request was returning a 401.

## 0.2.2 (July 11, 2014)

* Add new `oauth:authorized` event that omits, at view init time, if user is authorized.
`oauth:login` is fired when the user has completed the login process.
per https://github.com/andreareginato/oauth-ng/issues/16


## 0.2.1 (July 10, 2014)

* Don't default `state` to `$location.url()` per https://github.com/andreareginato/oauth-ng/pull/15#issuecomment-48575585

## 0.2.0 (June 1, 2014)

* Update name from ng-oauth to oauth-ng
* New documentation site andreareginato.github.io/oauth-ng
* Major refactoring
