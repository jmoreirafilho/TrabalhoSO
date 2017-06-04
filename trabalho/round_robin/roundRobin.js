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
	var g_qtdNucleos = g_quantum = g_qtdProcsIniciais = g_tamMemmoriaLivre = g_tamMemmoriaTotal = 0;

	// Variaveis globais para fator de cada fila de prioridade
	var g_f0 = 2.1;
	var g_f1 = 1.8;
	var g_f2 = 1.5;

	// Indice da fila de prioridade que deve ser pegue
	var g_indiceDaProximaFila = null;

	// Algoritmo utilizado
	var g_algoritmo = "";

	// Fila de processos em execução (cores)
	Scopes.get('RoundRobin').processosExecutando = [];
	// Blocos de memória
	Scopes.get('RoundRobin').memoria = [];
	// Fila de processos aptos
	Scopes.get('RoundRobin').processosAptos = {0: [], 1: [], 2: [], 3: []};
	// Fila de processos finalizados
	Scopes.get('RoundRobin').processosFinalizados = [];
	// Fila de processos abortados
	Scopes.get('RoundRobin').processosAbortados = [];

	// #2 - Método para inicializar escalonador
	Scopes.get('RoundRobin').initRoundRobin = function (qtdNucleos, quantum, qtdProcsIniciais, tamanho, algoritmo) {

		Scopes.get('RoundRobin').quantumF0 = g_f0 * quantum;
		Scopes.get('RoundRobin').quantumF1 = g_f1 * quantum;
		Scopes.get('RoundRobin').quantumF2 = g_f2 * quantum;
		Scopes.get('RoundRobin').quantumF3 = quantum;

		// Inicializa classe de gerenciamento de memória
		Fit(algoritmo, tamanho);

		// Define as variaveis globais
		g_qtdNucleos = qtdNucleos;
		g_quantum = quantum;
		g_qtdProcsIniciais = qtdProcsIniciais;
		g_tamMemmoriaLivre = tamanho;
		g_tamMemmoriaTotal = tamanho;
		g_algoritmo = algoritmo;

		// Preenche fila de processos em execução (cores) com nenhum valor
		for (var i = 0; i < qtdNucleos; i++) {
			Scopes.get('RoundRobin').processosExecutando.push(null);
		}

		// Preenche memória
		Scopes.get('RoundRobin').memoria.tamLivre = g_tamMemmoriaLivre;
		Scopes.get('RoundRobin').memoria.tamTotal = g_tamMemmoriaTotal;
		Scopes.get('RoundRobin').memoria.blocos = [];

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

			var colorClass = "blue-200";

			switch (fila) {
				case 0:
					colorClass = "blue-900";
					currentQuantum *= g_f0;
					break;
				case 1:
					colorClass = "blue-700";
					currentQuantum *= g_f1;
					break;
				 case 2 : 
					colorClass = "blue-500";
				 	currentQuantum *= g_f2;
				 	break;
			 	// em case 3, f3 = 1. 
			}

			// Gera um randomico para o tamanho do processo
			var tamanho = Math.floor(Math.random() * 992)+32;

			// Adiciona processo na fila de aptos
			Scopes.get('RoundRobin').processosAptos[fila].push({
				id: i, 
				nome: "p"+i, 
				fila: fila, 
				quantum: Number(currentQuantum), 
				tempo: tempo, 
				colorClass: colorClass, 
				processamentos: Number(0),
				tamanho: tamanho,
				probNovaRequisicao: Math.floor(Math.random() * tempo),
				idMemoria: null
			});

		}
	}

	var Processa = function(indice, tempoRestante) {
		// Pega processo que esta no core
		var processo = Scopes.get('RoundRobin').processosExecutando[indice];


		// Se tiver 0 de tempo restante de Qauntum, deve jogar o processo
		// em finalizados ou de volta pra sua fila de prioridade
		if (tempoRestante <= 0 || processo.tempo <= 0) {

			// Acabou o processo
			if (processo.tempo <= 0) {
				// Vai pra fila de finallizados
				Scopes.get('RoundRobin').processosFinalizados.push(processo);
			}

			// Ainda não acabou o processo
			if (processo.tempo > 0) {
				// Vai pra fila de aptos novamente
				Scopes.get('RoundRobin').processosAptos[processo.fila].push(Scopes.get('RoundRobin').processosExecutando[indice]);
			}

			// Remove processo do core
			Scopes.get('RoundRobin').processosExecutando[indice] = null;

			// Remove processo da memoria
			Scopes.get('RoundRobin').memoria.blocos[processo.idMemoria].status = "livre";
			Fit.prototype.desalocaMemoria(processo.idMemoria);

			// Busca novo processo para adicionar no core que, agora, está vazio
			Processa.prototype.processaProximo(indice);

		} else {
			var timeOut = (tempoRestante < 1)?tempoRestante*1000:1000;
			// Define o novo valor do tempo do processo.
			// Chama um novo loop de um segundo ou menos.
			setTimeout(function () {
				Scopes.get('RoundRobin').$apply(function () {
					$scope.processosExecutando[indice].tempo -= (timeOut / 1000);
					tempoRestante--;
					new Processa(indice, tempoRestante);
				});
			}, timeOut);
		}
	}

	Processa.prototype.processaProximo = function(indice) {
		// Busca proximo indice do processo na fila de prioridade
		Processa.prototype.proximaFila();

		// Se a fila buscada não tiver mais nenhum processo, verifica se os cores
		// estão vazios
		if(Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila].length <= 0) {
			var aindaTemAlgumProcesso = false;
			for (var i = 0; i < g_qtdNucleos; i++) {
				// Se algum core nao estiver vazio, ainda tem algo processando
				if (Scopes.get('RoundRobin').processosExecutando[i] != null) {
					aindaTemAlgumProcesso = true;
				}
			}

			// Se ainda tiver algum processo, o metodo se chama.
			if (aindaTemAlgumProcesso) {
				Processa.prototype.processaProximo(indice);
				return;
			}
		}

		// Incrementa contador de quantas vezes foi processado
		Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila][0].processamentos++;
		// Adiciona processo dessa fila no core
		Scopes.get('RoundRobin').processosExecutando[indice] = Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila][0];
		// Remove processo da fila de aptos
		Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila].splice(0, 1);

		new Processa(indice, Scopes.get('RoundRobin').processosExecutando[indice].quantum);
	};

	Processa.prototype.proximaFila = function () {
		// Se for o primeiro processo, seta o indice para 0 e sai
		if (g_indiceDaProximaFila == null) {
			g_indiceDaProximaFila = 0;
			return;
		}

		// Incrementa o indice
		g_indiceDaProximaFila++;
			
		// Se for um indice divisivel por 4, significa que é um indice de uma
		// fila de prioridade que nao existe. Zera o indice, para ir para a
		// primeira fila de prioridade.
		if (g_indiceDaProximaFila%4 == 0) {
			g_indiceDaProximaFila = 0;
		}

		// Se não tiver nenhum processo nessa fila de aptos, busca em outra fila.
		if (Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila].length == 0) {
			Processa.prototype.proximaFila();
		}
	}

	// #3 - Método para iniciar processamento
	Scopes.get('RoundRobin').iniciaProcessamento = function () {
		for (var indiceNucleo = 0; indiceNucleo < g_qtdNucleos; indiceNucleo++) {
			if (Scopes.get('RoundRobin').processosExecutando[indiceNucleo] == null) {
				Processa.prototype.proximaFila();

				// Pega processo atual em uma variavel, para simplificar
				var processoAtual = Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila][0];

				var verificacaoDeMemoria = Fit.prototype.temMemoriaDisponivel(processoAtual);
				
				var bloco = {tamanho: processoAtual.tamanho, status: "ocupado", colorClass: processoAtual.colorClass};

				var idMemoria = null;
				
				if (verificacaoDeMemoria === true) {
					// Cria novo Bloco com o tamanho desse processo
					Scopes.get('RoundRobin').memoria.blocos.push(bloco);
					//Replica no Fit
					Fit.prototype.adicionaBloco(bloco);
					// Busca indice da memoria
					idMemoria = Scopes.get('RoundRobin').memoria.blocos.length - 1;
				} else if (verificacaoDeMemoria !== false){
					// Adiciona no indice do bloco que veio
					Scopes.get('RoundRobin').memoria.blocos[verificacaoDeMemoria] = bloco;
					idMemoria = verificacaoDeMemoria;
				} else {
					// aborta
					Scopes.get('RoundRobin').processosAbortados.push(processoAtual);
					continue;
				}
				Scopes.get('RoundRobin').memoria.tamLivre -= processoAtual.tamanho;

				// Incrementa contador de quantas vezes foi processado
				Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila][0].processamentos++;
				Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila][0].idMemoria = idMemoria;
				
				Scopes.get('RoundRobin').processosExecutando[indiceNucleo] = Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila][0];
				Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila].splice(0, 1);


				var tempoRestante = Scopes.get('RoundRobin').processosExecutando[indiceNucleo].quantum;

				if (Scopes.get('RoundRobin').processosExecutando[indiceNucleo].tempo < tempoRestante) {
					tempoRestante = Scopes.get('RoundRobin').processosExecutando[indiceNucleo].tempo;
				}

				// Inicia um timeOut pra cada core.
				new Processa(indiceNucleo, tempoRestante);
			}
		}
	}

	// #4 - Método para adicionar processos em tempo de execução
	Scopes.get('RoundRobin').adicionaProcesso = function () {
			// Gera um randomico pra dizer qual a fila de prioridade esse processo vai pertencer
			var fila = Math.floor(Math.random() * 4);
			
			// Gera um randomico pra dizer a duração total do processo
			var tempo = Math.floor(Math.random() * 10)+5;

			// Pega o quantum do processo e multiplica ao valor de seu fator, dependendo de sua
			// prioridade na fila de aptos
			var currentQuantum = g_quantum;

			var colorClass = "red-200";

			switch (fila) {
				case 0:
					colorClass = "red-900";
					currentQuantum *= g_f0;
					break;
				case 1:
					currentQuantum *= g_f1;
					colorClass = "red-700";
					break;
				 case 2 : 
					colorClass = "red-500";
				 	currentQuantum *= g_f2;
				 	break;
			 	// em case 3, f3 = 1. 
			}

			// Adiciona processo na fila de aptos
			Scopes.get('RoundRobin').processosAptos[fila].push({id: g_qtdProcsIniciais, nome: "p"+g_qtdProcsIniciais, fila: fila, quantum: Number(currentQuantum), tempo: tempo, colorClass: colorClass, processamentos: Number(0)});
			g_qtdProcsIniciais++;
	}

	// #1 - Pegando variaveis da url e inicializando escalonador
	var p1 = new RegExp('[\?&]p1=([^&#]*)').exec(window.location.href)[1];
	var p2 = new RegExp('[\?&]p2=([^&#]*)').exec(window.location.href)[1];
	var p3 = new RegExp('[\?&]p3=([^&#]*)').exec(window.location.href)[1];
	var p4 = new RegExp('[\?&]p4=([^&#]*)').exec(window.location.href)[1];
	var p5 = new RegExp('[\?&]p5=([^&#]*)').exec(window.location.href)[1];
	Scopes.get('RoundRobin').initRoundRobin(p1, p2, p3, p4, p5);
});