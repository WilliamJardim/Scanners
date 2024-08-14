var camera = scanner.Camera({ 
    pai: 'corpo',
    sentido: 'frontal',

    //Quando o usuario conceder permissão para usar a camera
    autorizado: async function(cameraContext)
    {
        const foto1 = (await camera.lerSaida()).getImagem();
        const foto2 = (await camera.lerSaida()).getImagem();
        const foto3 = (await camera.lerSaida()).getImagem();

        window.scan = window.scanner.SerieScanner({
            camera: camera, //A camera criada
        
            /**
            * Altera o modo de validação dos resultados 
            */
            validation: 'percentage',

            //Configurações de template
            template: {
                /**
                * Diz para o Scanner associar automaticamente(categorizar) 
                * com quais templates cada template mais se pareçe 
                */
                categorize: true,

                /* Obtem os templates, e atribui um rótulo a eles */
                templates : [
                    {
                        image: foto1,
                        label: 'William 1'
                    },
                    {
                        image: foto2,
                        label: 'William 2'
                    },
                    {
                        image: foto3,
                        label: 'William 3'
                    }
                ],
        
                /*
                * Configura que o template será captado ao vivo
                */
                live_template: {
                    enabled: false
                }
            },
        
            /*
            * Configurações de observação
            */
            sentinel_options: {
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

                stopCriterius: {
                    /**
                    * Modo do stopCriterius
                    * 'someone' significa SE ALGUM BATER
                    * 'all' significa que todos precisam bater
                    */
                    mode: 'someone',
        
                    /**
                    * Crítérios de paradas, sepadados por virgula
                    * cada uma dessas funções vai ser executada em ordem sequencial,
                    * e a primeira que bater, vai interromper o scanner
                    * 
                    * NOTA: os critérios serão sempre verificados após o final de cada escaneamento
                    * NOTA: A função de um critério de parada precisa retornar a String 'stop' para ele interromper o escaneamento
                    */
                    criterius: [
                        function(scannerContext, scannerStatus){
                            if( scannerStatus.scansCount > 1 )
                            {
                                console.log('ABACOU O LIMITE');
                                return 'stop';
                            }
                        }
                    ]
                }
            },
        
            /**
            * Armazena informações de logging 
            */
            logger: {
                /**
                * Sinaliza que vamos usar um histórico
                * para armazenar os resultados dos escaneamentos na memória 
                */
                history: true
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
