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
			// Executa algoritmo BestFit para escolher o melhor bloco
			var idMelhorBloco = Fit.prototype.executaAlgoritmo(processo.tamanho);
			if (idMelhorBloco !== null) {
				Fit.prototype.alocaMemoria(idMelhorBloco, processo.colorClass);
				return idMelhorBloco;
			} else {
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

Fit.prototype.executaAlgoritmo = function(tamanho){
	switch(g_algoritmo) {
		case 'best':
			return Fit.prototype.bestFit(tamanho);
		case 'merge':
			return Fit.prototype.mergeFit(tamanho);
		case 'quick':
			return Fit.prototype.quickFit(tamanho);
	}
};

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

Fit.prototype.mergeFit = function (tamanho) {
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