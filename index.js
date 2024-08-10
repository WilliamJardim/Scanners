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
                template_quantity: 5,
                keepOldTemplates: false,

                //Configura que o template será captado ao vivo
                live_template: {
                    enabled: true,
                    wait_time: 2000,
                    quantity: 5
                }
            },

            //Configurações de observação
            sentinel_options: {
                test_quantity: 3,
                acceptable_percent: 40, //No minimo 55%
                monitoring: true,
                monitoringSpeed: 3000,
                imageResponseTime: 1000
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
            }
        });
    }
});