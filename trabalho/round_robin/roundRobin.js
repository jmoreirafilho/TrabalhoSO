angular.module('view', []);
angular.module('view').controller('viewController', function ($scope) {

	// Variaveis globais para parametros iniciais
	var g_qtdNucleos = g_quantum = g_qtdProcsIniciais = 0;

	// Variaveis globais para fator de cada fila de prioridade
	var g_f0 = 12;
	var g_f1 = 6;
	var g_f2 = 3;

	// Fila de processos em execução (cores)
	$scope.processosExecutando = [];
	// Fila de processos aptos
	$scope.processosAptos = {0: [], 1: [], 2: [], 3: []};
	// Fila de processos abortados
	$scope.processosAbortados = [];
	// Fila de processos finalizados
	$scope.processosFinalizados = [];

	// #2 - Método para inicializar escalonador
	$scope.initRoundRobin = function (qtdNucleos, quantum, qtdProcsIniciais) {

		// Define as variaveis globais
		g_qtdNucleos = qtdNucleos;
		g_quantum = quantum;
		g_qtdProcsIniciais = qtdProcsIniciais;

		// Preenche fila de processos em execução (cores) com nenhum valor
		for (var i = 0; i < qtdNucleos; i++) {
			$scope.processosExecutando.push({nome: ""});
		}

		// Preenche fila de aptos.
		// Cada processo é um loop
		for (var i = 0; i < qtdProcsIniciais; i++) {
			// Gera um randomico pra dizer qual a fila de prioridade esse processo vai pertencer
			var fila = Math.floor(Math.random() * (4));

			// Pega o quantum do processo e multiplica ao valor de seu fator, dependendo de sua
			// prioridade na fila de aptos
			var currentQuantum = quantum;
			switch (fila) {
				case 0:
					currentQuantum *= g_f0;
					break;
				case 1:
					currentQuantum *= g_f1;
					break;
				 case 2 : 
				 	currentQuantum *= g_f2;
				 	break;
			 	// em case 3, f3 = 1. 
			}

			// Adiciona processo na fila de aptos
			$scope.processosAptos[fila].push({nome: "p"+i, fila: fila, quantum: currentQuantum});
		}
	}

	// #3 - Método para iniciar processamento
	$scope.iniciaProcessamento = function () {

	}

	// #4 - Método para adicionar processos em tempo de execução
	$scope.adicionaProcesso = function () {

	}

	// #1 - Pegando variaveis da url e inicializando escalonador
	var p1 = new RegExp('[\?&]p1=([^&#]*)').exec(window.location.href)[1];
	var p2 = new RegExp('[\?&]p2=([^&#]*)').exec(window.location.href)[1];
	var p3 = new RegExp('[\?&]p3=([^&#]*)').exec(window.location.href)[1];
	$scope.initRoundRobin(p1, p2, p3);
});