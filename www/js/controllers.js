angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope, $cordovaToast, $http, Contacts, $q) {

  $scope.total = 0;
  $scope.$on("$ionicView.enter", function() {
    Contacts.unchecked().then(function(contacts) {
      $scope.total = contacts.length;
    });
  });

  $scope.stopScan = true;
  $scope.$watch('stopScan', function() {
    $scope.actionText = $scope.stopScan ? 'Start' : 'Stop';
  });

  var country_code = 'MY';
  window.plugins.sim.getSimInfo(function(sim_data) {
    country_code = sim_data.countryCode.toUpperCase();
  });

  $scope.api = {};
  $scope.api.key = window.localStorage.getItem('api_key');
  $scope.api.secret = window.localStorage.getItem('api_secret');
  $scope.ScanContacts = function() {
    window.localStorage.setItem('api_key', $scope.api.key);
    window.localStorage.setItem('api_secret', $scope.api.secret);
    $scope.stopScan = !$scope.stopScan;
    if(!$scope.stopScan) {
      var promise = Contacts.unchecked().then(function(contacts) {
        $scope.total = contacts.length;
        return contacts.reduce(function (p, contact) {
            return p.then(function() {
                return $http.post('https://api.nexmo.com/number/lookup/json', {api_key: $scope.api.key, api_secret: $scope.api.secret, number: contact.number, country: country_code})
                  .then(function(res) {
                    res = res.data;
                    if(res.status == 0) {
                      Contacts.update(contact.id, {country_code: res.current_carrier.country, carrier_name: res.current_carrier.name, number_type: res.current_carrier.network_type}).then(function() {
                        $scope.total--;
                      });
                      $cordovaToast.showShortBottom('Credit: '+res.remaining_balance);
                    } else if(res.status != 3) {
                      $cordovaToast.showShortBottom(res.status_message);
                      $scope.stopScan = true;
                      throw new Error('scan stopped');
                    }
                    if($scope.stopScan || res.remaining_balance < 0.01) {
                      $scope.stopScan = true;
                      throw new Error('scan stopped');
                    }
                  }, function(err) {
                    $scope.stopScan = true;
                    $cordovaToast.showShortBottom('Server error. Please try again.');
                    throw new Error(err);
                  });
            });
        }, $q.when());
      });
      promise.then(function() {
        $scope.stopScan = true;
      });
    }
  };
})

.controller('ChatsCtrl', function($scope, Chats, Contacts) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  $scope.chats = [];
  Contacts.all().then(function(contacts) {
    $scope.chats = contacts;
  });
  $scope.remove = function(chat) {
    Chats.remove(chat);
  };

  var page = 0; $scope.noMoreItemsAvailable = false;
  $scope.loadMore = function() {
    if(!$scope.noMoreItemsAvailable)
      page++;
    Contacts.all({page: page}).then(function(contacts) {
      if(contacts.length > 0)
        $scope.chats = $scope.chats.concat(contacts);
      else
        $scope.noMoreItemsAvailable = true;
      $scope.$broadcast('scroll.infiniteScrollComplete');
    });
  }
})

.controller('ChatDetailCtrl', function($scope, $stateParams, Chats) {
  $scope.chat = Chats.get($stateParams.chatId);
})

.controller('AccountCtrl', function($scope) {
  $scope.settings = {
    enableFriends: true
  };
});
