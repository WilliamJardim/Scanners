/**
* WilliamJardim/Scanners © 2024 by William Alves Jardim is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International. 
* To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/
*/

/**
 * Exemplo de uso:
 *     var camera = scanner.Camera({ 
 *          pai: 'corpo',
 *          sentido: 'frontal'
 *     });
 * 
 *     var saida = camera.lerSaida();
 *     var imagem = (await saida).getImagem();
 * 
 * @param {Object} classConfig 
 * @returns {scanner.Camera}
 */
window.scanner.Camera = function(classConfig={})
{
    const context = scanner.Base( {...classConfig} );
    const instanciaId = `camera${ scanner.enumerarInstancia() }`;

    context.autoAdicionar = classConfig['adicionar'] || true;
    context.pai = classConfig['pai'];

    context.interpretarModo = function(modoArgumento){
        let modoIdentificado = 'user';
        switch(modoArgumento){
            case 'user':
            case 'frontal':
            case 'da frente':
            case 'de frente':
                modoIdentificado = 'user';
                break;

            case 'environment':
            case 'traz':
            case 'traseira':
            case 'de traz':
                modoIdentificado = 'environment';
                break;
        }

        return modoIdentificado;
    }

    context.modo = context.interpretarModo( classConfig['sentido'] ); // 'frontal' para frontal OU ENTÂO 'traz' para de traseira
    context.inicializado = false;
    context.inserido = false;

    context.configuracoesUsadas = { 
        video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            facingMode: context.modo || 'user'
        } 
    }

    /**
    * Cria a instancia que recebe as capturas
    * @returns {HTMLVideoElement}
    */
    context._criarGravador = function(){
        context.gravadorControle = scanner.utils.pagina.criarElementoHtml('video', 'video'+instanciaId);
        context.gravadorControle.ocultar();
        context.gravador = context.gravadorControle.getElemento();

        return context.gravador;
    }
    
    /**
    * Cria a instancia que recebe os resultados
    * @returns {HTMLCanvasElement}
    */
    context._criarCanvas = function(){
        context.idInstanciaCanvas = 'canvas'+instanciaId;
        context.canvasControle = scanner.utils.pagina.criarElementoHtml('canvas', context.idInstanciaCanvas);
        context.canvasControle.estilizar({
            width: '600px',
            height: '400px'
        });
        context.canvas = context.canvasControle.getElemento();
        context.canvasContext = context.canvas.getContext('2d');

        return context.canvas;
    }

    /**
    * Inicia a camera
    * @returns {null}
    */
    context._iniciarCaptura = function(){
        // Ler a webcam
        navigator.mediaDevices.getUserMedia(context.configuracoesUsadas)
        .then(stream => {
            context.streamRef = stream;
            context.gravador.srcObject = stream;
            context.inicializado = true;

            context.gravador.play();
            return new Promise((resolve) => {
                context.gravador.onloadeddata = () => {
                    console.log('Objeto Camera iniciado');
                    if( context.autorizado != undefined && typeof context.autorizado == 'function' ){
                        context.autorizado(context);
                    }
                    resolve();
                };
            });

        }).catch(err => {
            console.error('Não! deu pra obter a webcam: ', err);
        });
    }

    /**
    * Inicia a camera
    * @returns {null}
    */
    context.iniciarCaptura = function(){
        if(context.inserido == false){ throw 'O objeto precisa estar criado!' };
        if(context.inicializado == true){ throw 'O objeto ja foi iniciado!' };

        if( context.inserido == true && context.inicializado == false )
        {
            context._iniciarCaptura();
        }
    }

    /**
    * Para tudo
    * @returns {null}
    */
    context.pararCaptura = function(){
        if (context.streamRef) {
            context.streamRef.getTracks().forEach(track => track.stop());
            context.gravador.srcObject = null;
            context.inicializado = false;
        }
    }

    /**
    * Obtem uma imagem interna do tipo ResultadoCamera
    * @returns {scanner.utils.pagina.ResultadoCamera}
    */
    context.lerSaida = function(){
        if(context.inicializado == false){ throw 'O objeto precisa estar iniciado!' };

        return new Promise(function(resolve){
            if (context.gravador.readyState === context.gravador.HAVE_ENOUGH_DATA) {
                context.canvasContext.drawImage(context.gravador, 0, 0, context.canvas.width, context.canvas.height);
            } 
            
            scanner.utils.imagem.ResultadoCamera({
                canvas_resultado: context.canvas

            }).then(function(resultadoResultado){
                
                resolve(resultadoResultado);

            });
        })
    }

    /**
    * Obtem N imagens internas do tipo ResultadoCamera
    * @returns {scanner.utils.pagina.ResultadoCamera}
    */
    context.lerSaidas = function(quantidadeOutputs){
        return new Promise(function(resolve){
            if(context.inicializado == false){ throw 'O objeto precisa estar iniciado!' };
            
            let saidas = [];
            for( let i = 0 ; i < quantidadeOutputs ; i++ )
            {   
                context.lerSaida()
                        .then(function(imagemLida){
                            saidas.push( imagemLida.getImagem() );
                        })
            }
    
            resolve(saidas);
        });
    }

    /**
    * Adiciona o elemento
    * @returns {null}
    */
    context.colocar = function(){
        if( context.pai ){
            context._criarGravador();
            context._criarCanvas();

            document.getElementById(context.pai)
                .appendChild( context.gravador );

            document.getElementById(context.pai)
                .appendChild( context.canvas  );  

            context.inserido = true;
        }
    }

    /**
    * Finaliza este objeto
    * @returns {null}
    */
    context.destruir = function(){
        context.pararCaptura();
        document.getElementById(context.pai).removeChild(context.gravador);
        document.getElementById(context.pai).removeChild(context.canvas);
        context.inserido = false;
        context.inicializado = false;
    }

    /**
    * Inicia a captura de imagens
    * @returns {null}
    */
    context.iniciar = function(){
        context.colocar();
        context.iniciarCaptura();
    }

    /**
    * Para a captura de imagens
    * @returns {null}
    */
    context.parar = function(){
        context.destruir();
    }

    if( context.autoAdicionar == true ){ context.iniciar() };

    return context;
}

/** MÉTODOS ESTÀTICOS */

/**
* Fornece um objeto simples para armazenar o resultado da saida da camera
* Permitindo facilmente obter informações
* @param {Object} classConfig 
* @returns {scanner.utils.pagina.ResultadoCamera}
*/
scanner.utils.imagem.ResultadoCamera = function(classConfig){
    return new Promise(function(resolve){
        const context = scanner.Base( classConfig );

        context.canvas_resultado = classConfig['canvas_resultado'];
        context.base64 = classConfig['base64'] || context.canvas_resultado.toDataURL();
        
        scanner.utils.imagem.criarImagem( context.base64 )
        .then( function(imagemCriada){
            context.imagem = imagemCriada;

            context.getImagem = function(){
                return context.imagem;
            }
    
            context.getBase64 = function(){
                return context.base64;
            }
    
            context.getCanvas = function(){
                return context.canvas_resultado;
            }

            resolve(context);
        } );
    });
}

module.exports = window.scanner.Camera;