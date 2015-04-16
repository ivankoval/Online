/**
 * Created by IvanK on 3/23/2015.
 */

'use strict';

var app = angular.module('Online', ['pubnub.angular.service', 'n3-line-chart']);

app.config(function($locationProvider) {
   $locationProvider.html5Mode(true);
});

app.controller('JoinCtrl', function($rootScope, $scope, PubNub) {
        PubNub.init({
        publish_key: 'pub-c-8a5790d8-7f4c-4895-84d9-7efe73f310de',
        subscribe_key: 'sub-c-05de75e4-d22c-11e4-95a3-0619f8945a4f'
    });
});

app.controller('ChatCtrl', function($rootScope, $scope, PubNub) {
    var self = this;
    this.data = '';
    this.historyData = '';

    $scope.pubnubHist = function() {
        MTGOX.history.full({
            limit: 500,
            channel: "real_time",
            data: function(message) {
                self.historyData = message;
                $scope.$apply();
            },
            error: function(error) {console.log(error)}
        });

    };

    $scope.subscribe = function() {
        PubNub.ngSubscribe({ channel: "real_time"});

        $rootScope.$on(PubNub.ngMsgEv("real_time"), function(event, payload) {
            self.data = payload.message;
            $scope.$apply();
        });
    }
});

app.controller('UsersController', ['$http', '$location', '$rootScope', function($http, $location, $rootScope) {
    //var self = this;
    //this.groupId = $location.search()['groupId'];
    //this.groupUsers = [];
    $rootScope.groupId = $location.search()['groupId'];
    $rootScope.groupUsers = [];
    $rootScope.preLoader = false;

    var config = {headers:  {
            'X-Parse-Application-Id': 'SSzU4YxI6Z6SwvfNc2vkZhYQYl86CvBpd3P2wHF1',
            'X-Parse-REST-API-Key': 'pKDap5jqe7lyBG5vTRgvTz7t8AiRWXpMYbuS2oak'
        }
    };

    $http.get('https://api.parse.com/1/classes/UserLink?where=%7B%22groupId%22%3A%7B%22%24in%22%3A%5B%22'
    + $rootScope.groupId + '%22%5D%7D%7D', config).success(function(data){
        for(var i = 0; i < data.results.length; i++) {
            var userId = data.results[i]['userId'];
            $http.get('https://api.parse.com/1/users/' + userId, config).success(function(data) {
                $rootScope.groupUsers.push({userId: data.objectId, email: data.email});
            });
        }
    });
}]);

app.directive("appChart", function() {
   return {
       restrict: 'E',
       scope: {
           user: '=',
           chat: '='
       },
       templateUrl: 'online/app-chart.html',
       controller: function($scope, $timeout, $interval, $rootScope) {

           $scope.data = [
           ];

           $scope.options = {
               axes: {
                   x: {labelFunction: function(value) {return moment(value - moment(value).startOf('day')).format('h:mm')}, min: 0, max: 0, ticks: []},
                   y: {type: 'linear', min: 40, max: 190, ticks: 5},
                   y2: {type: 'linear', min: 0, max: 3000, ticks: 5}
               },
               series: [
                   {y: 'hr', color: 'blue', label: 'Heart rate', thickness: '2px'},
                   {y: 'stress', axis: 'y2', color: 'red', label: 'Stress value', thickness: '2px'}
               ],
               lineMode: 'linear',
               tension: 0.7,
               tooltip: {mode: 'none'},
               drawDots: false
           };

           $scope.hr = '';
           $scope.stress = '';
           $scope.lastActive = 0;
           $scope.activeAgo = 0;
           $scope.isActive = false;
           $scope.initState = false;

           $interval(function() {
               $scope.isActive = Date.now() - $scope.lastActive < 10000;
               if(!$scope.isActive) {
                   $scope.activeAgo = moment($scope.lastActive).fromNow();
               }
           }, 5000);

           $scope.$watch("chat.historyData", function() {
               $timeout(function() {
                   for(var i = $scope.chat.historyData.length - 1; i >= 0 ; --i) {
                       var obj = $scope.chat.historyData[i];
                       if($scope.user.userId == obj.userId) {
                           $scope.data.push({x: obj.time, hr: obj.HR, stress: obj.stress});
                           if ($scope.data.length > 300) {
                               $scope.data.shift();
                           }
                       }
                   }
                   $scope.options.axes.x.min = $scope.data[0].x;
                   $scope.options.axes.x.max = $scope.data[$scope.data.length-1].x;
                   $scope.options.axes.x.ticks = [$scope.data[0].x, $scope.data[Math.round($scope.data.length/2)-1].x, $scope.data[$scope.data.length-1].x];
               });
           });

           $scope.$watch("chat.data", function() {
                $timeout(function() {
                    if($scope.user.userId == $scope.chat.data.userId){

                        $scope.lastActive = $scope.chat.data.time;
                        $scope.hr = $scope.chat.data.HR;
                        $scope.stress = $scope.chat.data.stress;

                        $scope.data.push({x: $scope.chat.data.time, hr: $scope.chat.data.HR,
                            stress: $scope.chat.data.stress});
                        if($scope.data.length > 300) {
                            $scope.data.shift();
                        }

                        $scope.options.axes.x.min = $scope.data[0].x;
                        $scope.options.axes.x.max = $scope.data[$scope.data.length-1].x;
                        $scope.options.axes.x.ticks = [$scope.data[0].x, $scope.data[Math.round($scope.data.length/2)-1].x,
                            $scope.data[$scope.data.length-1].x];
                        $rootScope.preLoader = true;
                    }
                }, 5000);
            });
       },
       controllerAt: 'chat'
   }
});

app.directive("groupDescription", function() {
    return {
        restrict: 'E',
        templateUrl: 'online/group-description.html',
        controller: function($rootScope, $scope, $http) {
            $scope.groupId = $rootScope.groupId;
            $scope.groupName = '';
            $scope.groupDesc = '';

            var config = {headers:  {
                'X-Parse-Application-Id': 'SSzU4YxI6Z6SwvfNc2vkZhYQYl86CvBpd3P2wHF1',
                'X-Parse-REST-API-Key': 'pKDap5jqe7lyBG5vTRgvTz7t8AiRWXpMYbuS2oak'
                }
            };

            $http.get('https://api.parse.com/1/classes/UserGroup?where=%7B%22objectId%22%3A%7B%22%24in%22%3A%5B%22'
            + $scope.groupId + '%22%5D%7D%7D', config).success(function(data){
                $scope.groupName = data.results[0].name;
                $scope.groupDesc = data.results[0].description;
            });

        },
        controllerAt: 'description'
    }
});

app.directive("preLoader", function() {
    return {
        restrict: 'E',
        templateUrl: 'online/pre-loader.html',
        controller: function($rootScope, $scope, $interval) {
            $scope.pre =  $rootScope.preLoader;
            $scope.$watch($rootScope.preLoader, function() {
                $interval(function() {
                    $scope.pre = $rootScope.preLoader;
                });
            });
        },
        controllerAt: 'loader'
    }
});