/**
* WilliamJardim/Scanners © 2024 by William Alves Jardim is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International. 
* To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/
*/

/*
* Código que inicializa o scanner
*/
window.scanner.SerieScanner = function(classConfig)
{
    const context = window.scanner.Base(classConfig);

    /* Validações iniciais */
    if( classConfig['sentinel_options'] == undefined ){
        throw 'sentinel_options config is not defined';
    }
    if( classConfig['template'] == undefined ){
        throw 'template config is not defined';
    }

    /* VARIAVEIS DESSA CLASSE ABAIXO: */
    context._template                   = classConfig['template'];
    context.quantidadeImagensTemplate   = context._template['template_quantity'];
    context.initialTemplateCapture      = context._template['live_template'];

    if( context.initialTemplateCapture && 
        typeof context.initialTemplateCapture == 'object' 
    ){   
        if( context.initialTemplateCapture['quantity'] )
        {
            console.warn('Live template capture enabled!');
            context.quantidadeImagensTemplate = context.initialTemplateCapture['quantity'];
        }
    }

    /* Obtem as imagens template passadas como parametro */
    context.templates = (classConfig['template'] || {})['templates'] || [];
    context.templateLabels = [];
    context.templateLabels.preenchido = false;

    //Se o usuario passar um array de jsons(contendo imagem e label/nome)
    if( context.templates.length > 0 && 
        typeof context.templates[0] == 'object' &&
        context.templates[0].image != undefined &&
        context.templates[0].label != undefined
    ){
        //Extrai só a lista de imagens
        context.templates = context.templates.map(function(elemento){
            //Adiciona o label da imagem no Array de labels
            context.templateLabels.push( elemento.label );

            //Vincula o label com a imagem
            elemento.image.label = elemento.label;

            return elemento.image;
        });

        context.templateLabels.preenchido = true;
    }

    //Se o usuario passar no classConfig um Array de labels como parametro
    if( context._template['labels'] != undefined &&
        context._template['labels'].length > 0 &&
        context.templateLabels.preenchido == false
    ){
        //Usa os labels passados
        context.templateLabels = context._template['labels'];
        if( context.templateLabels.length != context.templates.length )
        {
            throw 'Voce precisa informar N labels para as suas N imagens template!. Um label por imagem';
        }

        //Vincula o label com a imagem
        context.templates.forEach(function(elemento, indice){
            elemento.label = context.templateLabels[indice];
        });
    }

    context.imagensTeste                = [];                                                                              //Vamos usar isso para armazenar as imagens que vamos testar
    context.camera                      = classConfig['camera'] || null;
    context._sentinel_options           = classConfig['sentinel_options'];
    context.validation                  = classConfig['validation'] || 'percentage';
    context.algoritmo                   = classConfig['algorithm'] || 'default';
    context.template_appending          = context._template['keepOldTemplates'] || false;
    context.quantidadeImagensTeste      = context._sentinel_options['test_quantity'];
    context.porcentagem_acerto          = context._sentinel_options['acceptable_percent'];                                 //% de semelhança exigida
    context.liveMonitoring              = context._sentinel_options['monitoring'] || false;
    context.mainThread_speed            = context._sentinel_options['monitoringSpeed'] || 1000;                            //Quanto maior este valor, mais vai demorar para os escaneamentos serem disparados
    context.tempoAguardarRetornarImagem = context._sentinel_options['imageResponseTime'] || 1000;                          //As vezes é necessário aguardar um pouco, para que a imagem seja completamente carregada
    context.stopCriterius               = context._sentinel_options['stopCriterius'] || {mode: 'someone', criterius: []};
    context.categorize                  = classConfig['categorization'] || context._template['categorize'] || {};          //Configurações de categorização
    context.categorizeTemplates         = context.categorize['templates'] || false;
    context.logger                      = classConfig['logger'] || { history:false }; //Configurações de logging
    context.logger._history = [];
    context.customCallbacks             = classConfig['callbacks'] || {}; //Callbacks personalizados
    
    if( Object.keys(context.customCallbacks)[0].indexOf('.') != -1 )
    {
        context.customCallbacks = context.transformarCallbacksStringEmObjetos(context.customCallbacks);
    }

    context.lastResults = null;

    /**
    * Armazena informações sobre o Scanner 
    */
    context.info = {
        scannerRef: context,
        logger: context.logger,
        scanning: false,
        scansCount: 0,
        consecutiveScans: 0,
        matchCount: 0,
        consecutiveMatchCount: 0,
        notMatchCount: 0,
        consecutiveNotMatchCount: 0
    }

    /*** MÉTODOS DESSA CLASSE ABAIXO: ***/

    /**
    * Obtém informações sobre o último escaneamento
    * @returns {Object}
    */
    context.getLast = function(){
        return context.lastResults;
    }

    /**
    * Obtem o histórico de escaneamentos 
    * @returns {Array}
    */
    context.logger.getHistory = function(){
        return context.logger._history;
    }

    /**
    * Obtem o histórico de escaneamentos 
    * @returns {Array}
    */
    context.getHistory = function(){
        return context.logger.getHistory();
    }

    /**
    * Adiciona uma informação ao histórico
    * @param {Object} informacoesObj
    * @returns 
    */
    context.logger.logHistory = function(informacoesObj){
        if( context.logger.history == true ){
            context.logger._history.push( informacoesObj );
        }
        return context;
    }

    /**
    * Adiciona uma informação ao histórico
    * @param {Object} informacoesObj
    * @returns {Object}
    */
    context.logHistory = function(informacoesObj){
        return context.logger.logHistory(informacoesObj);
    };


    /**
    * Sobrescreve o histórico
    * @param {Array} novoHistorico 
    * @returns {null}
    */
    context.logger.setHistory = function(novoHistorico){
        context.logger._history = novoHistorico;
    }

    /**
    * Aumenta um pouquinho o tempo de espera para retornar a imagem
    * @param {Array} novoHistorico 
    * @returns {null}
    */
    context.increaseImageResponseTime = function(quantoAumentar=1){
        context.tempoAguardarRetornarImagem = context.tempoAguardarRetornarImagem + quantoAumentar;
    }

    /**
    * Diminui um pouquinho o tempo de espera para retornar a imagem
    * @param {Array} novoHistorico 
    * @returns {null}
    */
    context.decreaseImageResponseTime = function(quantoDiminuir=1){
        context.tempoAguardarRetornarImagem = context.tempoAguardarRetornarImagem - quantoDiminuir;
    }

    /**
    * Retorna o logger
    * @returns {Object}
    */
    context.info.getLogger = function(){
        return context.logger;
    }

    /**
    * Retorna o própio SerieScanner
    * @returns {context}
    */
    context.info.getScanner = function(){
        return context;
    }

    /**
    * Obtem as informações/estatisticas do Scanner
    * @returns {Object}
    */
    context.getStatus = function(){
        return context.info;
    }

    /**
    * Chama um callback personalizado que estiver disponivel
    * @param {String} nomeCallback 
    * @returns {any}
    */
    context.dispararCallbackPersonalizado = function(nomeCallback, parametrosObj={}){
        let funcaoObtida;
        //Se tiver niveis de acesso
        if( nomeCallback.indexOf('.') != -1 ){
            funcaoObtida = context.percorrerNiveisEObter(nomeCallback, context.customCallbacks);
        }else{
            funcaoObtida = context.customCallbacks[nomeCallback];
        }

        if( funcaoObtida != undefined &&
            funcaoObtida != null &&
            funcaoObtida != false &&
            typeof funcaoObtida == 'function'
        ){
            //Se tiver niveis de acesso
            if( nomeCallback.indexOf('.') != undefined ){
                return (funcaoObtida.bind(context)( context, parametrosObj ));

            //Se for uma chamada mais simples contendo apenas um nome e não sub niveis
            }else{
                return ( context.customCallbacks[nomeCallback].bind(context)( context, parametrosObj ) );
            }
        }

        return null;
    }

    /**
    * Verifica se um ou mais critérios de parada foram atendidos
    * Em caso afirmativo, ele vai interromper o scanner, encerrando o escaneamento
    * NOTA: os critérios serão sempre verificados após o final de cada escaneamento
    * NOTA: A função de um critério de parada precisa retornar a String 'stop' para ele interromper o escaneamento
    * @returns {Boolean}
    */
    context.verificarCriteriosDeParada = function(){
        let quantidadeBateram = 0;
        for( let i = 0 ; i < context.stopCriterius.criterius.length ; i++ )
        {
            if( context.stopCriterius.criterius[i] != undefined &&
                context.stopCriterius.criterius[i] != null &&
                context.stopCriterius.criterius[i] != false &&
                typeof context.stopCriterius.criterius[i] == 'function'
            ){
                const funcaoChamar = context.stopCriterius.criterius[i].bind(context);

                if( funcaoChamar( context, context.getStatus() ) == 'stop' )
                {
                    quantidadeBateram++;
                }
            }
        }

        let vaiParar = false;
        switch(context.stopCriterius.mode)
        {
            case 'someone':
                if( quantidadeBateram > 0 ){
                    vaiParar = true;
                }
                break;

            case 'all':
                if( quantidadeBateram == context.stopCriterius.criterius.length ){
                    vaiParar = true;
                }
                break;
        }

        if(vaiParar == true){
            context.stop();
        }

        return vaiParar;
    }

    context.dispararCallbackPersonalizado('object.beforeInitialization');

    /**
    * Obtem N imagens da Camera, para usar como templates
    * @returns {null} 
    */
    context.obterTemplate = async function(){
        context.dispararCallbackPersonalizado('template.beforeCapture');

        let ultimosTemplatesObtidos = await context.camera.lerSaidas(context.quantidadeImagensTemplate);
        if( context.template_appending == false ){
            context.templates = ultimosTemplatesObtidos;
        }else{
            //Vai mantendo os templates antigos e acrescenta os novos por cima
            context.templates.push(ultimosTemplatesObtidos);
        }
        
        context.dispararCallbackPersonalizado('template.afterCapture');
    }

    /**
    * Obtem as imagens de teste
    * @return {null}
    */
    context.obterTargets = async function(){
        context.dispararCallbackPersonalizado('test.beforeCapture');
        context.imagensTeste = await context.camera.lerSaidas(context.quantidadeImagensTeste);
        context.dispararCallbackPersonalizado('test.afterCapture');
    }

    /**
    * Função usada para chamar o algoritmo de comparação entre duas imagens
    * Essa função é usada para tudo dentro dessa classe SerieScanner
    * Você pode passar um algoritmo personalizado(em forma de função)
    * OBS: o algoritmo personalizado precisa ser uma função async e também retornar uma Promise no formato de resultado do Scanners
    * @returns {Promise} 
    */
    context.aplicarAlgoritmo = function(imagem1, imagem2, porcentagem_acerto){
        //Aqui vai a implantação do algoritmo escolhido
        if( context.algoritmo == 'default' && typeof context.algoritmo == 'string' ){
            return scanner.utils.semelhancaImagems(imagem1, imagem2, porcentagem_acerto);

        }else{
            //Permite o usuário configurar o algoritmo que ele quer
            //OBS: ele precisa ser uma função async e também retornar uma Promise no formato de resultado do Scanners
            if( typeof context.algoritmo == 'function' ){
                return context.algoritmo(imagem1, imagem2, porcentagem_acerto);
            }
        }
    }

    //Considera que já temos as imagens template e as imagens de teste carregadas na memoria, então simplismente analisamos uma por uma
    context.compararImagensObtidas_por_percentual = async function(){
        return new Promise(function(resolve){
            let resultados = [];          
            let labelsIdentificados = []; //Uma lista com os labels que foram identificados
            let somaEqual = 0;
            let somaDiff = 0;

            //Para Cada template
            for( let i = 0 ; i < context.templates.length ; i++ )
            {
                const fotoTemplateAtual = context.templates[i];

                //Para Cada imagem de teste
                for( let j = 0 ; j < context.imagensTeste.length ; j++ )
                {
                    const fotoTestandoAtual = context.imagensTeste[j];

                    context.aplicarAlgoritmo(fotoTemplateAtual, fotoTestandoAtual, context.porcentagem_acerto)
                    .then(function(resultadoAnalise){
                        resultadoAnalise['comparedWith'] = fotoTemplateAtual.label || null;

                        //Adiciona o label(se existir um label no template que foi identificado)
                        resultadoAnalise['label'] = (resultadoAnalise['bateu'] == true && fotoTemplateAtual.label != undefined) ? fotoTemplateAtual.label : null;
                        if( resultadoAnalise['label'] != undefined )
                        {
                            labelsIdentificados.push( resultadoAnalise['label'] );
                        }

                        somaEqual = somaEqual + resultadoAnalise['equal'];
                        somaDiff  = somaDiff  + resultadoAnalise['different'];
                        resultados.push(resultadoAnalise);
                    });
                }
            }

            let quantidadeAguardos = 0;
            const timerChecagem = setInterval( function(){
                const quantidadeEsperada = context.imagensTeste.length * context.imagensTeste.length;

                //Quando todas as analises atuais acima terminarem
                if( resultados.length >= quantidadeEsperada || quantidadeAguardos > 20000){
                    clearInterval(timerChecagem);
                    
                    //Armazena a média
                    resultados.equalSum = somaEqual;
                    resultados.equalMean = (somaEqual / resultados.length);
                    resultados.differentMean = (somaDiff / resultados.length);
                    resultados.percentageMean = ( (somaEqual*100) / ( Math.abs(somaDiff + somaEqual) ));

                    //Vincula os labels ao objeto de resultados
                    resultados.labels = labelsIdentificados || [];
                    //Cria um getterzinho
                    resultados.getLabels = function(){
                        return resultados.labels;
                    }

                    resolve(resultados);
                }

                quantidadeAguardos++;

            }, 100 );

        });
    },

    /**
    * Muito semelhante ao método anterior, porém, ele faz um histograma das imagens de teste
    * para destacar quais imagens template mais se pareçem com os templates
    * @returns {Object}
    */
    context.compararImagensObtidas_por_relevancia = async function(){
        return new Promise(function(resolve){       
            let somaEqual = 0;
            let somaDiff = 0;
            let histograma = {};
            let feitos = 0;

            //Para Cada teste
            for( let i = 0 ; i < context.imagensTeste.length ; i++ )
            {
                const fotoTestandoAtual = context.imagensTeste[i];

                //Para Cada imagem de template
                for( let j = 0 ; j < context.templates.length ; j++ )
                {
                    const fotoTemplateAtual = context.templates[j];

                    context.aplicarAlgoritmo(fotoTestandoAtual, fotoTemplateAtual, Infinity)
                    .then(function(resultadoAnalise){
                        const imageTemplateLabel   = (scan.templateLabels[j]) || 'undefined';

                        //Se nao existir o imageLabel no associacoes, cria ele
                        if( histograma[i] == undefined )
                        {
                            let objNovo = {};
                            [... scan.templateLabels].forEach(function(elemento){
                                objNovo[elemento] = 0;
                            });
                            histograma[i] = objNovo;
                        }

                        histograma[i][ imageTemplateLabel ] += resultadoAnalise['percentage'];
                        feitos++;

                        somaEqual = somaEqual + resultadoAnalise['equal'];
                        somaDiff  = somaDiff  + resultadoAnalise['different'];
                    });
                }
            }

            let quantidadeAguardos = 0;
            const timerChecagem = setInterval( function(){
                const quantidadeEsperada = context.imagensTeste.length * context.templates.length;

                //Quando todas as analises atuais acima terminarem
                if( feitos >= quantidadeEsperada || quantidadeAguardos > 20000){
                    clearInterval(timerChecagem);
                    
                    //Armazena a média
                    histograma.equalSum = somaEqual;
                    histograma.equalMean = (somaEqual / context.templates.length);
                    histograma.differentMean = (somaDiff / context.templates.length);
                    histograma.percentageMean = ( (somaEqual*100) / ( Math.abs(somaDiff + somaEqual) ));

                    //TODO: tratar como estimativas isoladas ou agregadas
                    resolve(histograma);
                }

                quantidadeAguardos++;

            }, 100 );

        });
    }

    /**
    * Classifica automaticamente as imagens de template, para associar elas com outras templates,
    * Para cada template, ele vai associar com as N imagens template que o template atual mais se pareçe 
    * 
    * @returns {Object} - um histograma que mostra para cada template, quais templates são mais parecidos
    */
    context.autoClassificarImagensTemplateEntreSi = function(nTemplates=2){
        return new Promise(function(resolve){
            //Vai refletir aqui as associações encontradas
            let associacoes = {};      
            let feitos = 0;    
        
            //Para Cada template
            for( let i = 0 ; i < context.templates.length ; i++ )
            {
                const fotoTemplateBase = context.templates[i];

                //Para Cada imagem de template(novamente)
                for( let j = 0 ; j < context.templates.length ; j++ )
                {
                    const fotoTemplateAtual = context.templates[j];

                    context.aplicarAlgoritmo(fotoTemplateBase, fotoTemplateAtual, null)
                    .then(function(resultadoAnalise){
                        const imageLabel   = (fotoTemplateBase.label) || 'undefined';
                        const currentLabel = (fotoTemplateAtual.label) || 'undefined';

                        //Se nao existir o imageLabel no associacoes, cria ele
                        if( associacoes[imageLabel] == undefined )
                        {
                            let objNovo = {};
                            [... scan.templateLabels].forEach(function(elemento){
                                objNovo[elemento] = 0;
                            });
                            associacoes[imageLabel] = objNovo;
                        }

                        //Constroi o histograma, com as porcentagens
                        associacoes[imageLabel][currentLabel] += resultadoAnalise['percentage'];


                        //Calcula e atualiza a faixa comum para o template atual
                        let mediaFaixaComum_esteTemplate = 0;
                        //Para o template atual, ele vai tirar uma média da porcentagem de semelhança comum
                        const templateScan = associacoes[imageLabel];
                        Object.keys(templateScan).forEach(function(keyAtualItem){
                            const value = templateScan[keyAtualItem];

                            //Ignora a que for 100%
                            if(value && value != 100)
                            {
                                mediaFaixaComum_esteTemplate += value;
                            }

                        });
                        //Ali usei -1 por que ignoro o 100(ele mesmo)
                        associacoes[imageLabel].mediaComum = (mediaFaixaComum_esteTemplate/(Object.keys(templateScan).length - 1));
                        


                        //Vincula o histograma de semelhanças no estado atual dele com o template atual
                        fotoTemplateBase.semelhances = {
                            histogram: associacoes[imageLabel]
                        };

                        //Vincula o semelhances atual com o scanner
                        context.templateSemelhances = associacoes;

                        feitos++;
                    });
                }
            }

            let quantidadeAguardos = 0;
            const timerChecagem = setInterval( function(){
                const quantidadeEsperada = context.templates.length * context.templates.length;

                //Quando todas as analises atuais acima terminarem
                if( feitos >= quantidadeEsperada || quantidadeAguardos > 20000){
                    clearInterval(timerChecagem);

                    //Calcula a faixa comum
                    let mediaFaixaComum = 0;
                    let keysRoot = Object.keys(associacoes);

                    //Para cada imagem, ele vai tirar uma média da porcentagem de semelhança comum
                    keysRoot.forEach(function(keyAtualRoot){
                        const rootItem = associacoes[keyAtualRoot];
                        mediaFaixaComum += rootItem['mediaComum'];
                    });
                    mediaFaixaComum = mediaFaixaComum/keysRoot.length;

                    //Calcula a média das porcentagens de semelhança, pra descobrir a média delas
                    associacoes.mediaComum = mediaFaixaComum;

                    resolve(associacoes);
                }

                quantidadeAguardos++;

            }, 100 );

        });
    }

    /*
    * Obtem as imagens aturais e faz uma varredura nessas imagens atuais
    */ 
    context.analisarCena = async function(){
        return new Promise(function(resolve){
            context.obterTargets();
        
            setTimeout(async() => {
                let resultados;
                switch( context.validation ){
                    case 'percentage':
                    case 'limiar':
                        resultados = await context.compararImagensObtidas_por_percentual();
                        break;

                    case 'mostrelevant':
                    case 'mostsemelhant':
                    case 'histogram':
                        resultados = await context.compararImagensObtidas_por_relevancia();
                        break;
                }
            
                resolve(resultados);
            }, 1500);
        });
    }

    /**
    * Faz uma analise de N imagens, de forma independente
    * @param {Array} samplesAsTemplate 
    * @returns {Object}
    */
    context.analizeSamples = function(samplesAsTemplate){
        return new Promise(function(resolve){

            const scanner_a_parte = scanner.SerieScanner({
                camera: context.camera, //A mesma camera criada

                template: {
                    templates: context.templates,

                    /**
                    * Quantidade de imagens a serem usadas como template 
                    */
                    template_quantity: context.quantidadeImagensTemplate,

                    keepOldTemplates: false
                },

                sentinel_options: {
                    /**
                    * Quantidade de imagens que ele vai bater,
                    * para começar a analisar
                    * use uma quantidade suficiente pra escanear bem o ambiente atual
                    */
                    test_quantity: context.quantidadeImagensTeste,

                    /**
                    * Porcentagem aceita para ser validado como uma identificação
                    * No minimo 40%
                    */
                    acceptable_percent: context.porcentagem_acerto,

                    /**
                    * Já inicia o monitoramento com o template atual(que estiver cadastrado)
                    */
                    monitoring: false,

                    /**
                    * A cada 3 segundos ele bate uma foto
                    */
                    monitoringSpeed: context.mainThread_speed,
                    
                    /**
                    * Depois que essa foto é obtida, 
                    * ele aguarda mais 1 segundo 
                    * para só então começar a processar a imagem 
                    */
                    imageResponseTime: context.tempoAguardarRetornarImagem
                },

                callbacks: {
                    'object.afterInitialization': function(contextoScannner, resultadosAtuais){
                
                    }
                }
            });

            setTimeout(async() => {
            
                //Define as amostras
                scanner_a_parte.imagensTeste = samplesAsTemplate;

                //Manda analisar estas amostras
                scanner_a_parte.compararImagensObtidas()
                .then( function(resultadosAtuais){
                    resolve(resultadosAtuais);
                } );


            }, 1500);
        });
    }

    /**
    * Thread que fica responsável pelo loop do scanner,
    * ela fica o tempo todo escanerando a cena atual(obtida em tempo real pela camera)
    */
    context.mainThread = function(){
        
        return new Promise(async function(){
            context.dispararCallbackPersonalizado('scanner.currentTime.beforeScan', {});
            let timeAntes = new Date().getTime();

            let resultadosUltimaAnalise = await context.analisarCena();

            setTimeout(function(){
                context.dispararCallbackPersonalizado('scanner.currentTime.afterScan', {
                    resultados: resultadosUltimaAnalise
                });

                /*
                * Se não vier imagem nenhuma, é problema de Timeout
                * este callback será chamado se aparantemente o tempo de resposta da imagem não foi suficiente
                * ou seja, caso as imagens do escaneamento atual ainda não estejam prontas para leitura
                */
                if( resultadosUltimaAnalise.length == 0 )
                {
                    context.dispararCallbackPersonalizado('scanner.currentTime.whenInsuficientResponseTime', {
                        resultados: resultadosUltimaAnalise
                    });
                }

                if( context.logger.history == true )
                {
                    resultadosUltimaAnalise['startime']       = timeAntes;
                    resultadosUltimaAnalise['endtime']        = new Date().getTime();
                    resultadosUltimaAnalise['duration']       = Math.abs( resultadosUltimaAnalise['startime'] - resultadosUltimaAnalise['endtime'] );
                    resultadosUltimaAnalise['description']    = `scan-${resultadosUltimaAnalise['time']}`;
                    resultadosUltimaAnalise['equalMean']      = resultadosUltimaAnalise['equalMean'];
                    resultadosUltimaAnalise['differentMean']  = resultadosUltimaAnalise['differentMean'];
                    resultadosUltimaAnalise['percentageMean'] = resultadosUltimaAnalise['percentageMean'];
                    context.logger.logHistory(resultadosUltimaAnalise);
                }
                context.lastResults = {... resultadosUltimaAnalise};

                //Para cada tentantiva
                let quantidadesBateram = 0;
                for( let j = 0 ; j < resultadosUltimaAnalise.length ; j++ )
                {
                    const resultadosUltimaAnalise_atual = resultadosUltimaAnalise[j];

                    if( resultadosUltimaAnalise_atual['bateu'] == true ){
                        quantidadesBateram++;
                        context.info.matchCount++;
                        context.info.consecutiveMatchCount++;
                        context.info.consecutiveNotMatchCount = 0;
                        context.dispararCallbackPersonalizado('scanner.currentTime.whenSomeoneMatch', {
                            resultados: resultadosUltimaAnalise_atual,
                            bateu: resultadosUltimaAnalise_atual['bateu'],
                            percentage: resultadosUltimaAnalise_atual['percentage'],
                        });
    
                    }else{
                        context.info.notMatchCount++;
                        context.info.consecutiveNotMatchCount++;
                        context.info.consecutiveMatchCount = 0;
                        context.dispararCallbackPersonalizado('scanner.currentTime.whenLastNotMatch', {
                            resultados: resultadosUltimaAnalise_atual,
                            bateu: resultadosUltimaAnalise_atual['bateu'],
                            percentage: resultadosUltimaAnalise_atual['percentage']
                        });
                    }
                }

                //Se todos bateram
                if(quantidadesBateram == resultadosUltimaAnalise.length)
                {
                    context.dispararCallbackPersonalizado('scanner.currentTime.ifAllMatch', {
                        resultados: resultadosUltimaAnalise
                    });
                }

                //Se nenhum bateu
                if( quantidadesBateram == 0 )
                {
                    context.dispararCallbackPersonalizado('scanner.currentTime.ifNobodyMatch', {
                        resultados: resultadosUltimaAnalise
                    });
                }
    
                context.info.consecutiveScans++;
                context.info.scansCount++;

                //Verifica os critérios de parada
                context.verificarCriteriosDeParada();
                
            }, context.tempoAguardarRetornarImagem);

        });

    }

    /**
    * Inicia o monitoramento
    * @returns {window.scanner.SerieScanner} - este SerieScanner
    */
    context.start = function(){
        context.dispararCallbackPersonalizado('scanner.beforeStart');
        context._mainTheadID = window.setInterval(function(){
            context.info.scanning = true;
            context.mainThread();  
            context.info.lastStartTime = new Date().getTime();
            context.dispararCallbackPersonalizado('scanner.afterStart');

        }, context.mainThread_speed);

        return context;
    }

    /**
    * Interrompe o monitoramento
    * @returns {window.scanner.SerieScanner} - este SerieScanner
    */
    context.stop = function(){
        context.dispararCallbackPersonalizado('scanner.beforeStop');
        if( context._mainTheadID ){
            context.info.scanning = false;
            context.info.consecutiveScans = 0;
            context.info.lastEndTime = new Date().getTime();
            window.clearInterval(context._mainTheadID);
            context.dispararCallbackPersonalizado('scanner.afterStop');
        }
        return context;
    }

    /**
    * Apaga todos os templates cadastrados
    * @returns {window.scanner.SerieScanner} - este SerieScanner
    */
    context.clearTemplates = function(){
        context.dispararCallbackPersonalizado('scanner.beforeClearTemplates');
        context.templates = [];
        context.dispararCallbackPersonalizado('scanner.afterClearTemplates');
        return context;
    }

    /* Se for ter uma captura de templates iniciais */
    if( context.initialTemplateCapture != undefined &&
        context.initialTemplateCapture != null && 
        context.initialTemplateCapture != false &&
        typeof context.initialTemplateCapture == 'object' &&
        context.initialTemplateCapture['enabled'] == true
    ){
        context.dispararCallbackPersonalizado('live_template.beforeCapture');

        //Aguarda o tempo
        setTimeout( function(){
            //Obtem as imagens iniciais que serão usadas de base
            context.obterTemplate();
            context.dispararCallbackPersonalizado('live_template.afterCapture');
            
        }, (context.initialTemplateCapture['wait_time'] || 500) );
    }

    /* Se já for iniciar monitorando, chama o start */
    if( context.liveMonitoring == true ){
        context.start();
    }

    /* Se for categorizar os templates */
    if( context.categorizeTemplates == true ){
        context.autoClassificarImagensTemplateEntreSi();
    }

    context.dispararCallbackPersonalizado('object.afterInitialization');

    return context;
}

/**
* Funções estáticas auxiliares que são usadas no Scanner acima
*/
scanner.utils = {
    colocarDelay: async function(tempo) {
        return new Promise(function(resolve){
            setTimeout(resolve, tempo)
        });
    },

    aguardarCarregamentos: async function(imagens, callback){
        let terminadas = 0;

        while(true){
            for( let i = 0 ; i < imagens.length ; i++ )
            {
                if( imagens[i].src != '' && imagens[i].complete == true || imagens[i].chamouOnload != undefined )
                {
                    terminadas++;
                }

                imagens[i].onload = function(){
                    this.chamouOnload = true;
                }
            }

            if( terminadas >= imagens.length ){
                await callback(imagens);
                break;
            }
        }
    },

    escutar: async function(contextoMonitorar, callbackMonitoramento, callbackFinal=null){
      
        setTimeout( function(){

            let contextoEscuta = {
                rodando: true,

                finalizar: function(){
                    this.rodando = false;
                }
            };

            while(contextoEscuta.rodando == true)
            {
                //Fica chamando a função de monitoramento
                const funcao = callbackMonitoramento.bind(contextoEscuta)(contextoMonitorar, contextoEscuta);
            }

            if( contextoEscuta.rodando == false ){
                if( callbackFinal != undefined && callbackFinal != null ){ callbackFinal.bind(contextoEscuta)() };
            }

        }, 10 );
    },

    /**
    * Cria uma imagem usando um base64
    * @param {String} dataUrl 
    * @returns {Image}
    */
    criarImagem: function(dataUrl){

        return new Promise(function(resolve, reject){
            const imagem = document.createElement('img');
            const instanciaId = `imagem${ scanner.enumerarInstancia() }`;
            imagem.crossOrigin = "anonymous";
            imagem.setAttribute("crossOrigin", "");
            imagem.setAttribute("id", instanciaId);

            imagem.onload = function(){
                resolve(this); 
            }

            setTimeout(function(){
                imagem.src = dataUrl;
            }, 100);

        });

    },

    cortarImagem: async function(imagemOriginal, novoX, novoY, novaLargura, novaAltura) {

        return new Promise(async function(resolve){
            //Cria um novo canvas
            const canvas = scanner.pagina.criarElementoHtml('canvas');

            canvas.aplicarAtributos({
                width: novaLargura,
                height: novaAltura
            })
             
            const ctx = canvas.getElemento()
                              .getContext('2d');

            ctx.drawImage(imagemOriginal, novoX, novoY, novaAltura, novaAltura, 0, 0, novaAltura, novaAltura); 

            const imagemCortada = await scanner.utils.criarImagem( 
                                                                   canvas.getElemento()
                                                                         .toDataURL() 
                                                                 );
           	
            resolve(imagemCortada);        
        });
        
    },

    extrairPixels: async function(imagem){
        //Cria um novo canvas
        const canvas = scanner.pagina.criarElementoHtml('canvas');

        canvas.aplicarAtributos({
            width: imagem.width,
            height: imagem.height
        })

        document.body.appendChild(canvas.getElemento());

        const ctx = canvas.getElemento()
                          .getContext('2d');

        ctx.drawImage(imagem, 0, 0, canvas.getElemento().width, canvas.getElemento().height);

        let pixelData = ctx.getImageData(0, 0, canvas.getElemento().width, canvas.getElemento().height);
        document.body.removeChild(canvas.getElemento());

        const resposta = {
            data: pixelData.data,
        };

        return resposta;
    },

    /**
    * Algoritmo simples para analisar duas imagens, comparando os pixels de ambas
    * @param {Image} imagem1
    * @param {Image} imagem2
    */
    semelhancaImagems: async function(imagem1, imagem2, porcentagemAceito){
        const A = imagem1 instanceof Array ? imagem1 : (await this.extrairPixels(imagem1)).data;
        const B = imagem2 instanceof Array ? imagem2 : (await this.extrairPixels(imagem2)).data;
        let equal = 0;
        let different = 0;
        let ignored = 0;

        for( let i = 0 ; i < A.length ; i++ ){
            if(A[i] == B[i]){
                equal++

            } else {
                different++;
            }
        }

        let porcentagem = (equal*100) / (A.length - ignored);

        return { 
                 equal: equal, 
                 different: different,
                 percentage: porcentagem,
                 bateu: porcentagem >= porcentagemAceito
               };
    },

    /**
    * Tenta extrair um rosto na imagem(usando um método muito simples de corte)
    * @param {Image} foto 
    * @returns {Image}
    */
    extrairRostoNaImagem: async function(foto){
        const contexto = this;
        //Corta a imagem na area onde acho que é o rosto(uma area qualquer que eu defini)
        return [ (await contexto.cortarImagem(foto, 80, 80, 120, 120)) ];
    },

    /**
    * Deixa a imagem em tons de cinza
    * @param {Image} foto 
    * @returns {Image}
    */
    tonsDeCinza: async function(foto) {
        return new Promise( async function(resolve) {
            //Cria um novo canvas
            const canvas = scanner.pagina.criarElementoHtml('canvas');

            canvas.aplicarAtributos({
                width: foto.width,
                height: foto.height
            })

            const ctx = canvas.getElemento()
                              .getContext('2d');

            ctx.filter = 'grayscale(1)';
            ctx.drawImage(foto, 0, 0, canvas.width, canvas.height);

            const dadosb64Imagem = canvas.getElemento()
                                         .toDataURL();

            const fotoProcessada = await scanner.utils.criarImagem( dadosb64Imagem );

            resolve(fotoProcessada);
        
        });
    },

    redimensionarFoto: function(foto, novaLargura, novaAltura){
        return new Promise(async function(resolve){
            //Cria um novo canvas
            const canvas = scanner.pagina.criarElementoHtml('canvas');

            canvas.aplicarAtributos({
                width: 0,
                height: 0
            })

            const ctx = canvas.getElemento()
                            .getContext('2d');

            canvas.width = novaLargura;
            canvas.height = novaAltura;

            ctx.drawImage(foto, 0,0, novaLargura, novaAltura);

            const dadosb64Imagem = canvas.getElemento()
                                        .toDataURL();
            
            const fotoProcessada = await scanner.utils.criarImagem( dadosb64Imagem );

            resolve(fotoProcessada);
        });
    },

    //Procura se uma imagem aparece numa foto, e retorna os dados sobre ela
    findImageInImage: async function(template, target, porcentoAceito=28){
        const contexto = this;

        return new Promise( async function(resolve) {

            try{
                const facesTemplate = await contexto.extrairRostoNaImagem(template);
                const facesTarget   = await contexto.extrairRostoNaImagem(target);

                let templateFace = facesTemplate[facesTemplate.length-1];
                let targetFace = facesTarget[facesTarget.length-1];

                let templateFace_BRILHO_IGUAL = templateFace;
                let targetFace_BRILHO_IGUAL = targetFace;

                //Talves tentar normalizar o brilho

                async function int_getAnalise(tempFace, targFace){
                    const templateFaceGray = await contexto.tonsDeCinza(tempFace);
                    const targetFaceGray = await contexto.tonsDeCinza(targFace);

                    /*IGUALA A LAGURA E A ALTURA*/
                    const resizedTargetFace = await contexto.redimensionarFoto( targetFaceGray, templateFaceGray.width, templateFaceGray.height );
                    
                    //Aplica o algoritmo de analise escolhido
                    const analise = contexto.semelhancaImagems(await contexto.extrairPixels(templateFaceGray).data, await contexto.extrairPixels(resizedTargetFace).data, porcentoAceito);

                    //Retorna o resultado
                    return analise;
                }

                let analiseAtual = await int_getAnalise(templateFace_BRILHO_IGUAL, targetFace_BRILHO_IGUAL);
                
                let porcentosHIP = [];
                let porcentosHIP_PRETOBRANCO = [];
                porcentosHIP.push(analiseAtual.porcentoIgual);

                //Pega a possibilidade dessas testadas que os pixels sao mais iguais, mais bateram
                analiseAtual.porcentoIgual = contexto.array.max( porcentosHIP );

                //Retorna o resultado
                resolve(analiseAtual);

            }catch(e){
                throw e;
            }

        });
    },

    /*
    * Especifico pra tentar localizar imagens em uma foto
    * Compara varias imagens na imagem e diz quais deles apareceu na foto com % maior ou igual que porcentoAceito
    */
    findAll: async function(templatesProcurar, targets, porcentoAceito=28, porcentoDuvida=16){
        const contexto = this;

        return new Promise( async function(resolve) {
            /*Rostos que deram % maior ou igual que porcentoAceito*/
            const dadosBateram = [];
            const somentePorcentoBateram = [];
            const bateram = [];

            /*Rostos POSSIVEIS que NÂO SÂO CERTEZA, POREM QUE DERAM % maior ou igual que porcentoDuvida*/
            const dadosPodeSer = [];
            const somentePorcentosPodeSer = [];
            const podeSer = [];

            const somentePorcentosNaoBateu = [];

            //todos os resultados
            const pesquisasFeitas = [];

            //Para cada face
            const checagemLacoRepeticao = async function(templateAtualEstaBuscando, targetAtual) {

                const pesquisaImagem = await contexto.findImageInImage(templateAtualEstaBuscando, targetAtual, porcentoAceito);
                pesquisasFeitas.push(pesquisaImagem);

                //Se bateu
                if( pesquisaImagem.bateu ){

                    dadosBateram.push( {

                        face          : templateAtualEstaBuscando,
                        targetTestado : targetAtual,
                        resultados    : pesquisaImagem

                    } );

                    somentePorcentoBateram.push( pesquisaImagem.porcentoIgual );
                    bateram.push(templateAtualEstaBuscando);


                //Caso nao bater com exatidao
                }else{

                    somentePorcentosNaoBateu.push(pesquisaImagem.porcentoIgual);

                    //POREM, Se pelo menos foi aproximado
                    if( pesquisaImagem.porcentoIgual >= porcentoDuvida ){

                        dadosPodeSer.push( {

                            face           : templateAtualEstaBuscando,
                            targetTestado  : targetAtual,
                            resultados     : pesquisaImagem
                            
                        } );

                        somentePorcentosPodeSer.push( pesquisaImagem.porcentoIgual );
                        podeSer.push(templateAtualEstaBuscando);
                    }

                }

                return true;

            }
            
            targets.map( async function(targetTestando, indexTarget){

                //MAIS RAPIDO PODEM NAO PERMITE PEGAR OS DADOS EM ORDEM DE EXECUCAO, È EM PARALELO
                templatesProcurar.map( async function(templateAtualEstaBuscando, indexFace) {
                    const resUltimo = await checagemLacoRepeticao(templateAtualEstaBuscando, targetTestando);

                    console.log(resUltimo);

                    //Se for o ultimo, ele manda o resultado
                    if( indexFace == templatesProcurar.length-1 &&
                        indexTarget == targets.length-1

                    ){
        
                        resolve({

                            dadosBateram      : dadosBateram,
                            bateram           : bateram,
                            porcentosBateram  : somentePorcentoBateram,

                            dadosPodeSer      : dadosPodeSer,
                            podeSer           : podeSer,
                            porcentosPodeSer  : somentePorcentosPodeSer,

                            templatesUsados   : templatesProcurar,
                            targetsTestados   : targets,
                            todosResultados   : pesquisasFeitas,

                            //Todas as porcentagens que nao bateram em um array
                            porcentosNaoBateu : somentePorcentosNaoBateu

                        });
                    }

                });

            } )
            
        });
    },

    /*
    * Procura cada uma das imagens, e diz se pelo menos uma foi identificada
    * E tambem retorna se pelo menos uma foi classificada como possivel
    */
    verificarCorrespondencia: function(templatesProcurar, targets, porcentoAceito=28, porcentoDuvida=16){
        const contexto = this;

        return new Promise( async function(resolve) {

            const pesquisaImagems = await contexto.findAll(templatesProcurar, targets, porcentoAceito, porcentoDuvida, false);

            resolve({

                encontrada       : pesquisaImagems.bateram.length > 0,
                possibilidadeSer : pesquisaImagems.podeSer.length > 0,

                templatesUsados  : templatesProcurar,
                targetsTestados  : targets,
                resultados       : pesquisaImagems

            });
            

        });
    }
}