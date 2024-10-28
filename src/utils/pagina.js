/**
* WilliamJardim/Scanners © 2024 by William Alves Jardim is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International. 
* To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/
*/
scanner.utils.pagina = {
    /**
    * Cria um elemento personalizado na página
    * Permitindo obter o elemento HTML, e manipular ele usando métodos personalizados
    * @param {Object} classConfig 
    * @returns {scanner.utils.pagina.Elemento}
    */
    Elemento: function(classConfig){
        const context = scanner.Base( classConfig );
        context.elemento = classConfig['elemento'];

        context.get = function(){
            return context;
        }

        context.getElemento = function(){
            return context.elemento;
        }

        context.ocultar = function(){
            context.elemento.style.visibility = 'hidden';
            context.elemento.style.display = 'none';
        }

        context.exibir = function(){
            context.elemento.style.visibility = 'visible';
            context.elemento.style.display = 'block';
        }

        context.estilizar = function(aplicarConfig){
            let keys = Object.keys(aplicarConfig);

            for( let i = 0 ; i < keys.length ; i++ )
            {
                context.elemento.style[ keys[i] ] = aplicarConfig[ keys[i] ];
            }

            return context;
        }

        context.aplicarAtributos = function(aplicarConfig){
            let keys = Object.keys(aplicarConfig);

            for( let i = 0 ; i < keys.length ; i++ )
            {
                context.elemento[ keys[i] ] = aplicarConfig[ keys[i] ];
                context.elemento.setAttribute( keys[i], aplicarConfig[ keys[i] ] )
            }

            return context;
        }

        return context;
    },

    /**
    * Cria um elemento personalizado na página
    * Permitindo obter o elemento HTML, e manipular ele usando métodos personalizados
    * @param {String} elemento 
    * @param {String} id 
    * @returns {scanner.utils.pagina.Elemento}
    */
    criarElementoHtml: function(elemento, id){
        let elementoCriado = document.createElement(elemento);
        elementoCriado.setAttribute('id', id);

        return scanner.utils.pagina.Elemento({
            elemento: elementoCriado
        });
    } 
}