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

            template_quantity: 5,
            keepOldTemplates: false,
            test_quantity: 3,
            acceptable_percent: 40, //No minimo 55%

            //Configura que o template
            live_template: {
                enabled: true,
                wait_time: 2000,
                quantity: 5
            },

            callbacks: {
                'object.afterInitialization': function(contextoScannner, resultadosAtuais){
                    
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
            },

            //Ja inicia monitorando
            monitoring: true,
            //Quanto maior este valor, mais vai demorar para os escaneamentos serem disparados
            monitoringSpeed: 3000,
            //As vezes é necessário aguardar um pouco, para que a imagem seja completamente carregada
            imageResponseTime: 1000
        });
    }
});