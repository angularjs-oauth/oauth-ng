# Changelog

## 0.2.2 (July 11, 2014)

* Add new `oauth:authorized` event that omits, at view init time, if user is authorized.  `oauth:login` is fired when the user has completed the login process. per https://github.com/andreareginato/oauth-ng/issues/16


## 0.2.1 (July 10, 2014)

* Don't default `state` to `$location.url()` per https://github.com/andreareginato/oauth-ng/pull/15#issuecomment-48575585

## 0.2.0 (June 1, 2014)

* Updated name from ng-oauth to oauth-ng
* New documentation site andreareginato.github.io/oauth-ng
* Major refactoring
