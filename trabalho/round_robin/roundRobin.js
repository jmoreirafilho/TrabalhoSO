angular.module('view').controller('viewController', function ($scope, Scopes) {

	// Define escopo de execução
	Scopes.store('RoundRobin', $scope);

	// Variaveis globais para parametros iniciais
	var g_qtdNucleos = g_quantum = g_qtdProcsIniciais = g_tamanhoMemoria = g_qtdListas = 0;
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
	// Fila de blocos para quickFit
	Scopes.get('RoundRobin').filasDeBlocos = [];
	// Contadores de processamentos para quickFit
	Scopes.get('RoundRobin').contadorDeProcessamentos = 0;
	Scopes.get('RoundRobin').limiteDeProcessamentos = 0;
	// Fila para ordenar os blocos do quickFit
	var g_filasDeBlocosOrdenados = [];
	// Fila para os blocos genericos
	Scopes.get('RoundRobin').filaDeBlocosGenericos = [];

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
				
				// Se for quickFit deve mandar o bloco de volta pra sua fila
				if (g_algoritmo == 'quick') {
					// Percorre as listas
					for (var j = 0; j < Scopes.get('RoundRobin').filasDeBlocos.length; j++) {
						// Verifica se tem alguma lista com esse tamanho
						if(Scopes.get('RoundRobin').filasDeBlocos[j].tamanho == Scopes.get('RoundRobin').memoria.blocos[i].tamanho) {
							// Coloca na lista
							Scopes.get('RoundRobin').filasDeBlocos[j].blocos.push({tamanho: Scopes.get('RoundRobin').memoria.blocos[i].tamanho, idBloco: i});
							break;
						}
					}

					// Não está na lista, coloca na fila generica
					Scopes.get('RoundRobin').filaDeBlocosGenericos.push({tamanho: Scopes.get('RoundRobin').memoria.blocos[i].tamanho, idBloco: i});
				}
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
					var melhorTamanho = null;
					for (var i = 0; i < Scopes.get('RoundRobin').memoria.blocos.length; i++) {
						// Verifica se esta livre e no tamanho aceitavel
						if (Scopes.get('RoundRobin').memoria.blocos[i].status == 'livre' &&
							Scopes.get('RoundRobin').memoria.blocos[i].tamanho >= processo.tamanho) {
							// Verifica se o tamanho do processo é ainda menor do que o menor encontrado
							if (melhorTamanho == null || Scopes.get('RoundRobin').memoria.blocos[i].tamanho < melhorTamanho) {
								melhorTamanho = Scopes.get('RoundRobin').memoria.blocos[i].tamanho;
								// grava o id como melhor, por enquanto
								melhorIdAteAgora = i;
							}
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
						Scopes.get('RoundRobin').memoria.blocos[melhorIdAteAgora].usos++;
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
								var novoBloco = {tamanho: tamanhoRestante, status: 'livre', colorClass: processo.colorClass, idDoCore: null, usos: Number(0)};
								// Adiciona novo bloco na memoria
								Scopes.get('RoundRobin').memoria.blocos.push(novoBloco);
							}

							Scopes.get('RoundRobin').memoria.blocos[i].status = 'ocupado';
							Scopes.get('RoundRobin').memoria.blocos[i].colorClass = processo.colorClass;
							Scopes.get('RoundRobin').memoria.blocos[i].idDoCore = idDoCore;
							Scopes.get('RoundRobin').memoria.blocos[i].usos++;
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
			case 'quick':
				// Incrementa os processamentos
				Scopes.get('RoundRobin').contadorDeProcessamentos++;
				// Se for necessario, recalcula a lista
				if (Scopes.get('RoundRobin').contadorDeProcessamentos > Scopes.get('RoundRobin').limiteDeProcessamentos) {
					// Reseta o contador
					Scopes.get('RoundRobin').contadorDeProcessamentos = 0;
					// Redefine a fila dos blocos ordenados
					// Cria variavel temporaria e coloca blocos livres
					var blocosTemp = [];

					for (var i = 0; i < Scopes.get('RoundRobin').memoria.blocos.length; i++) {
						if(Scopes.get('RoundRobin').memoria.blocos[i].status == 'livre') {
							blocosTemp.push({bloco: Scopes.get('RoundRobin').memoria.blocos[i], idBloco: i});
						}
					}

					// Cria variavel auxiliar e agrupa por tamanho
					var blocosAux = [];
					// Percorre os blocos, agrupando-os por tamanho
					for (var j = 0; j < blocosTemp.length; j++) {
						// Busca outros blocos iguais a este
						blocosAux[j] = {tamanho: blocosTemp[j].bloco.tamanho, usos: blocosTemp[j].bloco.usos, idBlocos: []};
						blocosAux[j].idBlocos.push(blocosTemp[j].idBloco);
						// Busca em todos os blocos
						for (var l = 0; l < blocosTemp.length; l++) {
							// Se tiver mesmo tamamho e idBloco diferente
							if(blocosTemp[j].bloco.tamanho == blocosTemp[l].bloco.tamanho &&
								blocosTemp[j].idBlocos != blocosTemp[l].idBlocos) {
								// Adiciona no auxiliar
								blocosAux[j].idBlocos.push(blocosTemp[l].idBloco);
								// Incrementa usos
								blocosAux[j].usos += blocosAux[j].usos;
							}
						}
					}

					// Esvazia as filas ordenadas
					g_filasDeBlocosOrdenados = [];
					// Um loop para cada lista
					for (var i = 0; i < g_qtdListas; i++) {
						var idDoMaisUsado = null;
						var qtdUsos = 0;
						
						// Busca maior quantidade de usos
						for (var j = 0; j < blocosAux.length; j++) {
							if (idDoMaisUsado == null) {
								idDoMaisUsado = j;
								qtdUsos = blocosAux[j].usos;
							} else 
							if(qtdUsos < blocosAux[j].usos){
								idDoMaisUsado = j;
								qtdUsos = blocosAux[j].usos;
							}
						}

						// Adiciona todos os blocos, de maneira ordenada
						g_filasDeBlocosOrdenados.push({tamanho: blocosAux[idDoMaisUsado].tamanho, usos: blocosAux[idDoMaisUsado].usos, ids: blocosAux[idDoMaisUsado].idBlocos});
						// Remove o que foi utilizado
						blocosAux.splice(idDoMaisUsado, 1);
						if (i >= blocosAux.length) {
							break;
						}
					}

					// repinta, na tela
					Scopes.get('RoundRobin').filasDeBlocos = [];
					for (var i = 0; i < g_filasDeBlocosOrdenados.length; i++) {
						var fila = {tamanho: g_filasDeBlocosOrdenados[i].tamanho, usos: g_filasDeBlocosOrdenados[i].usos, blocos: []};
						Scopes.get('RoundRobin').filasDeBlocos.push(fila);
						for (var j = 0; j < g_filasDeBlocosOrdenados[i].ids.length; j++) {
							var id = g_filasDeBlocosOrdenados[i].ids[j];
							Scopes.get('RoundRobin').filasDeBlocos[i].blocos.push({tamanho: Scopes.get('RoundRobin').memoria.blocos[id].tamanho, idBloco: id});
						}
					}
					
					// Pinta a fila generica
					Scopes.get('RoundRobin').filaDeBlocosGenericos = [];
					for (var i = 0; i < blocosAux.length; i++) {
						if(i >= g_filasDeBlocosOrdenados.length) {
							break;
						}
						for (var j = 0; j < blocosAux[i].idBlocos.length; j++) {
							var id = g_filasDeBlocosOrdenados[i].ids[j];
							Scopes.get('RoundRobin').filaDeBlocosGenericos.push({tamanho: Scopes.get('RoundRobin').memoria.blocos[id].tamanho, idBloco: id});
						}
					}
				}

				// Inicia a logica

				// Verifica se tem filas
				if (Scopes.get('RoundRobin').filasDeBlocos.length > 0) {
					// Verifica se tem alguma fila para esse processo
					for (var i = 0; i < Scopes.get('RoundRobin').filasDeBlocos.length; i++) {
						// Verifica o tamanho e a quantidade de blocos nessa fila
						if(Scopes.get('RoundRobin').filasDeBlocos[i].tamanho == processo.tamanho &&
							Scopes.get('RoundRobin').filasDeBlocos[i].blocos.length > 0) {
							// Aloca o primeiro bloco
							var id = Scopes.get('RoundRobin').filasDeBlocos[i].blocos[0].idBloco;
							Scopes.get('RoundRobin').memoria.blocos[id].status = 'ocupado';
							Scopes.get('RoundRobin').memoria.blocos[id].colorClass = processo.colorClass;
							Scopes.get('RoundRobin').memoria.blocos[id].idDoCore = idDoCore;
							Scopes.get('RoundRobin').memoria.blocos[id].usos++;
							// Tira o bloco da fila generica
							Scopes.get('RoundRobin').filasDeBlocos[i].blocos.splice(0, 1);
							return true;
						}
					}
				}

				// Se chegar aqui, verifica se tem algum bloco na fila generica
				if (Scopes.get('RoundRobin').filaDeBlocosGenericos.length > 0) {
					for (var i = 0; i < Scopes.get('RoundRobin').filaDeBlocosGenericos.length; i++) {
						// First Fit
						if(Scopes.get('RoundRobin').filaDeBlocosGenericos[i].tamanho >= processo.tamanho){
							// Aloca o bloco
							var id = Scopes.get('RoundRobin').filaDeBlocosGenericos[i].idBloco;
							
							Scopes.get('RoundRobin').memoria.blocos[id].status = 'ocupado';
							Scopes.get('RoundRobin').memoria.blocos[id].colorClass = processo.colorClass;
							Scopes.get('RoundRobin').memoria.blocos[id].idDoCore = idDoCore;
							Scopes.get('RoundRobin').memoria.blocos[id].usos++;
							// Tira o bloco da fila generica
							Scopes.get('RoundRobin').filaDeBlocosGenericos.splice(i, 1);
							return true;
						}
					}
					// Nao achou nenhum bloco que caiba, cria bloco
					// Cria novo bloco
					if (!Fit.prototype.criaNovoBloco(processo.tamanho, processo.colorClass, idDoCore)) {
						// Não criou o bloco, aborta!
						Processa.prototype.abortaProcesso(idDoCore);
						return false;
					}
					return true;
				} else {
					// Cria novo bloco
					if (!Fit.prototype.criaNovoBloco(processo.tamanho, processo.colorClass, idDoCore)) {
						// Não criou o bloco, aborta!
						Processa.prototype.abortaProcesso(idDoCore);
						return false;
					}
					return true;
				}

				// Se tiver algum bloco criado, pode usar os blocos
				if (Scopes.get('RoundRobin').memoria.blocos.length > 0) {
					// Verifica se tem blocos livres disponiveis
					if (Scopes.get('RoundRobin').filasDeBlocos.length > 0) {
						// Busca na filaDeBlocos se ja tem esse cara.
						for (var i = 0; i < Scopes.get('RoundRobin').filasDeBlocos.length; i++) {
							// Verifica que a fila é do tamanho necessario
							if (Scopes.get('RoundRobin').filasDeBlocos[i].tamanho == processo.tamanho) {
								// Aloca esse bloco que esta vazio e aloca nele.
								return true;
							}
						}
					}

					// Não tem blocos livres disponiveis, firstFit na fila generica

					// Percorre os blocos genericos
					for (var i = 0; i < Scopes.get('RoundRobin').filaDeBlocosGenericos.length; i++) {
						// Se for maior ou igual, pega o bloco
						if(Scopes.get('RoundRobin').filaDeBlocosGenericos[i].tamanho >= processo.tamanho) {
							// Aloca Scopes.get('RoundRobin').filaDeBlocosGenericos[i].idBloco
							return true;
						}
					}

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

		var novoBloco = {tamanho: tamanho, status: 'ocupado', colorClass: colorClass, idDoCore: idDoCore, usos: Number(0)};
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
		Scopes.get('RoundRobin').limiteDeProcessamentos = new RegExp('[\?&]p6=([^&#]*)').exec(window.location.href)[1];
		g_qtdListas = new RegExp('[\?&]p7=([^&#]*)').exec(window.location.href)[1];
		$("#quickEnable").removeClass('hidden');
	}


	// #3 - Watcher que dispara função quando a fila de eventos mudar
	Scopes.get('RoundRobin').$watch(function () {
		return Scopes.get('RoundRobin').g_filaDeEventos.length;
	}, function (newValue, oldValue) {
		Processa.prototype.executaEventos();
	});
	// #4 - Método para iniciar processamento dos processos
	Scopes.get('RoundRobin').iniciaProcessamento = function () {
		Processa.prototype.iniciaProcessamento();
	}

	// #5 - Método para adicionar processos em tempo de execução
	Scopes.get('RoundRobin').adicionaProcesso = function () {
		Processa.prototype.adicionaNovoProcesso();
	}

	// #2 - Inicializa o escalonador
	Processa.prototype.iniciaRoundRobin();
});