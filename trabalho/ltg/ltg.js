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
	Scopes.store('LTG', $scope);

	// Variaveis globais para parametros iniciais
	var g_qtdNucleos = g_qtdProcsIniciais = 0;

	// Fila de processos em execução (cores)
	Scopes.get('LTG').processosExecutando = [];
	// Fila de processos aptos
	Scopes.get('LTG').processosAptos = [];
	// Fila de processos abortados
	Scopes.get('LTG').processosAbortados = [];
	// Fila de processos finalizados
	Scopes.get('LTG').processosFinalizados = [];

	// Método de Insertion Sort
	// Semrpe vai trabalhar com uma lista que ja esta ordenada
	// portanto nao precisa ordenar toda a lista.
	function insertionSort(novaLista, listaAtual) {
		var novaFilaOrdenada = [];
		var foiInserido = false;

		if (listaAtual.length > 0) {
			var i; // contador

			// Percore todos os aptos
			for (i = 0; i < listaAtual.length; i++) {
				// Para se o que esta em apto for maior do que o que esta na nova lista
				if (listaAtual[i].deadLine >= novaLista.deadLine) {
					novaFilaOrdenada.push(novaLista);
					foiInserido = true;
					break; // Sai do Loop
				} else {
					// Vai montando igual a fila antiga
					novaFilaOrdenada.push(listaAtual[i]);
				}
			}

			// Termina de preencher com os dados da fila original
			for (var j = i; j < listaAtual.length; j++) {
				novaFilaOrdenada.push(listaAtual[j]);
			}

			// Caso nao tenha sido inserido, é o maior da fila.
			if (!foiInserido) {
				novaFilaOrdenada.push(novaLista);
			}

		} else {
			novaFilaOrdenada.push(novaLista);
		}

		Scopes.get('LTG').processosAptos = novaFilaOrdenada;
	}

	// Método para remover o processo quando acabar sua deadline
	function renovaVerificacaoDoProcesso (processo) {
		var timer = processo.deadLine * 1000;
		setTimeout(function () {
			// Se ainda tiver na fila de aptos quando acabar o deadLine, aborta.
			for (var i = 0; i < Scopes.get('LTG').processosAptos.length; i++) {
				if(Scopes.get('LTG').processosAptos[i].nome == processo.nome) {
					Scopes.get('LTG').processosAptos.splice(i, 1);
					Scopes.get('LTG').processosAbortados.push(processo);
				}
			}
		}, timer);
	}

	// #2 - Método para inicializar escalonador
	Scopes.get('LTG').initLTG = function (qtdNucleos, qtdProcsIniciais) {


		// Define as variaveis globais
		g_qtdNucleos = qtdNucleos;
		g_qtdProcsIniciais = qtdProcsIniciais;

		// Preenche fila de processos em execução (cores) com nenhum valor
		for (var i = 0; i < qtdNucleos; i++) {
			$scope.processosExecutando.push(null);
		}

		// Preenche fila de aptos.
		// Cada processo é um loop
		for (var i = 0; i < qtdProcsIniciais; i++) {
			
			// Gera um randomico pra dizer a duração total do processo [5-15]
			var tempo = Math.floor(Math.random() * 10)+5;

			// Gera um randomico para dizer o valor de deadline do processo [10-20]
			var deadLine = Math.floor(Math.random() * 10)+10;

			// Define a cor dos processos iniciais
			var colorClass = "blue-700";

			var novoProcesso = {id: i, nome: "p"+i, tempo: tempo, deadLine: deadLine, colorClass: colorClass, status: 'aptos'};

			// Insere o processo, ordenado pela deadline
			insertionSort(novoProcesso, Scopes.get('LTG').processosAptos);

		}
	}

	var Processa = function(indice, tempoRestante) {
		// Pega processo que esta no core
		var processo = Scopes.get('LTG').processosExecutando[indice];

		Scopes.get('LTG').processosExecutando[indice].status = 'core';

		// Processa até o tempo do processo acabar
		if (tempoRestante <= 0 || processo.tempo <= 0) {

			// Remove processo do core
			Scopes.get('LTG').processosExecutando[indice] = null;

			// Acabou o processo
			if (processo.tempo <= 0) {
				// Vai pra fila de finallizados
				Scopes.get('LTG').processosFinalizados.push(processo);
			}

			// Busca novo processo para adicionar no core que, agora, está vazio
			Processa.prototype.processaProximo(indice);

		} else {
			var timeOut = (tempoRestante < 1)?tempoRestante*1000:1000;
			// Define o novo valor do tempo do processo.
			// Chama um novo loop de um segundo ou menos.
			setTimeout(function () {
				Scopes.get('LTG').$apply(function () {
					$scope.processosExecutando[indice].tempo -= (timeOut / 1000);
					tempoRestante--;
					new Processa(indice, tempoRestante);
				});
			}, timeOut);
		}
	}

	Processa.prototype.processaProximo = function(indice) {
		var processo = Scopes.get('LTG').processosAptos[0];
		
		// Remove processo da fila de aptos para ninguem pegar
		Scopes.get('LTG').processosAptos.splice(0, 1);

		// Verifica se ainda esta válido
		if (processo.deadLine > 0) {
			// Adiciona processo dessa fila no core
			Scopes.get('LTG').processosExecutando[indice] = processo;
			
			new Processa(indice, processo.tempo);
		} else {
			// Não esta valido, vai para abortados
			Scopes.get('LTG').processosAbortados.push(processo);

			// Busca um outro processo
			Processa.prototype.processaProximo(indice);
		}

	};

	// #3 - Método para iniciar processamento
	Scopes.get('LTG').iniciaProcessamento = function () {
		// Inicia timeouts para cada processo em aptos
		for (var i = 0; i < Scopes.get('LTG').processosAptos.length; i++) {
			renovaVerificacaoDoProcesso(Scopes.get('LTG').processosAptos[i]);
		}

		for (var indiceNucleo = 0; indiceNucleo < g_qtdNucleos; indiceNucleo++) {
			if (Scopes.get('LTG').processosExecutando[indiceNucleo] == null) {
				
				// Adiciona no Core
				Scopes.get('LTG').processosExecutando[indiceNucleo] = Scopes.get('LTG').processosAptos[0];
				// Remove dos aptos
				Scopes.get('LTG').processosAptos.splice(0, 1);

				// Inicia um timeOut pra cada core.
				var tempoRestante = Scopes.get('LTG').processosExecutando[indiceNucleo].deadLine;
				if (Scopes.get('LTG').processosExecutando[indiceNucleo].tempo < tempoRestante) {
					tempoRestante = Scopes.get('LTG').processosExecutando[indiceNucleo].tempo;
				}
				new Processa(indiceNucleo, tempoRestante);

			}
		}

	}

	// #4 - Método para adicionar processos em tempo de execução
	Scopes.get('LTG').adicionaProcesso = function () {
			// Gera um randomico pra dizer a duração total do processo [5-15]
			var tempo = Math.floor(Math.random() * 10)+5;

			// Gera um randomico para dizer o valor de deadline do processo [10-20]
			var deadLine = Math.floor(Math.random() * 10)+10;

			// Define a cor dos processos iniciais
			var colorClass = "red-700";

			var novoProcesso = {id: g_qtdProcsIniciais, nome: "p"+g_qtdProcsIniciais, tempo: tempo, deadLine: deadLine, colorClass: colorClass, status: 'aptos'};

			// Insere o processo, ordenado pela deadline
			insertionSort(novoProcesso, Scopes.get('LTG').processosAptos);

			// Inicia o timer do processo (deadline)
			renovaVerificacaoDoProcesso(novoProcesso);

			// Incrementa tamanho da fila de aptos
			g_qtdProcsIniciais++;
	}

	// #1 - Pegando variaveis da url e inicializando escalonador
	var p1 = new RegExp('[\?&]p1=([^&#]*)').exec(window.location.href)[1];
	var p2 = new RegExp('[\?&]p2=([^&#]*)').exec(window.location.href)[1];
	Scopes.get('LTG').initLTG(p1, p2);
});