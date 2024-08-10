var resultado = scanner.pagina.criarElementoHtml('div');
document.getElementById('corpo').appendChild( resultado.getElemento() );

var camera = scanner.Camera({ 
    pai: 'corpo',
    sentido: 'frontal',

    //Quando o usuario conceder permissão para usar a camera
    autorizado: async function(cameraContext)
    {
        window.scan = window.scanner.SerieScanner({
            camera: camera, //A camera criada

            //Configurações de template
            template: {
                templates: [],

                /**
                * Quantidade de imagens a serem usadas como template 
                */
                template_quantity: 5,

                /**
                * Se vai manter os templates antigos ao capturar novos templates ou não
                * caso seja 'true', ele vai manter os futuros novos templates 
                * caso seja 'false', vai apenas sobrescrever os templates atuais pelos futuros novos templates 
                */
                keepOldTemplates: false,

                /*
                * Configura que o template será captado ao vivo
                */
                live_template: {
                    /**
                    * Indica que vamos capturar os primeiros templates ao vivo
                    */
                    enabled: true,

                    /**
                    * Vai esperar 2 segundos para capturar os primeiros templates
                    */
                    wait_time: 2000,

                    /**
                    * Resforça que serão 5 templates
                    * sobrescreve o template_quantity
                    */
                    quantity: 5
                }
            },

            /*
            * Configurações de observação
            */
            sentinel_options: {
                /**
                * Quantidade de imagens que ele vai bater,
                * para começar a analisar
                * use uma quantidade suficiente pra escanear bem o ambiente atual
                */
                test_quantity: 3,

                /**
                * Porcentagem aceita para ser validado como uma identificação
                * No minimo 40%
                */
                acceptable_percent: 40,

                /**
                * Já inicia o monitoramento com o template atual(que estiver cadastrado)
                */
                monitoring: true,

                /**
                * A cada 3 segundos ele bate uma foto
                */
                monitoringSpeed: 3000,
                
                /**
                * Depois que essa foto é obtida, 
                * ele aguarda mais 1 segundo 
                * para só então começar a processar a imagem 
                */
                imageResponseTime: 1000
            },

            /**
            * Funções personalizadas para tratar situações 
            */
            callbacks: {
                'object.afterInitialization': function(contextoScannner, resultadosAtuais){
                    
                },

                'scanner.currentTime.whenInsuficientResponseTime': function(contextoScannner, resultadosAtuais){
                    
                },

                'scanner.currentTime.afterScan': function(contextoScannner, resultadosAtuais){

                },

                'scanner.currentTime.whenSomeoneMatch': function(contextoScannner, resultadosAtuais){
                            
                },

                'scanner.currentTime.whenLastNotMatch': function(contextoScannner, resultadosAtuais){
                    console.log('NAO PASSOU', resultadosAtuais)
                },

                'scanner.currentTime.ifAllMatch': function(contextoScannner, resultadosAtuais){
                    console.log('TUDO FOI IDENTIFICADO', resultadosAtuais)
                },

                'scanner.currentTime.ifNobodyMatch': function(contextoScannner, resultadosAtuais){
                    
                }
            }
        });
    }
});