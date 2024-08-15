/**
* WilliamJardim/Scanners © 2024 by William Alves Jardim is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International. 
* To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/
*/

scanner.misc.AudioPlayer = function(classConfig){
    const context = scanner.Base(classConfig);

    /* VARIÁVEIS */
    context.caminho           = classConfig['pasta']         || '../../sounds';
    context.listaAudios       = classConfig['lista']         || ['enable', 'disable', 'beep', 'match', 'notmatch', 'allmatch', 'nobodymatch'];
    context.configuracoes     = classConfig['configuracoes'] || { volume: 1 };
    context.audiosCarregados  = {}; 
    context.autoLoad          = classConfig['autoLoad']      || true;
    context.autoConfig        = classConfig['autoConfig']    || true;
    context.audioEnabled      = classConfig['audioEnabled']  || true;

    /* MÈTODOS */
    context.loadAll = function(){
        for( let i = 0 ; i < context.listaAudios.length ; i++ )
        {
            const nomeAudioAtual = context.loadList[i];
            const objetoAudioCarregado = new Audio();

            //Carrega o arquivo e joga ele na lista
            objetoAudioCarregado.src = `${context.caminho}/${nomeAudioAtual}`;
            context.audiosCarregados[ nomeAudioAtual ] = objetoAudioCarregado;
        }
    }

    context.configurar = function(configuracoes){

    }

    context.play = function(audioName){
        if( context.audioEnabled == false ){
            return;
        }

        if( context.listaAudios.indexOf(audioName) != -1 &&
            context.audiosCarregados[audioName] != undefined
        ){
            

        }else{
            throw 'Nome de audio invalido!';
        }
    }

    if(context.autoLoad == true){  context.loadAll() };
    if(context.autoConfig == true){ context.configurar( context.configuracoes ) };

    return context;
}