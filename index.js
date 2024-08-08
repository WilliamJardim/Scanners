/**
* WilliamJardim/Scanners © 2024 by William Alves Jardim is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International. 
* To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/
*/
var resultado = scanner.pagina.criarElementoHtml('div');
document.getElementById('corpo').appendChild( resultado.getElemento() );

var camera = scanner.Camera({ 
    pai: 'corpo',
    sentido: 'frontal',

    //Quando o usuario conceder permissão para usar a camera
    autorizado: async function(cameraContext)
    {
        window.SerieScanner_Main();
    }
});

//Código que inicializa o scanner
function SerieScanner_Main()
{
    window.quantidadeImagensTemplate = 5;
    window.quantidadeImagensTeste = 3;
    window.porcentagem_acerto = 80; //80%

    //Obtem as imagens template
    window.templates = [];
    window.obterTemplate = async function(){
        window.templates = await camera.lerSaidas(quantidadeImagensTemplate);
    }

    //Obtem as imagens de teste
    window.imagensTeste = [];
    window.obterTargets = async function(){
        window.imagensTeste = await camera.lerSaidas(quantidadeImagensTeste);
    }

    //Considera que já temos as imagens template e as imagens de teste carregadas na memoria, então simplismente analisamos uma por uma
    window.compararImagensObtidas = async function(){
        return new Promise(function(resolve){
            let resultados = [];

            for( let i = 0 ; i < window.templates.length ; i++ )
            {
                const fotoTemplateAtual = window.templates[i];

                for( let j = 0 ; j < window.imagensTeste.length ; j++ )
                {
                    const fotoTestandoAtual = window.imagensTeste[j];

                    scanner.utils.semelhancaImagems(fotoTemplateAtual, fotoTestandoAtual, window.porcentagem_acerto)
                    .then(function(resultadoAnalise){
                        resultados.push(resultadoAnalise);
                    });
                }
            }

            let quantidadeAguardos = 0;
            const timerChecagem = setInterval( function(){
                const quantidadeEsperada = window.imagensTeste.length * window.imagensTeste.length;

                if( resultados.length >= quantidadeEsperada || quantidadeAguardos > 20000){
                    clearInterval(timerChecagem);
                    resolve(resultados);
                }

                quantidadeAguardos++;

            }, 100 );

        });
    }

    //Obtem as imagens aturais e faz uma varredura nessas imagens atuais
    window.analisarCena = async function(){
        return new Promise(function(resolve){
            window.obterTargets();
        
            setTimeout(async() => {
                const resultados = await window.compararTodas();
                resolve(resultados);
            }, 1500);
        });
    }

    //Obtem as imagens iniciais que serão usadas de base
    window.obterTemplate();
}