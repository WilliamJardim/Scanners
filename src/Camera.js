/**
* WilliamJardim/Scanners © 2024 by William Alves Jardim is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International. 
* To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/
*/
//Compatibilidade com NodeJS
if( typeof window === 'undefined' ){
    global.window = global; 
    
//Se for navegador
}else{
    if (typeof module === 'undefined') {
        globalThis.module = {};
    }
}

if(!window.scanner){ window.scanner = {} };

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

    /**
    * Cria a instancia que recebe as capturas
    * @returns {HTMLVideoElement}
    */
    context._criarGravador = function(){
        context.gravadorControle = scanner.pagina.criarElementoHtml('video', 'video'+instanciaId);
        context.gravadorControle.ocultar();
        context.gravador = context.gravadorControle.getElemento();

        return context.gravador;
    }
    
    /**
    * Cria a instancia que recebe os resultados
    * @returns {HTMLCanvasElement}
    */
    context._criarCanvas = function(){
        context.canvasControle = scanner.pagina.criarElementoHtml('canvas', 'canvas'+instanciaId);
        context.canvasControle.estilizar({
            width: '600px',
            height: '400px'
        });
        context.canvas = context.canvasControle.getElemento();
        context.canvasContext = context.canvas.getContext('2d');

        return context.canvas;
    }
    
    context.configuracoesUsadas = { 
        video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            facingMode: context.modo || 'user'
        } 
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
    * @returns {scanner.pagina.ResultadoCamera}
    */
    context.lerSaida = function(){
        if(context.inicializado == false){ throw 'O objeto precisa estar iniciado!' };

        if (context.gravador.readyState === context.gravador.HAVE_ENOUGH_DATA) {
            context.canvasContext.drawImage(context.gravador, 0, 0, context.canvas.width, context.canvas.height);
        } 
        
        return scanner.pagina.ResultadoCamera({
            canvas_resultado: context.canvas
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

module.exports = window.scanner.Camera;