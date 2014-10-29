# Changelog

## 0.2.9 (August 27, 2014)

* Correctly running tests with E2E protractor

## 0.2.8 (August 27, 2014)

* Fixed `expries_at` not being set in some situations
* Only use session storage when oAuth hash not in URL
* Only remove oAuth2 tokens from hash

## 0.2.7 (August 26, 2014)

* Fixed `expires_at` not being set
* Fixed `expired()` calculation

## 0.2.6 (August 14, 2014)

* Removed encoding for OAuth 2.0 scope.

## 0.2.4 (August 13, 2014)

* Removed settings for HTML5 mode
* Added logic to fire the oauth:expired event when the token expires. Before it was raised
only when the request was returning a 401.

## 0.2.2 (July 11, 2014)

* Add new `oauth:authorized` event that omits, at view init time, if user is authorized.
`oauth:login` is fired when the user has completed the login process.
per https://github.com/andreareginato/oauth-ng/issues/16


## 0.2.1 (July 10, 2014)

* Don't default `state` to `$location.url()` per https://github.com/andreareginato/oauth-ng/pull/15#issuecomment-48575585

## 0.2.0 (June 1, 2014)

* Updated name from ng-oauth to oauth-ng
* New documentation site andreareginato.github.io/oauth-ng
* Major refactoring
