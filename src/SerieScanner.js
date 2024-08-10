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

    //Variaveis
    context.camera                      = classConfig['camera'] || null;
    context.quantidadeImagensTemplate   = classConfig['template_quantity'] || 5;
    context.initialTemplateCapture      = classConfig['live_template'] || null;
    context.quantidadeImagensTeste      = classConfig['test_quantity'] || 3;
    context.porcentagem_acerto          = classConfig['acceptable_percent'] || 80; //% de semelhança exigida
    context.customCallbacks             = classConfig['callbacks'] || {};

    if( Object.keys(classConfig['callbacks'])[0].indexOf('.') != -1 ){
        context.customCallbacks = context.transformarCallbacksStringEmObjetos(context.customCallbacks);
    }

    context.liveMonitoring              = classConfig['monitoring'] || false;
    context.template_appending          = classConfig['keepOldTemplates'] || false;

    //Quanto maior este valor, mais vai demorar para os escaneamentos serem disparados
    context.mainThread_speed            = classConfig['monitoringSpeed'] || 1000;

    //As vezes é necessário aguardar um pouco, para que a imagem seja completamente carregada
    context.tempoAguardarRetornarImagem = classConfig['imageResponseTime'] || 1000;

    context.info = {
        scanning: false,
        scansCount: 0,
        consecutiveScans: 0,
        matchCount: 0,
        consecutiveMatchCount: 0,
        notMatchCount: 0,
        consecutiveNotMatchCount: 0
    }

    context.getStatus = function(){
        return context.info;
    }

    if( context.initialTemplateCapture && typeof context.initialTemplateCapture == 'object' )
    {   
        if( context.initialTemplateCapture['quantity'] )
        {
            console.warn('Live template capture enabled!');
            context.quantidadeImagensTemplate = context.initialTemplateCapture['quantity'];
        }
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

    context.dispararCallbackPersonalizado('object.beforeInitialization');

    //Obtem as imagens template
    context.templates = classConfig['templates'] || [];
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

    //Obtem as imagens de teste
    context.imagensTeste = [];
    context.obterTargets = async function(){
        context.dispararCallbackPersonalizado('test.beforeCapture');
        context.imagensTeste = await context.camera.lerSaidas(context.quantidadeImagensTeste);
        context.dispararCallbackPersonalizado('test.afterCapture');
    }

    //Considera que já temos as imagens template e as imagens de teste carregadas na memoria, então simplismente analisamos uma por uma
    context.compararImagensObtidas = async function(){
        return new Promise(function(resolve){
            let resultados = [];

            for( let i = 0 ; i < context.templates.length ; i++ )
            {
                const fotoTemplateAtual = context.templates[i];

                for( let j = 0 ; j < context.imagensTeste.length ; j++ )
                {
                    const fotoTestandoAtual = context.imagensTeste[j];

                    scanner.utils.semelhancaImagems(fotoTemplateAtual, fotoTestandoAtual, context.porcentagem_acerto)
                    .then(function(resultadoAnalise){
                        resultados.push(resultadoAnalise);
                    });
                }
            }

            let quantidadeAguardos = 0;
            const timerChecagem = setInterval( function(){
                const quantidadeEsperada = context.imagensTeste.length * context.imagensTeste.length;

                if( resultados.length >= quantidadeEsperada || quantidadeAguardos > 20000){
                    clearInterval(timerChecagem);
                    resolve(resultados);
                }

                quantidadeAguardos++;

            }, 100 );

        });
    }

    //Obtem as imagens aturais e faz uma varredura nessas imagens atuais
    context.analisarCena = async function(){
        return new Promise(function(resolve){
            context.obterTargets();
        
            setTimeout(async() => {
                const resultados = await context.compararImagensObtidas();
                resolve(resultados);
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
            let resultadosUltimaAnalise = await context.analisarCena();

            setTimeout(function(){
                context.dispararCallbackPersonalizado('scanner.currentTime.afterScan', {
                    resultados: resultadosUltimaAnalise
                });

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
                
            }, context.tempoAguardarRetornarImagem);

        });

    }

    //Se for ter uma captura de templates iniciais
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

    context.clearTemplates = function(){
        context.dispararCallbackPersonalizado('scanner.beforeClearTemplates');
        context.templates = [];
        context.dispararCallbackPersonalizado('scanner.afterClearTemplates');
        return context;
    }

    if( context.liveMonitoring == true ){
        context.start();
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