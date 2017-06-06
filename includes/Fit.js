g_algoritmo = "";
g_memoriaTotal = g_memoriaDisponivel = 0;
g_blocosDeMemoria = [];

var Fit = function (algoritmo, memoriaTotal) {
	g_algoritmo = algoritmo;
	g_memoriaTotal = memoriaTotal;
	g_memoriaDisponivel = memoriaTotal;
}

Fit.prototype.getBlocos = function () {
	return g_blocosDeMemoria;
}

Fit.prototype.alocaMemoria = function (idMemoria, colorClass) {
	g_blocosDeMemoria[idMemoria].status = "ocupado";
	g_blocosDeMemoria[idMemoria].coloClass = colorClass;
	g_blocosDeMemoria[idMemoria].usos++;
	g_memoriaDisponivel -= g_blocosDeMemoria[idMemoria].tamanho;
}

Fit.prototype.desalocaMemoria = function (idMemoria) {
	g_blocosDeMemoria[idMemoria].status = "livre";
	g_memoriaDisponivel += g_blocosDeMemoria[idMemoria].tamanho;

	if (g_algoritmo == 'merge') {
		var merge = true;
		while(merge !== false) {
			merge = Fit.prototype.mergeFitMerge(idMemoria);
		}
		return merge;
	}
}

Fit.prototype.criarBloco = function (tamanho, colorClass) {
	var bloco = {tamanho: tamanho, status: "ocupado", colorClass: colorClass, usos: 1};
	g_blocosDeMemoria.push(bloco);
	g_memoriaDisponivel -= tamanho;
}

// Retorna indice do bloco com mesmo tamanho
// Retorna true se for pra criar um novo bloco
// Retorna false se for para abortar
Fit.prototype.temMemoriaDisponivel = function(processo) {
	// Verifica se tem memoria disponivel
	if (processo.tamanho <= g_memoriaDisponivel) {
		// Verifica se tem algum bloco de memoria com esse tamanho
		if (g_blocosDeMemoria.length > 0) {
			// Executa algoritmo para escolher o melhor bloco
			var idMelhorBloco = Fit.prototype.executaAlgoritmo(processo);

			// Se tiver algum bloco disponivel, deve alocar esse bloco
			if (idMelhorBloco !== null) {
				Fit.prototype.alocaMemoria(idMelhorBloco, processo.colorClass);
				return idMelhorBloco;
			} else {
				// Se nao tiver nehum blocodisponivel, deve criar um bloco novo
				Fit.prototype.criarBloco(processo.tamanho, processo.colorClass);
				return null;
			}
		} else {
			// Se chegou aqui, nao possui nenhum bloco criado
			Fit.prototype.criarBloco(processo.tamanho, processo.colorClass);
			return true; // Manda criar um novo bloco
		}
	} else {
		// Out Of Memory
		return false;
	}
};

Fit.prototype.executaAlgoritmo = function(processo){
	switch(g_algoritmo) {
		case 'best':
			return Fit.prototype.bestFit(processo.tamanho);
		case 'merge':
			return Fit.prototype.mergeFit(processo.tamanho, processo.colorClass);
		case 'quick':
			return Fit.prototype.quickFit(processo.tamanho);
	}
};

/**
* BEST FIT
*/

Fit.prototype.bestFit = function (tamanho) {
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
* MERGE FIT
*/

Fit.prototype.mergeFitDivideBloco = function(tamanho, indice, cor) {
	var blocosDeMemoriaTemp = [];
	var tamanhoRestante = g_blocosDeMemoria[indice].tamanho - tamanho;

	// Percorre e adiciona na variavel ate achar um antes do indice que vai ser dividido
	var i = 0;
	for (i = 0; i < indice; i++) {
		blocosDeMemoriaTemp.push(g_blocosDeMemoria[i]);
	}
	// Pula o proximo bloco
	i++;

	// Cria bloco 1
	var bloco1 = {tamanho: tamanho, status: 'ocupado', colorClass: cor, usos: 1};
	blocosDeMemoriaTemp.push(bloco1);

	// Se tiver um segundo bloco, cria tambem
	if (tamanhoRestante > 0) {
		var bloco2 = {tamanho: tamanhoRestante, status: 'livre', colorClass: cor, usos: 0};
		blocosDeMemoriaTemp.push(bloco2);
		// Pula mais um bloco
		i++;
	}

	// Termina de preencher a variavel temporaria
	for(n = i; n < g_blocosDeMemoria.length; n++){
		blocosDeMemoriaTemp.push(g_blocosDeMemoria[n]);
	}

	// Redefine os blocs de memoria
	g_blocosDeMemoria = blocosDeMemoriaTemp;
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
	if (typeof g_blocosDeMemoria[idMemoria+1] != 'undefined' && g_blocosDeMemoria[idMemoria+1].status == 'livre') {
		// Redefine blocos
		Fit.prototype.mergeFitJuntaBlocos(idMemoria, idMemoria+1, g_blocosDeMemoria[idMemoria].colorClass);
		// Retorna que foi redefinido
		return idMemoria;
	}
	// Olha pra esquerda
	if (typeof g_blocosDeMemoria[idMemoria-1] != 'undefined' && g_blocosDeMemoria[idMemoria-1].status == 'livre') {
		// Redefine blocos
		Fit.prototype.mergeFitJuntaBlocos(idMemoria, idMemoria-1, g_blocosDeMemoria[idMemoria].colorClass);
		// Retorna que foi redefinido
		return (idMemoria - 1);
	}

	return idMemoria;

}

Fit.prototype.mergeFit = function (tamanho, cor) {

	// Por default, não há memoria disponivel. Deve abortar.
	var idMelhorBloco = null;

	// Percorre todos os blocos
	for (var i = 0; i < g_blocosDeMemoria.length; i++) {

		// FirstFit para encontrar melhor bloco que esteja livre disponivel
		if (g_blocosDeMemoria[i].status == 'livre' && g_blocosDeMemoria[i].tamanho >= tamanho) {
			// Deve executar split desse bloco para se adequar ao que é preciso
			idMelhorBloco = i;
		}
	}
	
	// Se tiver encontrado um bloco disponivel, deve dividir
	if (idMelhorBloco !== null) {
		Fit.prototype.mergeFitDivideBloco(tamanho, idMelhorBloco, cor);
	}

	return idMelhorBloco;
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