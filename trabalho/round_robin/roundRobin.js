angular.module('view', []);
angular.module('view').controller('viewController', function ($scope) {

	$scope.processosExecutando = [];
	$scope.processosAptos = [];

	$scope.initRoundRobin = function (qtdNucleos, quantum, qtdProcsIniciais) {
		for (var i = 0; i < qtdNucleos; i++) {
			$scope.processosExecutando.push({nome: ""});
		}

		for (var i = 0; i < qtdProcsIniciais; i++) {
			$scope.processosAptos.push({nome: "p"+i, quantum: quantum});
		}
	}


	var p1 = new RegExp('[\?&]p1=([^&#]*)').exec(window.location.href)[1];
	var p2 = new RegExp('[\?&]p2=([^&#]*)').exec(window.location.href)[1];
	var p3 = new RegExp('[\?&]p3=([^&#]*)').exec(window.location.href)[1];

	$scope.initRoundRobin(p1, p2, p3);
});