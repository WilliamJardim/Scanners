/**
* WilliamJardim/Scanners © 2024 by William Alves Jardim is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International. 
* To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/
*/

/**
* Funções estáticas auxiliares que são usadas no Scanner acima
*/
scanner.utils.imagem = {
    colocarDelay: async function(tempo) {
        return new Promise(function(resolve){
            setTimeout(resolve, tempo)
        });
    },

    /* Permite baixar um objeto Image, como um arquivo PNG ou JPEG */
    baixarImagem: function(imagemParametro, nomeArquivo='imagem.jpeg'){
        const oLinkDaImagem = scanner.utils.pagina.criarElementoHtml('a').getElemento();

        document.body.appendChild(oLinkDaImagem);
        oLinkDaImagem.setAttribute('href', imagemParametro.src);
        oLinkDaImagem['download'] = nomeArquivo;
        oLinkDaImagem['click']();

        setTimeout(function(){
            document.body.removeChild(oLinkDaImagem);
        }, 10);
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
                resolve(imagem); 
            }

            setTimeout(function(){
                imagem.src = dataUrl;
            }, 100);

            //Função para evitar enrosco
            setTimeout(function(){
                resolve(imagem); 
            }, 3000);

        });

    },

    cortarImagem: async function(imagemOriginal, novoX, novoY, novaLargura, novaAltura) {

        return new Promise(async function(resolve){
            //Cria um novo canvas
            const canvas = scanner.utils.pagina.criarElementoHtml('canvas');

            canvas.aplicarAtributos({
                width: novaLargura,
                height: novaAltura
            })
             
            const ctx = canvas.getElemento()
                              .getContext('2d');

            ctx.drawImage(imagemOriginal, novoX, novoY, novaAltura, novaAltura, 0, 0, novaAltura, novaAltura); 

            const imagemCortada = await scanner.utils.imagem.criarImagem( 
                                                                   canvas.getElemento()
                                                                         .toDataURL() 
                                                                 );
                                                                   
            resolve(imagemCortada);        
        });
        
    },

    /**
    * Pega uma imagem, e extrai os pixels dela, em um Array
    * @param {Image} imagem 
    * @returns {Object/Promise}
    */
    extrairPixels: function(imagem){
        return new Promise(function(resolve){
            //Cria um novo canvas
            const canvas = scanner.utils.pagina.criarElementoHtml('canvas', String(new Date().getTime()) );
            document.body.appendChild(canvas.getElemento());

            setTimeout(function(){
                canvas.aplicarAtributos({
                    width: imagem.width,
                    height: imagem.height
                })
    
                setTimeout(function(){
                    const ctx = canvas.getElemento()
                                .getContext('2d');
    
                    setTimeout(function(){
                        ctx.drawImage(imagem.imagem, 0, 0, canvas.getElemento().width, canvas.getElemento().height);
        
                        setTimeout(function(){
                            
                            let pixelData = ctx.getImageData(0, 0, canvas.getElemento().width, canvas.getElemento().height);
                            document.body.removeChild(canvas.getElemento());
                
                            const resposta = {
                                data: pixelData.data,
                            };
                
                            //Da um tempo antes de responder
                            setTimeout(function(){
                                resolve(resposta);
                
                            }, 100);

                        }, 200)

                    }, 100);

                }, 200)

            },50)
        })
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
            const canvas = scanner.utils.pagina.criarElementoHtml('canvas');

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

            const fotoProcessada = await scanner.utils.imagem.criarImagem( dadosb64Imagem );

            resolve(fotoProcessada);
        
        });
    },

    redimensionarFoto: function(foto, novaLargura, novaAltura){
        return new Promise(async function(resolve){
            //Cria um novo canvas
            const canvas = scanner.utils.pagina.criarElementoHtml('canvas');

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
            
            const fotoProcessada = await scanner.utils.imagem.criarImagem( dadosb64Imagem );

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