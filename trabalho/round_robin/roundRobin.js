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
		Fit();

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
				probNovaRequisicao: Math.floor(Math.random() * 10),
				idMemoria: null
			});

		}
	}











	/**
	* ESTRUTURA PARA BEST, QUICK E MERGE FIT
	*/

	var Fit = function () {}

	Fit.prototype.alocaMemoria = function (idBloco, colorClass) {
		Scopes.get('RoundRobin').memoria.blocos[idBloco].status = "ocupado";
		Scopes.get('RoundRobin').memoria.blocos[idBloco].coloClass = colorClass;
		Scopes.get('RoundRobin').memoria.blocos[idBloco].usos++;
		Scopes.get('RoundRobin').memoria.tamLivre -= Scopes.get('RoundRobin').memoria.blocos[idBloco].tamanho;
	}

	Fit.prototype.desalocaMemoria = function (idMemoria) {

		while(typeof Scopes.get('RoundRobin').memoria.blocos[idMemoria] == 'undefined') {
			idMemoria--;
		}
		Scopes.get('RoundRobin').memoria.blocos[idMemoria].status = "livre";
		Scopes.get('RoundRobin').memoria.tamLivre += Scopes.get('RoundRobin').memoria.blocos[idMemoria].tamanho;

		if (g_algoritmo == 'merge') {
			Fit.prototype.mergeFitMerge(idMemoria);
		}
	}

	Fit.prototype.criarBloco = function (tamanho, colorClass) {
		var bloco = {tamanho: tamanho, status: "ocupado", colorClass: colorClass, usos: 1};
		Scopes.get('RoundRobin').memoria.blocos.push(bloco);
		Scopes.get('RoundRobin').memoria.tamLivre -= tamanho;
		return (Scopes.get('RoundRobin').memoria.blocos.length - 1);
	}

	// Retorna idDoBloco se o bloco tiver sido alocado
	// Retorna false se for para abortar
	Fit.prototype.temMemoriaDisponivel = function(processo) {
		// Verifica se tem memoria disponivel
		if (processo.tamanho <= Scopes.get('RoundRobin').memoria.tamLivre) {
			// Verifica se tem algum bloco de memoria
			if (Scopes.get('RoundRobin').memoria.blocos.length > 0) {
				// Executa algoritmo para escolher o melhor bloco ou se vai criar um bloco novo
				var idBloco = Fit.prototype.executaAlgoritmo(processo);
				if(idBloco == 'cria_novo'){
					return Fit.prototype.criarBloco(processo.tamanho, processo.colorClass);
				} else {
					return idBloco;
				}
			} else {
				// Se chegou aqui, nao possui nenhum bloco criado - retorna idBloco
				return Fit.prototype.criarBloco(processo.tamanho, processo.colorClass);
			}
		} else {
			// Out Of Memory!
			return false;
		}
	};

	Fit.prototype.executaAlgoritmo = function(processo){
		switch(g_algoritmo) {
			case 'best':
				return Fit.prototype.bestFit(processo.tamanho, processo.colorClass);
			case 'merge':
				return Fit.prototype.mergeFit(processo.tamanho, processo.colorClass);
			case 'quick':
				return Fit.prototype.quickFit(processo.tamanho);
		}
	};

	/**
	* BEST FIT
	*/

	Fit.prototype.bestFit = function (tamanhoDoProcesso, corDoProcesso) {
		var melhorBloco = null;

		// Percorres todo os blocos, procurando e menor possivel
		for (var i = 0; i < Scopes.get('RoundRobin').memoria.blocos.length; i++) {
			// Verifica se seu tamanho é maior do que o necessário
			if(Scopes.get('RoundRobin').memoria.blocos[i].tamanho >= tamanhoDoProcesso) {
				// Verifica se está livre
				if (Scopes.get('RoundRobin').memoria.blocos[i].status == "livre") {
					// Se for o primeiro encontrado, nao precisa comparar com ninguem
					if (melhorBloco == null) {
						melhorBloco = i;
						continue;
					}

					// Se não for o primeiro encontrado, compara com o melhorBloco.
					// Se for menor que o menorBloco, deve alterar esse para ser o menorBloco
					if (Scopes.get('RoundRobin').memoria.blocos[i].tamanho <= Scopes.get('RoundRobin').memoria.blocos[melhorBloco].tamanho) {
						melhorBloco = i;
					}
				}
			}
		}

		// Se for null, não encontrou ninguem. Cria um novo bloco
		if (melhorBloco == null) {
			return 'cria_novo';
		} else {
			// Aloca novo
			Fit.prototype.alocaMemoria(melhorBloco, corDoProcesso);
			return melhorBloco;
		}

	}

	/**
	* MERGE FIT
	*/

	Fit.prototype.mergeFitDivideBloco = function(tamanhoDoProcesso, idMelhorBlocoParaAlocarOProcesso) {
		// Variavel temporaria para guardar os novos blocos
		var blocosDeMemoriaTemp = [];
		// Pega o tamanho restante
		var tamanhoDoNovoBloco = Scopes.get('RoundRobin').memoria.blocos[idMelhorBlocoParaAlocarOProcesso].tamanho - tamanhoDoProcesso;

		// Percorre e adiciona na variavel ate achar um antes do indice que vai ser dividido
		var i = 0;
		for (i = 0; i < indice; i++) {
			blocosDeMemoriaTemp.push(Scopes.get('RoundRobin').memoria.blocos[i]);
		}
		// Pula o proximo bloco
		i++;

		// Pega a cor do bloco
		var cor = Scopes.get('RoundRobin').memoria.blocos[idMelhorBlocoParaAlocarOProcesso].colorClass;

		// Cria bloco 1
		var bloco1 = {tamanho: tamanhoDoProcesso, status: 'ocupado', colorClass: cor, usos: 1};
		blocosDeMemoriaTemp.push(bloco1);

		// Se tiver um segundo bloco, cria tambem
		if (tamanhoDoNovoBloco > 0) {
			var bloco2 = {tamanho: tamanhoDoNovoBloco, status: 'livre', colorClass: cor, usos: 0};
			blocosDeMemoriaTemp.push(bloco2);
			// Pula mais um bloco
			i++;
		}

		// Termina de preencher a variavel temporaria
		for(n = i; n < g_blocosDeMemoria.length; n++){
			blocosDeMemoriaTemp.push(Scopes.get('RoundRobin').memoria.blocos[n]);
		}

		// Redefine os blocs de memoria
		Scopes.get('RoundRobin').memoria.blocos = blocosDeMemoriaTemp;
	}

	Fit.prototype.mergeFitJuntaBlocos = function (indicePrim, indiceSec, cor) {
		var blocosDeMemoriaTemp = [];
		var tamanhoTotal = g_blocosDeMemoria[indicePrim].tamanho + g_blocosDeMemoria[indiceSec].tamanho;

		// Percorre e adiciona na variavel ate achar um antes do indice que vai ser dividido
		var i = 0;
		for (i = 0; i < indicePrim; i++) {
			blocosDeMemoriaTemp.push(g_blocosDeMemoria[i]);
		}

		// Pula os dois blocos que serão unidos
		i += 2;

		// Cria novo bloco
		var bloco = {tamanho: tamanhoTotal, status: 'livre', colorClass: cor, usos: 0};
		blocosDeMemoriaTemp.push(bloco);

		// Termina de preencher a variavel temporaria
		for(n = i; n < g_blocosDeMemoria.length; n++){
			blocosDeMemoriaTemp.push(g_blocosDeMemoria[n]);
		}

		// Redefine os blocs de memoria
		g_blocosDeMemoria = blocosDeMemoriaTemp;
	}

	Fit.prototype.mergeFitMerge = function(idMemoria) {
		// Olha pra direita
		for (var i = (idMemoria + 1); i < g_blocosDeMemoria.length; i++) {
			if (typeof g_blocosDeMemoria[i] != 'undefined' && g_blocosDeMemoria[i].status == 'livre') {
				// Redefine blocos
				Fit.prototype.mergeFitJuntaBlocos(idMemoria, i, g_blocosDeMemoria[idMemoria].colorClass);
			} else {
				break;
			}
		}

		// Olha pra esquerda
		for (var i = (idMemoria - 1); i >= 0; i--) {
			if (typeof g_blocosDeMemoria[i] != 'undefined' && g_blocosDeMemoria[i].status == 'livre') {
				// Redefine blocos
				Fit.prototype.mergeFitJuntaBlocos(i, idMemoria, g_blocosDeMemoria[idMemoria].colorClass);
				// Redefine id do bloco
				idMemoria--;
			} else {
				break;
			}
		}
	}

	Fit.prototype.mergeFit = function (tamanhoDoProcesso) {

		// Por default, não há memoria disponivel. Deve abortar.
		var idMelhorBlocoParaAlocarOProcesso = null;

		// Percorre todos os blocos
		for (var i = 0; i < Scopes.get('RoundRobin').memoria.blocos.length; i++) {

			// FirstFit para encontrar melhor bloco que esteja livre disponivel
			if (Scopes.get('RoundRobin').memoria.blocos[i].status == 'livre' 
				&& Scopes.get('RoundRobin').memoria.blocos[i].tamanho >= tamanhoDoProcesso) {
				// Deve executar split desse bloco para se adequar ao que é preciso
				idMelhorBlocoParaAlocarOProcesso = i;
				break;
			}
		}
		
		// Se tiver encontrado um bloco disponivel, deve dividir
		if (idMelhorBlocoParaAlocarOProcesso !== null) {
			Fit.prototype.mergeFitDivideBloco(tamanhoDoProcesso, idMelhorBlocoParaAlocarOProcesso);
		}

	}


	/**
	* QUICK FIT
	*/

	Fit.prototype.quickFit = function (tamanho) {
		var melhorBloco = null;
		for (var i = 0; i < g_blocosDeMemoria.length; i++) {
			// esta livre && seu tamanho é maior do preciso
			if(g_blocosDeMemoria[i].tamanho >= tamanho) {
				if (g_blocosDeMemoria[i].status == "livre") {
					if (melhorBloco == null) {
						melhorBloco = i;
						continue;
					}

					// Se seu tamanho for melhor do que o escolhido antes, esta mais perto do menor valor necessario
					if (g_blocosDeMemoria[i].tamanho <= g_blocosDeMemoria[melhorBloco].tamanho) {
						melhorBloco = i;
					}
				}
			}
		}
		return melhorBloco;
	}

	/**
	* FIM DA ESTRUTURA PARA BEST, QUICK E MERGE FIT
	*/	

















	var Processa = function(indice, tempoRestante) {
		// Pega processo que esta no core
		var processo = Scopes.get('RoundRobin').processosExecutando[indice];


		// Se tiver 0 de tempo restante de Qauntum, deve jogar o processo
		// em finalizados ou de volta pra sua fila de prioridade
		if (tempoRestante <= 0 || processo.tempo <= 0) {

			// Acabou o processo, deve ser desalocado da memoria
			if (processo.tempo <= 0) {
				// Vai pra fila de finallizados
				Scopes.get('RoundRobin').processosFinalizados.push(processo);

			}

			if (processo.tempo > 0) { // Ainda não acabou o processo
				// Vai pra fila de aptos novamente
				Scopes.get('RoundRobin').processosAptos[processo.fila].push(Scopes.get('RoundRobin').processosExecutando[indice]);
			}

			// Redefine todos os blocos
			// Scopes.get('RoundRobin').memoria.blocos[processo.idMemoria].status = 'livre';
			
			Fit.prototype.desalocaMemoria(processo.idMemoria);

			// Aumenta memoria disponivel
			// Scopes.get('RoundRobin').memoria.tamLivre += processo.tamanho;


			// Remove processo do core
			Scopes.get('RoundRobin').processosExecutando[indice] = null;

			// Busca novo processo para adicionar no core que, agora, está vazio
			Processa.prototype.processaProximo(indice);

		} else { // Manda processar a requisição
			var timeOut = (tempoRestante < 1)?tempoRestante*1000:1000;

			// Verifica a chance do processo gerar uma nova requisição
			if ($scope.processosExecutando[indice].probNovaRequisicao >= 8) {
				// gera uma nova requisição
				$scope.processosExecutando[indice].probNovaRequisicao = 0;
				setTimeout(function () {
					// console.log("gera requisição");
					// geraNovaRequisicao(indice);
				},(timeOut/2));
			} else {
				// aumenta a chance de gerar uma nova requisição
				$scope.processosExecutando[indice].probNovaRequisicao++;
			}

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

	Processa.prototype.alocaMemoria = function (processoAtual) {
		// Verifica se tem memoria, ou qual bloco deve ser alocado
		var idMemoria = Fit.prototype.temMemoriaDisponivel(processoAtual);

		if (idMemoria !== false) { // Alocou a memoria
			return idMemoria;
		} else { // Deve abortar - Out Of Memory!
			Scopes.get('RoundRobin').processosAbortados.push(processoAtual);
			return false;
		}
	}

	Processa.prototype.processaProximo = function(indice) {
		// Busca proximo indice do processo na fila de prioridade
		Processa.prototype.proximaFila();

		// Aloca memoria
		var idMemoria = Processa.prototype.alocaMemoria(Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila][0]);
		if(idMemoria !== false) {

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

			// Define o indice da Memoria
			Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila][0].idMemoria = idMemoria;
			// Incrementa contador de quantas vezes foi processado
			Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila][0].processamentos++;
			// Adiciona processo dessa fila no core
			Scopes.get('RoundRobin').processosExecutando[indice] = Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila][0];
			// Remove processo da fila de aptos
			Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila].splice(0, 1);

			new Processa(indice, Scopes.get('RoundRobin').processosExecutando[indice].quantum);
		} else {
			// Retira da fila de aptos, pois abortou
			Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila].splice(0, 1);
			setTimeout(function () {
				Processa.prototype.processaProximo(indice);
			}, 100);
		}
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

				var idMemoria = Processa.prototype.alocaMemoria(Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila][0]);

				if (idMemoria !== false) { // Caso nao tenha sido abortado				
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
				} else {
					// Retira da fila de aptos, pois abortou
					Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila].splice(0, 1);
					Processa.prototype.processaProximo(indiceNucleo);
				}
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

			
			// Gera um randomico para o tamanho do processo
			var tamanho = Math.floor(Math.random() * 992)+32;

			// Adiciona processo na fila de aptos
			Scopes.get('RoundRobin').processosAptos[fila].push({
				id: g_qtdProcsIniciais,
				nome: "p"+g_qtdProcsIniciais, 
				fila: fila, 
				quantum: Number(currentQuantum), 
				tempo: tempo, 
				colorClass: colorClass,
				processamentos: Number(0),
				tamanho: tamanho,
				probNovaRequisicao: Math.floor(Math.random() * tempo),
				idMemoria: null
			});
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