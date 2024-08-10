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
    context.templates = [];
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
        context._mainTheadID = window.setInterval(function(){
            context.info.scanning = true;
            context.mainThread();  
            context.info.lastStartTime = new Date().getTime();

        }, context.mainThread_speed);
    }

    context.stop = function(){
        if( context._mainTheadID ){
            context.info.scanning = false;
            context.info.consecutiveScans = 0;
            context.info.lastEndTime = new Date().getTime();
            window.clearInterval(context._mainTheadID);
        }
    }

    if( context.liveMonitoring == true ){
        context.start();
    }

    context.dispararCallbackPersonalizado('object.afterInitialization');

    return context;
}
