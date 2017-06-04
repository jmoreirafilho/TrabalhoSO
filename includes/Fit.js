g_algoritmo = "";
g_memoriaTotal = g_memoriaDisponivel = 0;
g_blocosDeMemoria = [];

var Fit = function (algoritmo, memoriaTotal) {
	g_algoritmo = algoritmo;
	g_memoriaTotal = memoriaTotal;
	g_memoriaDisponivel = memoriaTotal;
}

Fit.prototype.adicionaBloco = function (bloco) {
	g_blocosDeMemoria.push(bloco);
}

Fit.prototype.desalocaMemoria = function (idMemoria) {
	g_blocosDeMemoria[idMemoria].status = "livre";
}

// Retorna indice do bloco com mesmo tamanho
// Retorna true se for pra criar um novo bloco
// Retorna false se for para abortar
Fit.prototype.temMemoriaDisponivel = function(processo) {
	// Verifica se tem memoria disponivel
	if (processo.tamanho <= g_memoriaDisponivel) {
		// Verifica se tem algum bloco de memoria com esse tamanho
		if (g_blocosDeMemoria.length > 0) {
			for (var i = 0; i < g_blocosDeMemoria.length; i++) {
				if(g_blocosDeMemoria[i].tamanho == processo.tamanho && g_blocosDeMemoria[i].status == "livre") {
					console.log("Pode usar o bloco "+i+" por possuir mesmo tamanho da requisição e estar livre");
					return i;
				}
			}
			// Executa algoritmo BestFit para escolher o melhor bloco
			var result = Fit.prototype.executaAlgoritmo(processo.tamanho);
			if (result !== null) {
				return result;
			}
		}
		console.log("Não conseguiu achar o bloco ideal. Deve criar um novo bloco de "+processo.tamanho+"kb.");
		// Se chegou aqui, nao possui nenhum bloco de mesmo tamanho ou nao tem nenhum bloco criado
		return true; // Manda criar um novo bloco
	} else {
		// Out Of Memory
		return false;
	}
};

Fit.prototype.executaAlgoritmo = function(tamanho){
	switch(g_algoritmo) {
		case 'best':
			return Fit.prototype.bestFit(tamanho);
	}
};

Fit.prototype.bestFit = function (tamanho) {
	var melhorBloco = null;
	for (var i = 0; i < g_blocosDeMemoria.length; i++) {
		// esta livre && seu tamanho é maior do preciso
		if(g_blocosDeMemoria[i].status == "livre" && g_blocosDeMemoria[i].tamanho > tamanho) {
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
	return melhorBloco;
}