var app = angular.module('view', []);
app.factory('Scopes', function($rootScope) {
	var mem = {};
	return {
		store : function(key, value) {
			mem[key] = value;
		},
		get : function(key) {
			return mem[key];
		}
	};
});

angular.module('view').controller('viewController', function ($scope, Scopes) {

	// Define escopo de execução
	Scopes.store('RoundRobin', $scope);

	// Variaveis globais para parametros iniciais
	var g_qtdNucleos = g_quantum = g_qtdProcsIniciais = 0;

	// Variaveis globais para fator de cada fila de prioridade
	var g_f0 = 2.1;
	var g_f1 = 1.8;
	var g_f2 = 1.5;

	// Indice da fila de prioridade que deve ser pegue
	var g_indiceDaProximaFila = null;

	var g_qtdMiss = 0;

	// Fila de processos em execução (cores)
	Scopes.get('RoundRobin').processosExecutando = [];
	// Fila de processos aptos
	Scopes.get('RoundRobin').processosAptos = {0: [], 1: [], 2: [], 3: []};
	// Fila de processos abortados
	Scopes.get('RoundRobin').processosAbortados = [];
	// Fila de processos finalizados
	Scopes.get('RoundRobin').processosFinalizados = [];

	// #2 - Método para inicializar escalonador
	Scopes.get('RoundRobin').initRoundRobin = function (qtdNucleos, quantum, qtdProcsIniciais) {

		// Define as variaveis globais
		g_qtdNucleos = qtdNucleos;
		g_quantum = quantum;
		g_qtdProcsIniciais = qtdProcsIniciais;

		// Preenche fila de processos em execução (cores) com nenhum valor
		for (var i = 0; i < qtdNucleos; i++) {
			$scope.processosExecutando.push(null);
		}

		// Preenche fila de aptos.
		// Cada processo é um loop
		for (var i = 0; i < qtdProcsIniciais; i++) {
			// Gera um randomico pra dizer qual a fila de prioridade esse processo vai pertencer
			var fila = Math.floor(Math.random() * 4);
			
			// Gera um randomico pra dizer a duração total do processo
			var tempo = Math.floor(Math.random() * 10)+5;

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
			Scopes.get('RoundRobin').processosAptos[fila].push({nome: "p"+i, fila: fila, quantum: Number(currentQuantum), tempo: tempo});
		}
	}

	var Processa = function(indice) {
		var processo = Scopes.get('RoundRobin').processosExecutando[indice];
		var tempo = processo.quantum * 1000;

		setTimeout(function () {
			Scopes.get('RoundRobin').$apply(function () {
				processo.tempo -= processo.quantum;							

				if (processo.tempo <= 0) {
					processo.tempo = 0;
					$scope.processosFinalizados.push(processo);
				}

				if (processo.tempo > 0) {
					Scopes.get('RoundRobin').processosAptos[processo.fila].push(Scopes.get('RoundRobin').processosExecutando[indice]);
				}

				Scopes.get('RoundRobin').processosExecutando[indice] = null;	

			});

			Processa.prototype.processaProximo(indice);
		}, tempo);
	}

	Processa.prototype.processaProximo = function(indice) {
		Processa.prototype.proximaFila();

		Scopes.get('RoundRobin').$apply(function () {
			Scopes.get('RoundRobin').processosExecutando[indice] = Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila][0];
			Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila].splice(0, 1);
		});

		new Processa(indice);


	};

	Processa.prototype.proximaFila = function () {
		if (g_indiceDaProximaFila == null) {
			g_indiceDaProximaFila = 0;
			return;
		}

		g_indiceDaProximaFila++;
			
		if (g_indiceDaProximaFila%4 == 0) {
			g_indiceDaProximaFila = 0;
		}

		if (g_qtdMiss == 4) {
			window.alert("Processo Finalizado!");
		}

		if (Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila].length <= 0) {
			Processa.prototype.proximaFila();
			g_qtdMiss++;
		}
	}

	// #3 - Método para iniciar processamento
	Scopes.get('RoundRobin').iniciaProcessamento = function () {
		for (var indiceNucleo = 0; indiceNucleo < g_qtdNucleos; indiceNucleo++) {
			if (Scopes.get('RoundRobin').processosExecutando[indiceNucleo] == null) {

				Processa.prototype.proximaFila();

				Scopes.get('RoundRobin').processosExecutando[indiceNucleo] = Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila][0];
				Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila].splice(0, 1);

				new Processa(indiceNucleo);

			}
		}
	}

	// #4 - Método para adicionar processos em tempo de execução
	Scopes.get('RoundRobin').adicionaProcesso = function () {

	}

	// #1 - Pegando variaveis da url e inicializando escalonador
	var p1 = new RegExp('[\?&]p1=([^&#]*)').exec(window.location.href)[1];
	var p2 = new RegExp('[\?&]p2=([^&#]*)').exec(window.location.href)[1];
	var p3 = new RegExp('[\?&]p3=([^&#]*)').exec(window.location.href)[1];
	Scopes.get('RoundRobin').initRoundRobin(p1, p2, p3);
});