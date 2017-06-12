angular.module('view').controller('viewController', function ($scope, Scopes) {

	// Define escopo de execução
	Scopes.store('RoundRobin', $scope);

	// Variaveis globais para parametros iniciais
	var g_qtdNucleos = g_quantum = g_qtdProcsIniciais = g_tamanhoMemoria = g_intervalo = g_qtdListas = 0;
	var g_algoritmo = "";

	// Variaveis globais para fator de cada fila de prioridade
	var g_f0 = 2.1;
	var g_f1 = 1.8;
	var g_f2 = 1.5;

	// Indice da fila de prioridade que deve ser pegue
	var g_indiceDaProximaFila = null;

	// Fila de processos em execução (cores)
	Scopes.get('RoundRobin').processosExecutando = [];
	// Fila de processos aptos
	Scopes.get('RoundRobin').processosAptos = {0: [], 1: [], 2: [], 3: []};
	// Fila de processos finalizados
	Scopes.get('RoundRobin').processosFinalizados = [];
	// Fila de memoria
	Scopes.get('RoundRobin').memoria = {tamanho: null, tamLivre: null, blocos: []};
	// Fila de abortados
	Scopes.get('RoundRobin').processosAbortados = [];

	// Cria um fila de eventos para controlar concorrência
	Scopes.get('RoundRobin').g_filaDeEventos = [];

	/**
	* Classe de Memoria
	*/

	var Fit = function() {};

	Fit.prototype.desalocaMemoria = function (idDoCore) {
		// Percorre os blocos ate achar o bloco que deve ser desalocado
		for (var i = 0; i < Scopes.get('RoundRobin').memoria.blocos.length; i++) {
			if(Scopes.get('RoundRobin').memoria.blocos[i].idDoCore == idDoCore) {
				// Altera o status
				Scopes.get('RoundRobin').memoria.blocos[i].status = 'livre';
				// Remove id do core
				Scopes.get('RoundRobin').memoria.blocos[i].idDoCore = null;
				// Aumenta tamanho livre
				Scopes.get('RoundRobin').memoria.tamLivre += Scopes.get('RoundRobin').processosExecutando[idDoCore].tamanho;
			}
		}

		// Se for mergeFit deve unir os blocos que estao livres e sao adjacentes
		if (g_algoritmo == 'merge') {
			for (var i = 0; i < Scopes.get('RoundRobin').memoria.blocos.length - 1; i++) {
				if(Scopes.get('RoundRobin').memoria.blocos[i].status == 'livre' &&
					Scopes.get('RoundRobin').memoria.blocos[i+1].status == 'livre') {
					// Aumenta o tamanho desse bloco
					Scopes.get('RoundRobin').memoria.blocos[i].tamanho += Scopes.get('RoundRobin').memoria.blocos[i+1].tamanho;
					// Remove o segundo bloco
					Scopes.get('RoundRobin').memoria.blocos.splice(i+1, 1);
				}
			}
		}
	}

	Fit.prototype.alocaMemoria = function (idDoCore, processo) {
		switch (g_algoritmo) {
			case 'best':
				// Se tiver blocos criados, pode usar um bloco
				if (Scopes.get('RoundRobin').memoria.blocos.length > 0) {
					// Percorre os blocos
					var melhorIdAteAgora = null;
					for (var i = 0; i < Scopes.get('RoundRobin').memoria.blocos.length; i++) {
						// Verifica se esta livre e no tamanho aceitavel
						if (Scopes.get('RoundRobin').memoria.blocos[i].status == 'livre' &&
							Scopes.get('RoundRobin').memoria.blocos[i].tamanho >= processo.tamanho) {
							// grava o id como melhor, por enquanto
							melhorIdAteAgora = i;
						}
					}
					if (melhorIdAteAgora == null) {
						// Só achou blocos pequenos demais.
						// Cria novo bloco
						if (!Fit.prototype.criaNovoBloco(processo.tamanho, processo.colorClass, idDoCore)) {
							// Não criou o bloco, aborta!
							Processa.prototype.abortaProcesso(idDoCore);
							return false;
						}
						return true; // Criou o bloco
					} else {
						// Usa melhor bloco encontrado
						Scopes.get('RoundRobin').memoria.blocos[melhorIdAteAgora].status = 'ocupado';
						Scopes.get('RoundRobin').memoria.blocos[melhorIdAteAgora].colorClass = processo.colorClass;
						Scopes.get('RoundRobin').memoria.blocos[melhorIdAteAgora].idDoCore = idDoCore;
						Scopes.get('RoundRobin').memoria.tamLivre -= processo.tamanho;
						return true;
					}
				} else {
					// Cria novo bloco
					if (!Fit.prototype.criaNovoBloco(processo.tamanho, processo.colorClass, idDoCore)) {
						// Não criou o bloco, aborta!
						Processa.prototype.abortaProcesso(idDoCore);
						return false;
					}
					return true; // Criou o bloco
				}
				break;
			case 'merge':
				// Se tiver blocos criados, pode usar um bloco
				if (Scopes.get('RoundRobin').memoria.blocos.length > 0) {
					// Percorre os blocos
					for (var i = 0; i < Scopes.get('RoundRobin').memoria.blocos.length; i++) {
						// Verifica se esta livre e no tamanho aceitavel
						if (Scopes.get('RoundRobin').memoria.blocos[i].status == 'livre' &&
							Scopes.get('RoundRobin').memoria.blocos[i].tamanho >= processo.tamanho) {
							// Utiliza esse bloco, fazendo split caso necessario

							// Verifica se precisa de split (redimensiona esse bloco e cria novo com tamanho restante)
							if (Scopes.get('RoundRobin').memoria.blocos[i].tamanho > processo.tamanho) {
								// Pega tamanho restante
								var tamanhoRestante = Scopes.get('RoundRobin').memoria.blocos[i].tamanho - processo.tamanho;
								// Redefine tamanho do bloco
								Scopes.get('RoundRobin').memoria.blocos[i].tamanho = processo.tamanho;
								// Cria novo bloco
								var novoBloco = {tamanho: tamanhoRestante, status: 'livre', colorClass: processo.colorClass, idDoCore: null};
								// Adiciona novo bloco na memoria
								Scopes.get('RoundRobin').memoria.blocos.push(novoBloco);
							}

							Scopes.get('RoundRobin').memoria.blocos[i].status = 'ocupado';
							Scopes.get('RoundRobin').memoria.blocos[i].colorClass = processo.colorClass;
							Scopes.get('RoundRobin').memoria.blocos[i].idDoCore = idDoCore;
							Scopes.get('RoundRobin').memoria.tamLivre -= processo.tamanho;
							return true;
						}
					}

					// Se chegou aqui, nao achou nenhum bloco disponivel. Cria novo ou aborta!

					// Cria novo bloco
					if (!Fit.prototype.criaNovoBloco(processo.tamanho, processo.colorClass, idDoCore)) {
						// Não criou o bloco, aborta!
						Processa.prototype.abortaProcesso(idDoCore);
						return false;
					}
					return true; // Criou o bloco
				} else {
					// Cria novo bloco
					if (!Fit.prototype.criaNovoBloco(processo.tamanho, processo.colorClass, idDoCore)) {
						// Não criou o bloco, aborta!
						Processa.prototype.abortaProcesso(idDoCore);
						return false;
					}
					return true; // Criou o bloco
				}
				break;
		}
	}

	Fit.prototype.criaNovoBloco = function (tamanho, colorClass, idDoCore) {
		// Não tem tamanho disponivel, aborta!
		if (Scopes.get('RoundRobin').memoria.tamLivre < tamanho) {
			return false;
		}

		var novoBloco = {tamanho: tamanho, status: 'ocupado', colorClass: colorClass, idDoCore: idDoCore};
		Scopes.get('RoundRobin').memoria.blocos.push(novoBloco);
		Scopes.get('RoundRobin').memoria.tamLivre -= tamanho;
		return true; // Criou o bloco
	}

	/**
	* Classe de Processamento
	*/

	var Processa = function() {}

	Processa.prototype.processa = function (indice, tempoRestante) {
		// Pega processo que esta no core
		var processo = Scopes.get('RoundRobin').processosExecutando[indice];


		// Se tiver 0 de tempo restante de Qauntum, deve jogar o processo
		// em finalizados ou de volta pra sua fila de prioridade
		if (tempoRestante <= 0 || processo.tempo <= 0) {

			// Acabou o processo
			if (processo.tempo <= 0) {
				// Adiciona evento para jogar o processo para fila de finalizados
				Scopes.get('RoundRobin').g_filaDeEventos.push({tipo: 'finalizado', id: indice});
			}

			// Ainda não acabou o processo
			if (processo.tempo > 0) {
				// Adiciona evento para voltar pra fila de aptos
				Scopes.get('RoundRobin').g_filaDeEventos.push({tipo: 'nao_finalizado', id: indice});
			}

		} else {
			var timeOut = (tempoRestante < 1)?tempoRestante*1000:1000;
			// Define o novo valor do tempo do processo.
			// Chama um novo loop de um segundo ou menos.
			setTimeout(function () {
				Scopes.get('RoundRobin').$apply(function () {
					Scopes.get('RoundRobin').processosExecutando[indice].tempo -= (timeOut / 1000);
					tempoRestante--;
					Processa.prototype.processa(indice, tempoRestante);
				});
			}, timeOut);
		}
	}

	Processa.prototype.executaEventos = function () {
		if (Scopes.get('RoundRobin').g_filaDeEventos.length > 0) {
			var tipo = Scopes.get('RoundRobin').g_filaDeEventos[0].tipo;
			var idDaFilaDoProcesso = Scopes.get('RoundRobin').g_filaDeEventos[0].id;
			var processo = Scopes.get('RoundRobin').processosExecutando[idDaFilaDoProcesso];

			switch (tipo) {
				case 'finalizado':
					// Deve desalocar o bloco da memoria
					Fit.prototype.desalocaMemoria(idDaFilaDoProcesso);
					// Adiciona na fila de finalizados
					Scopes.get('RoundRobin').processosFinalizados.push(processo);
					// Remove de Executando
					Scopes.get('RoundRobin').processosExecutando[idDaFilaDoProcesso] = null;
					// Executa proximo
					Processa.prototype.processaProximo(idDaFilaDoProcesso);
					break;
				case 'nao_finalizado':
					// Deve desalocar o bloco da memoria
					Fit.prototype.desalocaMemoria(idDaFilaDoProcesso);
					// Adiciona de volta na fila de aptos
					Scopes.get('RoundRobin').processosAptos[processo.fila].push(processo);
					// Remove de Executando
					Scopes.get('RoundRobin').processosExecutando[idDaFilaDoProcesso] = null;
					// Executa proximo
					Processa.prototype.processaProximo(idDaFilaDoProcesso);
					break;
				case 'add_processo':
					Processa.prototype.proximaFila(0);
					if(Fit.prototype.alocaMemoria(idDaFilaDoProcesso, Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila][0])){
						// Incrementa contador de quantas vezes foi processado
						Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila][0].processamentos++;
						// Adiciona na fila do core
						Scopes.get('RoundRobin').processosExecutando[idDaFilaDoProcesso] = Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila][0];
						// Remove da fila de aptos
						Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila].splice(0, 1);
						// Recalcula tempo restante do processo
						var tempoRestante = Scopes.get('RoundRobin').processosExecutando[idDaFilaDoProcesso].quantum;
						if (Scopes.get('RoundRobin').processosExecutando[idDaFilaDoProcesso].tempo < tempoRestante) {
							tempoRestante = Scopes.get('RoundRobin').processosExecutando[idDaFilaDoProcesso].tempo;
						}
						// Inicia um timeOut pra esse processo.
						Processa.prototype.processa(idDaFilaDoProcesso, tempoRestante);
					} else {
						Processa.prototype.processaProximo(idDaFilaDoProcesso);
					}
					break;
			}

			// Remove esse evento
			Scopes.get('RoundRobin').g_filaDeEventos.splice(0, 1);
		}
	}

	Processa.prototype.iniciaRoundRobin = function() {
		Scopes.get('RoundRobin').memoria.tamanho = g_tamanhoMemoria;
		Scopes.get('RoundRobin').memoria.tamLivre = g_tamanhoMemoria;

		Scopes.get('RoundRobin').quantumF0 = g_f0 * g_quantum;
		Scopes.get('RoundRobin').quantumF1 = g_f1 * g_quantum;
		Scopes.get('RoundRobin').quantumF2 = g_f2 * g_quantum;
		Scopes.get('RoundRobin').quantumF3 = g_quantum;

		// Preenche fila de processos em execução (cores) com nenhum valor
		for (var i = 0; i < g_qtdNucleos; i++) {
			Scopes.get('RoundRobin').processosExecutando.push(null);
		}

		// Preenche fila de aptos.
		// Cada processo é um loop
		for (var i = 0; i < g_qtdProcsIniciais; i++) {
			// Gera um randomico pra dizer qual a fila de prioridade esse processo vai pertencer
			var fila = Math.floor(Math.random() * 4);
			
			// Gera um randomico pra dizer a duração total do processo
			var tempo = Math.floor(Math.random() * 10)+5;

			// Pega o quantum do processo e multiplica ao valor de seu fator, dependendo de sua
			// prioridade na fila de aptos
			var currentQuantum = g_quantum;

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

			// Adiciona processo na fila de aptos
			var processo = {
				id: i, 
				nome: "p"+i, 
				fila: fila, 
				quantum: Number(currentQuantum), 
				tempo: tempo, 
				colorClass: colorClass, 
				processamentos: Number(0),
				tamanho: Math.floor(Math.random() * 992)+32
			};

			Scopes.get('RoundRobin').processosAptos[fila].push(processo);
		}
	};

	Processa.prototype.processaProximo = function(indice) {
		// Verifica que tem algum processo ainda
		if(Processa.prototype.proximaFila(0)){
			// Verifica se não tem processos na fila buscada
			if(Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila].length <= 0) {
				var aindaTemAlgumProcesso = false;
				// Verifica os cores
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

			// Aloca memoria
			if(Fit.prototype.alocaMemoria(indice, Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila][0])){
				// Incrementa contador de quantas vezes foi processado
				Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila][0].processamentos++;
				// Adiciona processo dessa fila no core
				Scopes.get('RoundRobin').processosExecutando[indice] = Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila][0];
				// Remove processo da fila de aptos
				Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila].splice(0, 1);

				Processa.prototype.processa(indice, Scopes.get('RoundRobin').processosExecutando[indice].quantum);
			} else {// Não conseguiu alocar a memoria
				Processa.prototype.processaProximo(indice);
			}
		}
	};

	Processa.prototype.proximaFila = function (tentativas) {
		if (tentativas >= 500) {
			// Acabaram as tentativas, nao tem mais nada
			return false;
		}
		// Se for o primeiro processo, seta o indice para 0 e sai
		if (g_indiceDaProximaFila == null) {
			g_indiceDaProximaFila = 0;
			return;
		}

		// Incrementa o indice
		g_indiceDaProximaFila++;
		tentativas++;
			
		// Se for um indice divisivel por 4, significa que é um indice de uma
		// fila de prioridade que nao existe. Zera o indice, para ir para a
		// primeira fila de prioridade.
		if (g_indiceDaProximaFila%4 == 0) {
			g_indiceDaProximaFila = 0;
		}

		// Se não tiver nenhum processo nessa fila de aptos, busca em outra fila.
		if (Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila].length == 0) {
			return Processa.prototype.proximaFila(tentativas);
		}
		// Tem processo
		return true;
	}

	Processa.prototype.adicionaNovoProcesso = function() {
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
		var processo = {
			id: g_qtdProcsIniciais, 
			nome: "p"+g_qtdProcsIniciais, 
			fila: fila, 
			quantum: Number(currentQuantum), 
			tempo: tempo, 
			colorClass: colorClass, 
			processamentos: Number(0), 
			tamanho: Math.floor(Math.random() * 992)+32
		};

		Scopes.get('RoundRobin').processosAptos[fila].push(processo);
		g_qtdProcsIniciais++;
	}

	Processa.prototype.iniciaProcessamento = function () {
		for (var indiceNucleo = 0; indiceNucleo < g_qtdNucleos; indiceNucleo++) {
			if (Scopes.get('RoundRobin').processosExecutando[indiceNucleo] == null) {
				Scopes.get('RoundRobin').g_filaDeEventos.push({tipo: 'add_processo', id: indiceNucleo});
			}

		}
	}

	Processa.prototype.abortaProcesso = function (idDoCore) {
		//Adiciona na fila de abortados
		Scopes.get('RoundRobin').processosAbortados.push(Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila][0]);
		// Remove da fila de aptos
		Scopes.get('RoundRobin').processosAptos[g_indiceDaProximaFila].splice(0, 1);
	}

	/**
	* Inicializações
	*/

	// #1 - Pegando variaveis da url e inicializando escalonador
	g_qtdNucleos = new RegExp('[\?&]p1=([^&#]*)').exec(window.location.href)[1];
	g_quantum = new RegExp('[\?&]p2=([^&#]*)').exec(window.location.href)[1];
	g_qtdProcsIniciais = new RegExp('[\?&]p3=([^&#]*)').exec(window.location.href)[1];
	g_tamanhoMemoria = new RegExp('[\?&]p4=([^&#]*)').exec(window.location.href)[1];
	g_algoritmo = new RegExp('[\?&]p5=([^&#]*)').exec(window.location.href)[1];
	if (g_algoritmo == 'quick') {
		g_intervalo = new RegExp('[\?&]p6=([^&#]*)').exec(window.location.href)[1];
		g_qtdListas = new RegExp('[\?&]p7=([^&#]*)').exec(window.location.href)[1];
		$("#quickEnable").removeClass('hidden');
	}

	// #3 - Método para parametrizar escalonador
	Scopes.get('RoundRobin').iniciaRoundRobin = function () {
		Processa.prototype.iniciaRoundRobin();
	}

	// #4 - Método para iniciar processamento dos processos
	Scopes.get('RoundRobin').$watch(function () {
		return Scopes.get('RoundRobin').g_filaDeEventos.length;
	}, function (newValue, oldValue) {
		Processa.prototype.executaEventos();
	});
	Scopes.get('RoundRobin').iniciaProcessamento = function () {
		Processa.prototype.iniciaProcessamento();
	}

	// #5 - Método para adicionar processos em tempo de execução
	Scopes.get('RoundRobin').adicionaProcesso = function () {
		Processa.prototype.adicionaNovoProcesso();
	}

	// #2 - Inicializa o escalonador
	Scopes.get('RoundRobin').iniciaRoundRobin();
});