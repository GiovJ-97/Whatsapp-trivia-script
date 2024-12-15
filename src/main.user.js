// ==UserScript==
// @name         Trivia game for WhatsApp group
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Allow to play trivia with people in Whatsapp group
// @author       GiovJ-97
// @match        https://web.whatsapp.com/*
// @grant        none
// @icon         https://www.google.com/s2/favicons?sz=64&domain=whatsapp.com
// @downloadURL     https://raw.githubusercontent.com/GiovJ-97/Whatsapp-trivia-script/blob/main/src/Trivia-game-for-WhatsApp-group-1.0.js
// @updateURL       https://raw.githubusercontent.com/GiovJ-97/Whatsapp-trivia-script/blob/main/src/Trivia-game-for-WhatsApp-group-1.0.js
// ==/UserScript==

(function () {
    'use strict';

    const BUTTON_TEXT = 'Trivia'; // texto del botón

    let isTyping = false;
    let answerFlag = false;

    let intelligentPeople = {}; // Mapa vacío
    let messageListSize = 6548; // Variable aleatoria de inicio para no coincidir al primer lanzamiento

    const TITLE = 'Trivia game for WhatsApp'; // texto del título

    // Definir una variable global solo accesible dentro del script
    let runningFlag = false;

    // Instanciar containers de checkboxes
    let checkboxMentionContainer, checkboxRepeatContainer, checkboxEnumerateContainer, checkboxBoldContainer, checkboxItalicContainer, checkboxUppercaseContainer, checkboxNationSortContainer, checkboxNationResumeContainer, checkboxRandomContainer, triviaDialog, inputNumberContainer;

    function sleep(ms) {
        // Usamos una función auto-ejecutada para evitar el async
        return {
            execute: () => {
                let start = Date.now();
                // Espera activa usando while
                while (Date.now() - start < ms) {
                    // Dejamos que el CPU respire un poco
                    if ((Date.now() - start) % 100 === 0) {
                        // Opcional: yield al event loop cada 100ms
                        setTimeout(() => { }, 0);
                    }
                }
                return true;
            },
            // Versión async para mayor flexibilidad
            executeAsync: () => new Promise(resolve => setTimeout(resolve, ms))
        };
    }

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function sendTextLine(question, answer, currentQuestionNumber, textFieldQuestions, textFieldAnswers) {
        console.log("Iniciando sendTextLine");

        /* Mensaje de preparación */
        if (currentQuestionNumber === 0) { // Mensaje introductorio: solo si es la primera pregunta
            for (let i = 2; i >= currentQuestionNumber; i--) {
                if (runningFlag) {
                    if (i === 2) {
                        sendMessage(`Iniciando dinámica de trivia…`); // mensaje inicial
                        await wait(3200);
                    }
                    sendMessage(`Iniciando en ${i + 1}…`);
                    await wait(3200);
                } else {
                    return null;
                }
            }
            sendMessage(`¡Ahora!`);
            await wait(3000);
        }
        /* Mensaje de preparación */

        while (isTyping) {
            await wait(500);
            console.log("Esperando finalización de postCongrats para enviar otra pregunta");
        } // medida anti superposición de envío de pregunta

        // Define si etiquetar o no    
        if (checkboxMentionContainer.querySelector('input').checked) { // lectura a cada momento
            try {
                console.log("Etiquetando a todos");
                await tagEveryone(true, 0)
            } catch (error) {
                console.log(`Fallo en tagEveryone ${error.message}`);
                // throw error
            }
        }

        console.log(`formatText. Texto a enviar: ${question}. Índice a enviar: ${currentQuestionNumber + 1}`);
        const formattedQuestion = formatText(question, currentQuestionNumber + 1); // copia de la linea recibida

        console.log(`Preparando para enviar: ${formattedQuestion}`);
        const inputTextArea = getInputTextArea();
        inputTextArea.focus(); // aparece el cursor

        insertText(formattedQuestion); // inserción
        await wait(50);
        clickSendButton(); // envío

        // si el checkbox no está activo, ir limpiando los textarea de pregunta/respuesta
        if (!checkboxRepeatContainer.querySelector('input').checked) {
            refreshTextArea(textFieldQuestions, question);
            refreshTextArea(textFieldAnswers, answer); // TODO
        }

        await wait(50); // Esperar a que el mensaje se envíe

        /*const lastMessage = main.querySelector('div.message-out:last-child');
        if (lastMessage && lastMessage.textContent.includes(formattedQuestion)) {
            console.log(`Mensaje enviado con éxito: ${formattedQuestion}`);
        } else {
            console.error(`No se pudo confirmar el envío del mensaje: ${formattedQuestion}`);
        }*/

        // checkAnswer - activa escucha de la respuesta
        try {
            await checkAnswer(formattedQuestion, answer); // pregunta formateada y respuesta
        } catch (error) {
            console.log(`fallo en checkAnswer: ${error.message}`);
            //alert();
            //throw error;
        }
    }

    function formatText(text, indexIn = 0) {
        console.log(`formatText. Texto a formatear: ${text}. Índice recibido: ${indexIn}`);
        let formattedText = text;

        // Obtener estado del checkboxUppercase
        if (checkboxUppercaseContainer.querySelector('input').checked) {
            formattedText = `${formattedText.toUpperCase()}`;
        }

        // Obtener estado del checkboxEnumerate
        if (checkboxEnumerateContainer.querySelector('input').checked) {
            if (indexIn === 0) { // no especificado
                formattedText = `${formattedText}`; // no especificado en llamada
            } else {
                formattedText = `${indexIn}.- ${formattedText}`;
            }
        }

        // Obtener estado del checkboxBold
        if (checkboxBoldContainer.querySelector('input').checked) {
            formattedText = `*${formattedText}*`;
        }

        // Obtener estado del checkboxItalic
        if (checkboxItalicContainer.querySelector('input').checked) {
            formattedText = `_${formattedText}_`;
        }

        console.log(`formatText. Texto formateado: ${formattedText}.`);
        return formattedText;
    }

    function getInputTextArea() {
        const main = document.querySelector("#main");
        const inputTextArea = main.querySelector('div[contenteditable="true"]');

        if (!inputTextArea) {
            const errorMessage = "Área de escritura de texto no encontrada";
            console.error(errorMessage);
            throw new Error(errorMessage);
        }
        return inputTextArea;
    }

    function clickSendButton() {
        const SEND_BUTTON_CLASS = 'footer._ak1i button.x1c4vz4f.x2lah0s.xdl72j9.xfect85.x1iy03kw.x1lfpgzf';

        const sendButton = document.querySelector(SEND_BUTTON_CLASS);
        if (sendButton) {
            console.log("Botón de enviar encontrado, haciendo clic");
            sendButton.click();
        } else {
            console.error("No se encontró el botón de enviar");
            throw new Error("No se pudo encontrar el botón de enviar");
        }

        /*// Versión usando solo las clases del botón
        const SEND_BUTTON_CLASS = 'footer._ak1i button.x1c4vz4f.x2lah0s.xdl72j9.xfect85.x1iy03kw.x1lfpgzf';
        // Versión completa usando la jerarquía y las clases
        const SEND_BUTTON_CLASS_FULL = `footer._ak1i > div.x1n2onr6.xhtitgo.x9f619.x78zum5.x1q0g3np.xuk3077.x193iq5w.x122xwht.x1bmpntp.xs9asl8.x1swvt13.x1pi30zi.xnpuxes.copyable-area > div.x1n2onr6.x98rzlu.xh8yej3.xeuugli.x1ofbdpd > span > div._ak1q > div._ak1r > div.x123j3cw.xs9asl8.x9f619.x78zum5.x6s0dn4.xl56j7k.x1ofbdpd.x100vrsf.x1fns5xo > button.x1c4vz4f.x2lah0s.xdl72j9.xfect85.x1iy03kw.x1lfpgzf`;

        const buttonSimple = document.querySelector(SEND_BUTTON_CLASS);
        const buttonFull = document.querySelector(SEND_BUTTON_CLASS_FULL);

        console.log('Usando selector simple:', buttonSimple ? 'Encontrado' : 'No encontrado');
        console.log('Usando selector completo:', buttonFull ? 'Encontrado' : 'No encontrado');

        return {
            simpleSelector: buttonSimple !== null,
            fullSelector: buttonFull !== null
        };*/
    }

    function createActivatorButton(container) {
        if (!container) {
            console.error("No se encontró el div objetivo para insertar el botón de interfaz");
            return;
        }

        const existingButton = container.querySelector('#activatorButton');
        if (existingButton) {
            console.log('El botón ya existe, no es necesario recrearlo.');
            return;
        }

        const button = document.createElement('button');
        // Asignamos un ID único al botón
        button.id = 'activatorButton';
        button.textContent = BUTTON_TEXT;
        button.style.marginLeft = '5px';
        button.style.padding = '5px 10px';
        button.style.backgroundColor = '#128C7E';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.cursor = 'pointer';
        button.style.fontSize = '14px';
        button.title = 'Prog';

        button.addEventListener('click', async () => {
            openTextEditorDialog();
        });

        container.appendChild(button);
    }

    function openTextEditorDialog() {
        // Crear el cuadro de diálogo
        triviaDialog = document.createElement('div');
        triviaDialog.style.position = 'fixed';
        triviaDialog.style.top = '28%';
        triviaDialog.style.left = '50%';
        triviaDialog.style.transform = 'translate(-50%, -50%)';
        triviaDialog.style.width = '80%';
        triviaDialog.style.maxWidth = '550px';
        triviaDialog.style.backgroundColor = 'rgb(17, 27, 33)'; // oscuro
        triviaDialog.style.border = '2px solid #ccc';
        triviaDialog.style.borderColor = 'rgb(32, 44, 51)';
        triviaDialog.style.borderRadius = '5px';
        triviaDialog.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
        triviaDialog.style.padding = '20px';
        triviaDialog.style.zIndex = '1000';
        // Centrar el texto en el contenedor
        triviaDialog.style.textAlign = 'center';

        // Crear el título
        const title = document.createElement('h2');
        title.textContent = TITLE;
        title.style.color = 'rgb(233, 237, 239)';
        title.style.marginBottom = '20px';
        triviaDialog.appendChild(title);

        // Crear un contenedor para los TextArea
        const textContainer = document.createElement('div');
        textContainer.style.display = 'flex';
        textContainer.style.justifyContent = 'space-between';
        textContainer.style.marginBottom = '10px';

        // Crear el campo de texto
        const textAreaQuestions = document.createElement('textarea');
        textAreaQuestions.style.width = '70%';
        textAreaQuestions.style.height = '140px';
        textAreaQuestions.style.marginBottom = '10px';
        textAreaQuestions.placeholder = 'Inserte preguntas. Cada salto de línea corresponde a una nueva sentencia';
        textAreaQuestions.style.backgroundColor = 'rgb(32, 44, 51)'; // claro
        textAreaQuestions.style.borderColor = 'rgb(32, 44, 51)'; // claro
        textAreaQuestions.style.color = 'rgb(233, 237, 239)';

        // Crear el campo de texto 2
        const textAreaAnswers = document.createElement('textarea');
        textAreaAnswers.style.width = '30%';
        textAreaAnswers.style.height = '140px';
        textAreaAnswers.style.marginBottom = '10px';
        textAreaAnswers.placeholder = 'Inserte respuestas. Cada salto de línea corresponde a una nueva sentencia';
        textAreaAnswers.style.backgroundColor = 'rgb(32, 44, 51)'; // claro
        textAreaAnswers.style.borderColor = 'rgb(32, 44, 51)'; // claro
        textAreaAnswers.style.color = 'rgb(233, 237, 239)';

        textContainer.appendChild(textAreaQuestions);
        textContainer.appendChild(textAreaAnswers);

        // Crear un contenedor para los checkboxes
        const checkboxContainer1st = document.createElement('div');
        checkboxContainer1st.style.display = 'flex';
        checkboxContainer1st.style.justifyContent = 'space-between';
        checkboxContainer1st.style.marginBottom = '10px';

        const checkboxContainer2nd = document.createElement('div');
        checkboxContainer2nd.style.display = 'flex';
        checkboxContainer2nd.style.justifyContent = 'space-between';
        checkboxContainer2nd.style.marginBottom = '10px';

        const checkboxContainer3rd = document.createElement('div');
        checkboxContainer3rd.style.display = 'flex';
        checkboxContainer3rd.style.justifyContent = 'space-between';
        checkboxContainer3rd.style.marginBottom = '10px';

        // plantilla de checkbox con etiqueta de descripción
        const checkboxWithLabelTemplate = (labelText, state) => {
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.alignItems = 'center';

            const checkboxLabel = document.createElement('label');
            checkboxLabel.textContent = labelText;
            checkboxLabel.style.color = 'rgb(233, 237, 239)';
            checkboxLabel.style.marginRight = '10px';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.style.marginRight = '5px';
            if (!state) {
                checkbox.disabled = true;
            }

            container.appendChild(checkbox);
            container.appendChild(checkboxLabel);

            return container;
        };

        const inputNumberWithLabelTemplate = (labelText1 = '', labelText2 = '') => {
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
        
            // Si labelText1 está definido, crea y agrega el primer label
            if (labelText1) {
                const label1 = document.createElement('label');
                label1.textContent = labelText1;
                label1.style.color = 'rgb(233, 237, 239)';
                label1.style.marginRight = '10px';
                container.appendChild(label1);
            }
        
            // Crear campo numérico para los segundos
            const inputNumber = document.createElement('input');
            inputNumber.type = 'number';
            inputNumber.min = '0';
            inputNumber.style.width = '16%';
            inputNumber.style.backgroundColor = 'rgb(32, 44, 51)'; // claro
            inputNumber.style.borderColor = 'rgb(32, 44, 51)'; // claro
            inputNumber.style.color = 'rgb(233, 237, 239)';
            inputNumber.value = '3'; // tres segundos predeterminados de espera entre mensajes
            inputNumber.style.display = 'flex';
        
            container.appendChild(inputNumber);
        
            // Si labelText2 está definido, crea y agrega el segundo label
            if (labelText2) {
                const label2 = document.createElement('label');
                label2.textContent = labelText2;
                label2.style.color = 'rgb(233, 237, 239)';
                label2.style.marginLeft = '10px';
                container.appendChild(label2);
            }
        
            return container;
        };

        // Enlace a variable de clase. El estado de los checkboxes se puede verificar desde cualquier parte
        checkboxMentionContainer = checkboxWithLabelTemplate('Etiquetar', true);
        checkboxNationSortContainer = checkboxWithLabelTemplate('Nacionalidad', false);
        checkboxNationResumeContainer = checkboxWithLabelTemplate('Resumen', false);
        checkboxRepeatContainer = checkboxWithLabelTemplate('Repetir', true);
        checkboxRandomContainer = checkboxWithLabelTemplate('Aleatorizar', true);
        checkboxEnumerateContainer = checkboxWithLabelTemplate('Enumerar', true);
        checkboxBoldContainer = checkboxWithLabelTemplate('Negritas', true);
        checkboxItalicContainer = checkboxWithLabelTemplate('Cursiva', true);
        checkboxUppercaseContainer = checkboxWithLabelTemplate('Mayúsculas', true);
        inputNumberContainer = inputNumberWithLabelTemplate('', 'Respuestas');

        // Añadir checkboxes al contenedor
        checkboxContainer1st.appendChild(checkboxMentionContainer);
        checkboxContainer1st.appendChild(checkboxNationSortContainer);
        checkboxContainer1st.appendChild(checkboxNationResumeContainer);
        checkboxContainer2nd.appendChild(checkboxRepeatContainer);
        checkboxContainer2nd.appendChild(checkboxRandomContainer);
        checkboxContainer2nd.appendChild(inputNumberContainer);
        checkboxContainer3rd.appendChild(checkboxEnumerateContainer);
        checkboxContainer3rd.appendChild(checkboxBoldContainer);
        checkboxContainer3rd.appendChild(checkboxItalicContainer);
        checkboxContainer3rd.appendChild(checkboxUppercaseContainer);

        // Contenedor para los botones de aceptar o cancelar
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'space-between';
        buttonContainer.style.marginTop = '20px';

        // Crear botón de cancelación
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancelar';
        cancelButton.style.backgroundColor = '#f44336';
        cancelButton.style.color = 'white';
        cancelButton.style.border = 'none';
        cancelButton.style.borderRadius = '5px';
        cancelButton.style.cursor = 'pointer';
        cancelButton.style.padding = '10px';
        cancelButton.style.fontSize = '14px';

        // listener para el botón
        cancelButton.addEventListener('click', () => {
            runningFlag = false; // Variable de clase que avisa de la cancelación del script
            sendMessage("Dinámica de trivia terminada por el anfitrión", 0);
            triviaDialog.remove(); // Cerrar el diálogo al hacer clic en "Cancelar"
        });

        // Crear botón de envío
        const sendButton = document.createElement('button');
        sendButton.textContent = 'Enviar';
        sendButton.style.backgroundColor = '#128C7E';
        sendButton.style.color = 'white';
        sendButton.style.border = 'none';
        sendButton.style.borderRadius = '5px';
        sendButton.style.cursor = 'pointer';
        sendButton.style.padding = '10px';
        sendButton.style.fontSize = '14px';

        // listener para el botón
        sendButton.addEventListener('click', async () => {
            runningFlag = true;
            const questionsText = textAreaQuestions.value.trim(); // obtiene el texto del campo de preguntas
            const answersText = textAreaAnswers.value.trim(); // obtiene el texto del campo de respuestas

            if (questionsText && answersText) { // Continuar si no son nulos TODO
                /* Obtenemos el valor del delay en milisegundo                     
                let delayMilliseconds = parseInt(inputNumberContainer.querySelector('input[type="number"]').value.trim()) * 1000;
                // Impide la activación si el valor de los segundos está vacío o es menor que 0
                if (isNaN(delayMilliseconds) || delayMilliseconds < 0) {
                    alert('El valor de tiempo entre mensajes debe ser un número entero positivo.');
                    return;
                } */

                triviaDialog.style.opacity = '0.65'; // semitransparente al iniciar

                let questionList = questionsText.split(/[\n\t]+/).map(line => line.trim()).filter(line => line); // romper en líneas el contenido del cuadro de texto de las respuestas
                let answerList = answersText.split(/[\n\t]+/).map(line => line.trim()).filter(line => line); // romper en líneas, lista de elementos
                // if aleatorizar preguntas está pulsado: 
                if (checkboxRandomContainer.querySelector('input').checked) {
                    questionList = shuffleArrayWithSeed(questionList, 12345); // La semilla debe ser la misma para mantener el patrón
                    answerList = shuffleArrayWithSeed(answerList, 12345);
                }
                const cBoxRandomSort = checkboxRandomContainer.querySelector('input[type="checkbox"]');
                cBoxRandomSort.disabled = true; // no se puede activar o desactivar una vez iniciado

                if (questionList.length !== answerList.length) { // ambas listas deben medir lo mismo
                    alert(`La cantidad de preguntas (${questionList.length}) y respuestas (${answerList.length}) no concuerda. Por favor, verifíquelo.`);
                    return;
                }

                while (true) {
                    for (const question of questionList) {
                        if (runningFlag) {
                            console.log(`Preparando para enviar: ${question}`);

                            const currentQuestionIndex = questionList.indexOf(question);
                            const answer = answerList[currentQuestionIndex];

                            // Llamamos a sendTextLine, pasamos la pregunta, respuesta actual e índice
                            await sendTextLine(question, answer, currentQuestionIndex, textAreaQuestions, textAreaAnswers);

                            /* Recolectamos el valor del delay con cada envío
                            const updatedDelayInputValue = inputNumberContainer.querySelector('input[type="number"]').value.trim();
                            delayMilliseconds = parseInt(updatedDelayInputValue) * 1000;
                            if (isNaN(delayMilliseconds) || delayMilliseconds < 0) {
                                alert('El valor de los segundos debe ser un número positivo.');
                                return;
                            }*/

                            if (currentQuestionIndex !== questionList.length) { // "mientras el index actual sea diferente del total de elementos"
                                console.log(`Esperando ${3000}ms antes del siguiente mensaje`);

                                await wait(3000); // delayMilliseconds
                            }
                        } // runningFlag está enlazada al botón de cancelación
                    }

                    console.log(`postScore llamada. Terminación del ciclo detectado.`);
                    // implica publicar a los 3 primeros del mapa
                    if (runningFlag) await postScore(true);
                    intelligentPeople = {}; // limpiando registro de ganadores al terminar.

                    triviaDialog.style.opacity = '1.0'; // totalmente visible al terminar

                    const cBoxRandomSort = checkboxRandomContainer.querySelector('input[type="checkbox"]');
                    cBoxRandomSort.disabled = false; // no se puede activar o desactivar una vez iniciado

                    // Si el checkbox no está seleccionado, limpiamos los textArea
                    if (!checkboxRepeatContainer.querySelector('input').checked) {
                        textAreaQuestions.value = '';
                        textAreaAnswers.value = '';
                    }
                    if (!repeat || !runningFlag) {
                        console.log('Repetición desactivada. Saliendo del ciclo.');
                        break;
                    }
                }
                console.log(`Envío completado, ${questionList.length} mensajes enviados`);
                showToast(`Envío completado, ${questionList.length} mensajes enviados`, 5000); // Aparecerá durante 5 segundos              
                // dialog.remove(); // Cerrar el diálogo
            } else {
                alert('Alguno de los campos de texto está vacío');
            }
        });

        // Añadir botones al contenedor de botones
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(sendButton);

        // Añadir elementos al diálogo
        triviaDialog.appendChild(title);
        triviaDialog.appendChild(textContainer);
        triviaDialog.appendChild(checkboxContainer1st);
        triviaDialog.appendChild(checkboxContainer2nd);
        triviaDialog.appendChild(checkboxContainer3rd);
        triviaDialog.appendChild(buttonContainer);

        // Añadir el diálogo al cuerpo del documento
        document.body.appendChild(triviaDialog);

        // Establecer valores predeterminados para los checkboxes         
        checkboxEnumerateContainer.querySelector('input[type="checkbox"]').click();
        checkboxBoldContainer.querySelector('input[type="checkbox"]').click();
        checkboxItalicContainer.querySelector('input[type="checkbox"]').click();
        checkboxUppercaseContainer.querySelector('input[type="checkbox"]').click();

        const cBoxMention = checkboxMentionContainer.querySelector('input[type="checkbox"]');
        cBoxMention.addEventListener('click', () => {
            const cBoxNationSort = checkboxNationSortContainer.querySelector('input[type="checkbox"]');
            const cBoxNationResume = checkboxNationResumeContainer.querySelector('input[type="checkbox"]');

            if (cBoxMention.checked) {
                cBoxNationSort.disabled = false;
                cBoxNationResume.disabled = false;
            } else {
                cBoxNationSort.disabled = true;
                cBoxNationResume.disabled = true;
            }
        });
    }

    function refreshTextArea(textfield, line) {
        // Obtén el contenido del textfield
        const text = textfield.value;

        // line Define la línea que deseas eliminar

        // Divide el contenido en líneas
        const lineas = text.split('\n');

        // Filtra las líneas para eliminar la que coincide
        const lineasFiltradas = lineas.filter(linea => linea.trim() !== line);

        // Une las líneas restantes en una cadena
        const nuevoTexto = lineasFiltradas.join('\n');

        // Actualiza el contenido del textfield
        textfield.value = nuevoTexto;
    }

    function checkAndCreateButton() {
        const targetContainerClass = '.x9f619.x78zum5.x6s0dn4.xl56j7k.x1ofbdpd._ak1m'; // div donde se coloca el botón
        const targetContainer = document.querySelector(targetContainerClass);
        if (!targetContainer) {
            console.error("No se encontró el div objetivo para insertar el botón");
            return;
        } else {
            createActivatorButton(targetContainer);
        }
    }

    async function tagEveryone(spoiler = false, sendEvery = 0) {
        try {
            const groupUsers = extractGroupUsers();

            const chatInput = getInputTextArea();
            chatInput.focus(); // selecciona el cuadro de escritura

            if (!chatInput) {
                throw new Error('No chat input found. Please type a letter in the chat input.')
            }

            // Nation booleans
            const nationMention = checkboxNationSortContainer.querySelector('input').checked; // Obtener estado del checkbox7; // controlador de mención de nación
            const nationResume = checkboxNationResumeContainer.querySelector('input').checked; // Obtener estado del checkbox8; // controlador de elaboración de resumen de naciones
            let nationTags = {
                tagMexico: false,
                tagVenezuela: false,
                tagCuba: false,
                tagColombia: false,
                tagArgentina: false,
                tagBolivia: false,
                tagChile: false,
                tagPeru: false,
                tagBrasil: false,
                tagEcuador: false,
                tagNicaragua: false,
                tagSalvador: false,
                tagGuatemala: false,
                tagEEUU: false,
                tagUruguay: false,
                tagPanama: false,
                tagCostaRica: false,
                tagParaguay: false,
                tagHonduras: false,
                tagCaribe: false,
                tagPuertoRico: false,
                tagEspaña: false,
                tagReinoUnido: false,
                tagOther: false
            };

            // Nation counters
            let nationCounts = {
                "mexicanos": 0,
                "venezolanos": 0,
                "cubanos": 0,
                "colombianos": 0,
                "argentinos": 0,
                "bolivianos": 0,
                "chilenos": 0,
                "peruanos": 0,
                "brasileños": 0,
                "ecuatorianos": 0,
                "nicaragüenses": 0,
                "salvadoreños": 0,
                "guatemaltecos": 0,
                "estadounidenses/canadienses": 0,
                "uruguayos": 0,
                "panameños": 0,
                "costarricenses": 0,
                "paraguayos": 0,
                "hondureños": 0,
                "caribeños": 0,
                "puertorriqueños": 0,
                "españoles": 0,
                "británicos": 0,
                "otros": 0
            };

            let i = 0
            let justSent = true;
            for (const user1 of groupUsers) {

                if (!runningFlag) {
                    console.log('tagEveryone cancelado por cierre de UI.');
                    return;
                }

                let user = user1;

                /*
                if (!user.startsWith("+54") || user.startsWith("+54_Mi")) {
                    continue; // Omite este caso y sigue con el siguiente elemento // TODO
                }*/

                if (spoiler && justSent) {
                    // Add '\u200B' character 4000 times to emulate a spoiler behavior
                    const zeroWidthSpace = '\u200B'.repeat(1000) // 4000
                    insertText(zeroWidthSpace);
                    insertText(`_*ETIQUETANDO INTEGRANTES…*_`);
                    insertNewLineAtTextArea(chatInput); // insertar nueva linea en el cuadro de escritura
                    insertNewLineAtTextArea(chatInput); // insertar nueva linea en el cuadro de escritura
                    await wait(50);
                }
                justSent = false;

                // Descripción Anadir conteo de nacionalidades
                if (user.startsWith("+52")) {
                    if (nationTags.tagMexico === false && nationMention) {
                        nationTags.tagMexico = insertNationality(chatInput, nationTags.tagMexico, "mexicanos"); // imprime y cambia el valor del booleano
                    }
                    user = user.substring(0, 16)
                    nationCounts.mexicanos++;
                } else if (user.startsWith("+58")) {
                    if (nationTags.tagVenezuela === false && nationMention) {
                        nationTags.tagVenezuela = insertNationality(chatInput, nationTags.tagVenezuela, "venezolanos"); // imprime y cambia el valor del booleano
                    }
                    nationCounts.venezolanos++;
                } else if (user.startsWith("+53")) {
                    if (nationTags.tagCuba === false && nationMention) {
                        nationTags.tagCuba = insertNationality(chatInput, nationTags.tagCuba, "cubanos"); // imprime y cambia el valor del booleano
                    }
                    if (user.startsWith("+53 63")) {
                        user = user.substring(0, 9)
                    } else {
                        user = user.substring(0, 10)
                    }
                    nationCounts.cubanos++;
                } else if (user.startsWith("+57")) {
                    if (nationTags.tagColombia === false && nationMention) {
                        nationTags.tagColombia = insertNationality(chatInput, nationTags.tagColombia, "colombianos"); // imprime y cambia el valor del booleano
                    }
                    nationCounts.colombianos++;
                } else if (user.startsWith("+54")) {
                    if (nationTags.tagArgentina === false && nationMention) {
                        nationTags.tagArgentina = insertNationality(chatInput, nationTags.tagArgentina, "argentinos"); // imprime y cambia el valor del booleano
                    }
                    user = user.substring(0, 16)
                    nationCounts.argentinos++;
                } else if (user.startsWith("+591")) {
                    if (nationTags.tagBolivia === false && nationMention) {
                        nationTags.tagBolivia = insertNationality(chatInput, nationTags.tagBolivia, "bolivianos"); // imprime y cambia el valor del booleano
                    }
                    nationCounts.bolivianos++;
                } else if (user.startsWith("+56")) {
                    if (nationTags.tagChile === false && nationMention) {
                        nationTags.tagChile = insertNationality(chatInput, nationTags.tagChile, "chilenos"); // imprime y cambia el valor del booleano
                    }
                    nationCounts.chilenos++;
                } else if (user.startsWith("+51")) {
                    if (nationTags.tagPeru === false && nationMention) {
                        nationTags.tagPeru = insertNationality(chatInput, nationTags.tagPeru, "peruanos"); // imprime y cambia el valor del booleano
                    }
                    user = user.substring(0, 13)
                    nationCounts.peruanos++;
                } else if (user.startsWith("+55")) {
                    if (nationTags.tagBrasil === false && nationMention) {
                        nationTags.tagBrasil = insertNationality(chatInput, nationTags.tagBrasil, "brasileños"); // imprime y cambia el valor del booleano
                    }
                    user = user.substring(0, 14)
                    nationCounts.brasileños++;
                } else if (user.startsWith("+593")) {
                    if (nationTags.tagEcuador === false && nationMention) {
                        nationTags.tagEcuador = insertNationality(chatInput, nationTags.tagEcuador, "ecuatorianos"); // imprime y cambia el valor del booleano
                    }
                    user = user.substring(0, 14)
                    nationCounts.ecuatorianos++;
                } else if (user.startsWith("+505")) {
                    if (nationTags.tagNicaragua === false && nationMention) {
                        nationTags.tagNicaragua = insertNationality(chatInput, nationTags.tagNicaragua, "nicaraguenses"); // imprime y cambia el valor del booleano
                    }
                    nationCounts.nicaragüenses++;
                } else if (user.startsWith("+503")) {
                    if (nationTags.tagSalvador === false && nationMention) {
                        nationTags.tagSalvador = insertNationality(chatInput, nationTags.tagSalvador, "salvadoreños"); // imprime y cambia el valor del booleano
                    }
                    user = user.substring(0, 12)
                    nationCounts.salvadoreños++;
                } else if (user.startsWith("+502")) {
                    if (nationTags.tagGuatemala === false && nationMention) {
                        nationTags.tagGuatemala = insertNationality(chatInput, nationTags.tagGuatemala, "guatemaltecos"); // imprime y cambia el valor del booleano
                    }
                    nationCounts.guatemaltecos++;
                } else if (user.startsWith("+1") && user.includes(" ")) { // Estados Unidos y Canadá (+1)
                    if (nationTags.tagEEUU === false && nationMention) {
                        nationTags.tagEEUU = insertNationality(chatInput, nationTags.tagEEUU, "estadounidenses/canadienses"); // imprime y cambia el valor del booleano
                    }
                    user = user.substring(0, 15)
                    nationCounts["estadounidenses/canadienses"]++;
                } else if (user.startsWith("+598")) {
                    if (nationTags.tagUruguay === false && nationMention) {
                        nationTags.tagUruguay = insertNationality(chatInput, nationTags.tagUruguay, "uruguayos"); // imprime y cambia el valor del booleano
                    }
                    user = user.substring(0, 13)
                    nationCounts.uruguayos++;
                } else if (user.startsWith("+507")) {
                    if (nationTags.tagPanama === false && nationMention) {
                        nationTags.tagPanama = insertNationality(chatInput, nationTags.tagPanama, "panameños"); // imprime y cambia el valor del booleano
                    }
                    user = user.substring(0, 12)
                    nationCounts.panameños++;
                } else if (user.startsWith("+506")) {
                    if (nationTags.tagCostaRica === false && nationMention) {
                        nationTags.tagCostaRica = insertNationality(chatInput, nationTags.tagCostaRica, "costarricenses"); // imprime y cambia el valor del booleano
                    }
                    nationCounts.costarricenses++;
                } else if (user.startsWith("+595")) {
                    if (nationTags.tagParaguay === false && nationMention) {
                        nationTags.tagParaguay = insertNationality(chatInput, nationTags.tagParaguay, "paraguayos"); // imprime y cambia el valor del booleano
                    }
                    user = user.substring(0, 12)
                    nationCounts.paraguayos++;
                } else if (user.startsWith("+504")) {
                    if (nationTags.tagHonduras === false && nationMention) {
                        nationTags.tagHonduras = insertNationality(chatInput, nationTags.tagHonduras, "hondureños"); // imprime y cambia el valor del booleano
                    }
                    nationCounts.hondureños++;
                } else if (user.startsWith("+599")) {
                    if (nationTags.tagCaribe === false && nationMention) {
                        nationTags.tagCaribe = insertNationality(chatInput, nationTags.tagCaribe, "caribeños"); // imprime y cambia el valor del booleano
                    }
                    nationCounts.caribeños++;
                } else if (user.startsWith("+1 787") || user.startsWith("+1 939")) {
                    if (nationTags.tagPuertoRico === false && nationMention) {
                        nationTags.tagPuertoRico = insertNationality(chatInput, nationTags.tagPuertoRico, "puertorriqueños"); // imprime y cambia el valor del booleano
                    }
                    nationCounts.puertorriqueños++;
                } else if (user.startsWith("+34")) {
                    if (nationTags.tagEspana === false && nationMention) {
                        nationTags.tagEspana = insertNationality(chatInput, nationTags.tagEspana, "españoles"); // imprime y cambia el valor del booleano
                    }
                    nationCounts.españoles++;
                } else if (user.startsWith("+44")) {
                    if (nationTags.tagReinoUnido === false && nationMention) {
                        nationTags.tagReinoUnido = insertNationality(chatInput, nationTags.tagReinoUnido, "británicos"); // imprime y cambia el valor del booleano
                    }
                    nationCounts.británicos++;
                } else {
                    if (nationTags.tagOther === false && nationMention) {
                        nationTags.tagOther = insertNationality(chatInput, nationTags.tagOther, "otros"); // imprime y cambia el valor del booleano
                    }
                    nationCounts.otros++;
                }

                // Medidas contra números
                if (user.startsWith("+58 424-") || user.startsWith("+44")) { // si comienza con "+53"
                    user = user.slice(0, -1); // recortar el carácter final
                }

                // prefijo para numeración
                const number = i + 1
                const formattedNumber = number.toString().padStart(3, '0');
                insertText(`${formattedNumber}.- @${normalizeText(user)}`);
                //document.execCommand('insertText', false, `${formattedNumber}.- @`);                

                //document.execCommand('insertText', false, normalizeText(user)) 

                await sleep(50).executeAsync();

                // Send "tab" key to autocomplete the user
                //const pressedTab = new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', keyCode: 9, which: 9, bubbles: true, cancelable: true, view: window })
                //chatInput.dispatchEvent(pressedTab)
                pressTabKey(chatInput);

                //typeShiftEnter(chatInput);
                insertNewLineAtTextArea(chatInput);

                i++
                if (i % sendEvery === 0) {
                    await sleep(300).executeAsync();
                    clickSendButton()
                    await sleep(300).executeAsync();
                    justSent = true;
                }
            }
            if (!justSent && runningFlag) {
                await sleep(300).executeAsync();
                clickSendButton() // enviar
                await sleep(300).executeAsync();
                if (nationResume) {
                    await sendNationResume(chatInput, nationCounts, groupUsers.length)
                }
            }
        } catch (error) {
            console.error('Error extracting group users:', error.message);
            showToast(`Error extracting group users: ${error.message}`, 4000);
            // Terminar el método prematuramente si falla
            return;
        }
    }

    async function sendNationResume(chatInput, nationCounts, total) {
        insertText(`_*RESUMEN: EL GRUPO CONTIENE ${total} MIEMBROS, DE LOS CUALES:*_`);
        typeShiftEnter(chatInput);

        const sortedNations = Object.entries(nationCounts).map(([nation, count]) => {
            const percent = (count / total) * 100;
            return { nation, percent }; // Crea un objeto con la nación y el porcentaje
        }).filter(({ percent }) => percent > 0) // Filtra naciones con porcentaje mayor a 0
            .sort((a, b) => b.percent - a.percent); // Ordena de mayor a menor

        typeShiftEnter(chatInput);
        for (const { nation, percent } of sortedNations) {
            insertText(`*${percent.toFixed(2).padStart(5, '0')}%* son _*${nation}*_`);
            typeShiftEnter(chatInput);
            await sleep(50).executeAsync();
        }
        clickSendButton() // enviar
    }

    async function sendMessage(text, timeToContinueInMs = 1000) {
        console.log(`sendMessage: ${text}, tiempo: ${timeToContinueInMs}`);
        const inputTextArea = getInputTextArea();
        inputTextArea.focus();

        const formattedText = formatText(text); // cuando no se especifica, es 0

        insertText(formattedText);

        await wait(50);
        clickSendButton() // enviar
        await wait(50);

        /*
        let counter = 0
        while (counter < (timeToContinueInMs / 300)) {
            console.log(`Contador: ${counter}, Valor esperado: ${timeToContinueInMs / 300}`);
            //await wait(300);
            sleep(300).execute();
            counter++
        }*/

    }

    function insertNationality(chatInput, booleanTag, nation) {
        if (booleanTag === false) {
            typeShiftEnter(chatInput);
            insertText(`_*${nation.toUpperCase()}:*_`);
            typeShiftEnter(chatInput);
            return true
        }
    }

    function extractGroupUsers() {
        const groupSubtitle = document.querySelector("#main > header span.selectable-text.copyable-text")

        if (!groupSubtitle) {
            console.error('No chat subtitle found. Please open a group chat.');
            showToast("No chat subtitle found. Please open a group chat.", 4000);
        }

        // Check if users are separated with '，' (Chinese) or ',' (English)
        const separator = groupSubtitle.textContent.includes('，') ? '，' : ','

        let groupUsers = groupSubtitle.textContent.split(separator)

        groupUsers = groupUsers.map((user) => user.trim())

        if (groupUsers.length === 1) {
            console.error('No users found in the group chat.');
            showToast("No users found in the group chat.", 4000);
        }

        // Remove last user (the user itself)
        groupUsers.pop()

        // Elimina caracteres de cada nombre de usuario
        //groupUsers = groupUsers.map(user => user.slice(0, -1));

        // Limita cada nombre de usuario a un máximo de 12 caracteres
        groupUsers = groupUsers.map(user => user.length > 12 ? user.slice(0, -1) : user);

        // Ordena la lista de manera alfabética (numérica creciente en este caso)
        groupUsers.sort();

        // Normalize user's names without accents or special characters
        return groupUsers.map((user) => user.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    }

    function typeShiftEnter(chatInput) {
        // Simular Shift + Enter para insertar un salto de línea
        const pressedShiftEnter = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, shiftKey: true, bubbles: true, cancelable: true, view: window });
        chatInput.dispatchEvent(pressedShiftEnter);
    }

    function insertText(text) {
        document.execCommand('insertText', false, text)
    }

    // Función para mostrar el Toast Message
    function showToast(message, duration = 3000) {
        // Crear el contenedor del Toast
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        toast.style.color = 'white';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '5px';
        toast.style.fontSize = '16px';
        toast.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        toast.style.zIndex = '10000';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';

        // Agregar el Toast al cuerpo del documento
        document.body.appendChild(toast);

        // Mostrar el Toast (fade-in)
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 100); // Pequeña demora para activar la transición

        // Ocultar y eliminar el Toast después de la duración especificada (fade-out)
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 500); // Tiempo para completar el fade-out antes de eliminar
        }, duration);
    }

    function normalizeText(text) {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    }



    /* Solo revisar respuesta */
    async function checkAnswer(question, answer) {
        console.log("Iniciando checkAnswer");
    
        let correctAnswersNeeded = parseInt(inputNumberContainer.querySelector('input[type="number"]').value.trim(), 10);
        answerFlag = false;
        let points = correctAnswersNeeded + 2; // máxima cantidad de puntos dada al primer lugar
        let thinkers = [];
        let correctAnswersCounter = 0;
    
        // Función anidada para manejar la lógica de salida
        async function checkExitCondition() {
            correctAnswersNeeded = parseInt(inputNumberContainer.querySelector('input[type="number"]').value.trim(), 10);
            if (correctAnswersCounter >= correctAnswersNeeded) {
                while (true) {
                    if (!isTyping) {
                        try {
                            await postScore(false, thinkers); // enviar array con los que respondieron correctamente                           
                            console.log("postScore terminado");
                        } catch (error) {
                            console.error("postScore fallido:", error);
                        }
                        answerFlag = true;
                        break;
                    }
                    await wait(300);
                }
            }
        }
    
        // answerWindow booleano async, detiene al bucle por tiempo.
        while (!answerFlag) { // repetir mientras no se responda correctamente y !runningFlag
    
            if (!runningFlag) {
                console.log("Juego de trivia cancelado");
                break;
            }
    
            const lastMessageData = getLastMessageData(); // se encarga de siempre recibir el último mensaje enviado o ser null si no hay tal
    
            // Llamada a la función de lógica de salida
            await checkExitCondition();
    
            if (lastMessageData !== null) {
                const [userName, userPhoneNumber, userAnswer, userAnswerTime] = lastMessageData;
                const phoneNumberForMention = cutTelephoneForMention(userPhoneNumber);
    
                try {
                    postCongrats(answerFlag, phoneNumberForMention, userAnswer, question); // Mensaje de respuesta detectada
                    console.log("postCongrats terminado");
                } catch (error) {
                    console.error("postCongrats fallido:", error);
                }
    
                if (normalizeText(userAnswer).includes(normalizeText(answer))) { // respuesta correcta detectada
                    if (!thinkers.includes(phoneNumberForMention)) { // evita asignar doble puntaje al mismo usuario
                        updateOrAdd(phoneNumberForMention, points); // añadir o sumar a dueño de "phone" a personas inteligentes
                        thinkers.push(phoneNumberForMention);
                        points--;
                        correctAnswersCounter++; // Incrementar contador de respuestas correctas
    
                        // Llamada a la función de lógica de salida
                        await checkExitCondition();
                    }
                } else { // respuesta equivocada
                    updateOrAdd(phoneNumberForMention, 1, true);
                }
            }
    
            // Introducir una pausa para evitar bloqueo        
            await wait(300);
        }
    } // completo (llamar a checkAnswer como primer paso)    

    function getLastMessageData() {
        const messageListContainer = document.querySelector('.x3psx0u.xwib8y2.xkhd6sd.xrmvbpv'); // obtención del contenedor de mensajes.
        console.log('Iniciando getLastMessageData.');

        if (!messageListContainer) {
            console.log('messageListContainer no encontrado.');
            return null;
        }
        console.log('messageListContainer encontrado.');

        const messageItems = messageListContainer.children; // obtención de lista de elementos

        if (messageItems === messageListSize) {
            console.log('messageItems no ha cambiado de tamaño.');
            return null;
        }
        console.log('messageItems ha cambiado de tamaño.');

        messageListSize = messageItems.length; // reasignar el valor de messageListSize con el valor de messageItems
        if (!(messageItems.length > 0)) {
            console.log('messageItems está vacío.');
            return null;
        }

        const messageItem = messageItems[messageItems.length - 1]; // selección del último elemento de la lista

        // primer intento con variante de chat grupal
        let messageWrapper = messageItem.querySelector('div._amjv._aotl > .message-in.focusable-list-item._amjy._amjw > ._amk4, ._amkd, ._amk5 > ._amk6._amlo > div.x9f619.x1hx0egp.x1yrsyyn.x1sxyh0.xwib8y2.xohu8s8 > ._ahxj._ahxz.x78zum5');
        let messageInfoContainer = messageItem.querySelector('._amjv._aotl > .message-in.focusable-list-item._amjy._amjw > ._amk4, ._amkd, ._amk5 > ._amk6._amlo > div.x9f619.x1hx0egp.x1yrsyyn.x1sxyh0.xwib8y2.xohu8s8');

        if (!messageWrapper) { // messageWrapper grupal no encontrado
            console.log('messageWrapper de chat grupal no encontrado.');

            // segundo intento con variante de chat privado
            messageWrapper = messageItem.querySelector('div._amjv._aotl span._ao3e.selectable-text.copyable-text'); // messageWrapper = messageItem.querySelector('div._amjv._aotl > .message-in.focusable-list-item._amjy._amjz._amjw > ._amk4._amkd > ._amk6._amlo > div.x9f619.x1hx0egp.x1yrsyyn.x1ct7el4.x1dm7udd.xwib8y2 > ._ahxj._ahxz.x78zum5');
            messageInfoContainer = messageItem.querySelector('div._amjv._aotl div._amk6._amlo');
            if (!messageWrapper) { // messageWrapper individual no encontrado
                console.log('messageWrapper de chat individual no encontrado.');
                return null;
            }
            console.log('messageWrapper de chat individual encontrado.');
        }
        console.log('messageWrapper de chat grupal encontrado.');

        let nameElement = messageWrapper.querySelector('span._ahxy'); // solución para números no registrados dentro de grupos
        let numberElement = messageWrapper.querySelector('span._ahx_');

        if (!nameElement || !numberElement) { // solución para números registrados dentro de grupos
            nameElement = messageWrapper.querySelector('span._ahxt.x1ypdohk.xt0b8zv._ao3e'); // _ahxt x1ypdohk xt0b8zv _ao3e
            numberElement = messageWrapper.querySelector('span._ahxt.x1ypdohk.xt0b8zv._ao3e'); // mismo para nombre y teléfono

            if (!nameElement || !numberElement) { // solución para chat privado
                nameElement = messageInfoContainer.querySelector('span[aria-label]'); // chat personal, no grupo
                numberElement = messageInfoContainer.querySelector('span[aria-label]'); // mismo

                if (!nameElement || !numberElement) {
                    console.log('No se encontró nameElement o numberElement.');
                    return null;
                }
            }
        }
        console.log('Se encontró nameElement o numberElement.');

        const name = nameElement.innerText.trim();
        const number = numberElement.innerText.trim();

        // Ahora buscamos el mensaje
        let messageTextContainer = messageInfoContainer.querySelector('._ahy1.copyable-text');
        if (!messageTextContainer) {
            messageTextContainer = messageInfoContainer.querySelector('div div.x9f619.x1hx0egp.x1yrsyyn.x1ct7el4.x1dm7udd.xwib8y2 span._ao3e.selectable-text.copyable-text');
            if (!messageTextContainer) { // variante chat privado
                console.log('messageTextContainer no encontrado.');
                return null;
            }
        }
        console.log('messageTextContainer encontrado.');

        // Seleccionamos el div con la clase _akbu que debería contener el mensaje
        const messageTextWrapper = messageTextContainer.querySelector('._akbu');
        if (messageTextWrapper) {
            console.log('messageTextWrapper encontrado.');
        }

        const messageTextElement = messageTextWrapper.querySelector('._ao3e.selectable-text.copyable-text'); // Seleccionamos el span con el mensaje
        if (messageTextElement) {
            console.log('messageTextElement encontrado.');
        }

        let messageSpan = messageTextElement.querySelector('span');
        if (!messageSpan) { // versión chat privado
            messageSpan = messageTextContainer.querySelector('span');
            if (!messageSpan) {
                console.log('messageSpan no encontrado.');
                return null;
            }
        }
        console.log('messageSpan encontrado.');

        const message = messageSpan.innerText.trim(); // texto copiado
        if (!message) {
            console.log('message no encontrado.');
            return null;
        }
        console.log('message encontrado.');

        // versión chat grupal | Hora
        let timeWrapper = messageInfoContainer.querySelector('.x1n2onr6.x1n327nk.x18mqm2i.xhsvlbd.x11i5rnm.xz62fqu.xsgj6o6');
        let time = 'unknown';
        if (!timeWrapper) {
            timeWrapper = messageTextWrapper.querySelector('span > span.x3nfvp2.xxymvpz.xlshs6z.xqtp20y.xexx8yu.x150jy0e.x18d9i69.x1e558r4.x12lo8hy.x152skdk');
            if (!timeWrapper) { // versión chat privado
                console.log('timeWrapper no encontrado');
            }
        }
        console.log('timeWrapper encontrado');

        let timeSubContainer = timeWrapper.querySelector('.x13yyeie.xx3o462.xuxw1ft.x78zum5.x6s0dn4.x12lo8hy.x152skdk');
        if (!timeSubContainer) {
            console.log('timeSubContainer no encontrado');
        }

        let timeElement = timeSubContainer.querySelector('.x1rg5ohu.x16dsc37');
        if (!timeElement) {
            timeElement = timeSubContainer.querySelector('span.x1c4vz4f.x2lah0s'); // versión chat privado
            if (timeElement) {
                time = timeElement.innerText.trim();
            }
        }

        console.log(`Nombre: ${name}, Número: ${number}, Mensaje: ${message}, Hora: ${time}`); // Publicamos todos los datos en una sola salida
        const items = [name, number, message, time]; // Crear un arreglo con los textos
        return items;
    } // completo

    async function postCongrats(correctAnswer, name, message, question) {
        console.log(`iniciando postCongrats para respuesta: ${correctAnswer}`);
        if (isTyping) {
            console.log("postCongrats segunda llamada detectada");
            return null;
        }
        isTyping = true;

        let messageTail = "☑ *_respuesta recibida_* ☑";
        // if(!correctAnswer) messageTail = "*_¡respuesta incorrecta!_*"; // respuesta incorrecta                    

        const textarea = getInputTextArea(); // obtención de cuadro de escritura
        textarea.focus(); // enfocar área de escritura de texto

        /* truncar mensaje largo */
        let answer = message; // strings
        if (answer.length > 30) { // si answer tiene más de 30 caracteres
            answer = answer.substring(0, 30) // answer es truncado a 30 caracteres
            answer += "…"; // y se le añaden puntos al final
        }

        // citar la pregunta
        insertText(`${question}`); // TODO
        //await wait(50);
        insertNewLineAtTextArea(textarea, 2); // quitar "2"
        //insertNewLineAtTextArea(textarea); // insertar nueva linea en el cuadro de escritura
        await wait(50); // espera necesaria para que no coloque el texto antes que los saltos se lleven a cabo

        insertText(`_*respuesta:*_ "${answer}". _*jugador:*_ @${normalizeText(name)}`); // TODO        
        await wait(50);
        pressTabKey(textarea); // simular pulsación de la tecla TAB
        await wait(50);

        insertNewLineAtTextArea(textarea, 2); // insertar nueva linea en el cuadro de escritura
        //insertNewLineAtTextArea(textarea); // insertar nueva linea en el cuadro de escritura    
        await wait(50);
        insertText(messageTail);

        //await sleep(150).executeAsync();
        await wait(50);
        clickSendButton(); // enviar felicitación
        //await sleep(150).executeAsync();
        await wait(500); // esperar a que se envíe        

        isTyping = false;
    } // completo

    async function postScore(ended, thinkers = null) {
        console.log(`iniciando postScore con llave: ${ended}`);

        const textarea = getInputTextArea(); // obtención de cuadro de escritura
        textarea.focus(); // enfocar área de escritura de texto

        console.log("postScore. Detectado");

        let headerText = `*_MARCADOR ACTUAL:_*`;
        if (ended) {
            /* Mensaje de finalización */
            sendMessage(`Finalizando dinámica de trivia… ¡Buen trabajo a todos!`); // mensaje inicial
            await wait(3200);
            /* Mensaje de finalización */
            headerText = `*_MARCADOR FINAL:_*`;
        }

        insertText(headerText);
        insertNewLineAtTextArea(textarea, 2); // insertar N nuevas líneas en el cuadro de escritura            
        await wait(50);
    
        const sortedPeople = Object.entries(intelligentPeople).map(([participante, puntaje]) => {
            return { participante, puntaje }; // Crea un objeto con la nación y el porcentaje
        }).filter(({ puntaje }) => puntaje > 0) // Filtra puntaje criterio mayor a 0
            .sort((a, b) => b.puntaje - a.puntaje); // Ordena de mayor a menor        

        /*
        const sortedPeople = Object.entries(intelligentPeople).map(([participante, puntaje]) => {
            return { participante, puntaje };
        }) // Divide en dos listas: una para puntajes positivos y otra para negativos
            .sort((a, b) => b.puntaje - a.puntaje); // Ordena de mayor a menor sin filtrar
        */

        let medals = 1;
        for (const { participante, puntaje } of sortedPeople) {
            textarea.focus(); // enfocar área de escritura de texto

            if (medals < 4) { // casos especiales de medalla o conteo normal
                if (medals === 1 && ended) {
                    insertText(`- 🥇 `);
                } else if (medals === 2 && ended) {
                    insertText(`🥈 `);
                } else if (medals === 3 && ended) {
                    insertText(`🥉 `);
                } else if (medals === 1 && !ended) {
                    insertText(`- `);
                }
            }

            insertText(`*${puntaje}* puntos ➨ @${normalizeText(participante)}`);

            await wait(50);
            pressTabKey(textarea); // simular pulsación de la tecla TAB
            await wait(50);

            if (ended) { // ended true | Marcador final
                if (medals === 1 || medals === 3) {
                    insertText(formatText(`¡${medals}er lugar!`));
                    if (medals === 3) break; // si es 3, ahí salimos
                } else if (medals === 2) {
                    // insertText(`*_¡${medals}do lugar!_*`);
                    insertText(formatText(`¡${medals}do lugar!`));
                }
            } else {
                if (thinkers.includes(participante)) { // participante === thinkers[0] || participante === thinkers[1] || participante === thinkers[2]
                    // Array de mensajes de felicitación
                    const felicitaciones = ["¡excelente!", "¡genial!", "¡asombroso!", "¡increíble!", "¡fantástico!"];

                    // Seleccionar un mensaje aleatorio del array
                    const mensajeAleatorio = felicitaciones[Math.floor(Math.random() * felicitaciones.length)];

                    // Insertar el mensaje en el área de texto
                    insertText(formatText(mensajeAleatorio));
                    await wait(50);
                }
            }
            console.log(`postScore. Participante con puntos insertado`);

            /** medida anti último elemento vacío */
            medals++
            if (medals - 1 !== sortedPeople.length) { // si contador diferente del total
                console.log(`postScore. Insertando nueva línea`);
                insertNewLineAtTextArea(textarea); // insertar nueva linea en el cuadro de escritura                    
            }
            await wait(50);
        }

        await wait(50);
        clickSendButton(); // enviar felicitación
        await wait(50);
    }

    function updateOrAdd(intelligentPerson, points, wrongResponse = false) {
        if (Object.prototype.hasOwnProperty.call(intelligentPeople, intelligentPerson)) {
            if (wrongResponse) {
                if (intelligentPeople[intelligentPerson] > 0) { // solo restar si es mayor a 0
                    intelligentPeople[intelligentPerson] -= points; // Disminuye el valor si la clave existe en el mapa.
                }
            } else {
                intelligentPeople[intelligentPerson] += points; // Incrementa el valor si la clave existe en el mapa.
            }
        } else {
            if (wrongResponse) {
                intelligentPeople[intelligentPerson] = 0; // Respondió mal y no está en la lista, añadir con valor de 0
            } else {
                intelligentPeople[intelligentPerson] = points; // Añade la clave con valor "points" si no existe.
            }
        }
    } // completo (se basa en map global)

    function cutTelephoneForMention(userNumber) {
        if (userNumber.startsWith("+52") && !userNumber.startsWith("+52 9") && !userNumber.startsWith("+52 33")) {
            userNumber = userNumber.substring(0, 16)
            /*if (user.startsWith("+52_Pi")) {
                user = user.substring(0, 5)
            }*/
        } else if (userNumber.startsWith("+53")) {
            if (userNumber.startsWith("+53 63")) {
                userNumber = userNumber.substring(0, 9)
            } else {
                userNumber = userNumber.substring(0, 10)
            }
        } else if (userNumber.startsWith("+54") && !userNumber.startsWith("+54_")) {
            userNumber = userNumber.substring(0, 16)
        } else if (userNumber.startsWith("+51") || userNumber.startsWith("+58 412") || userNumber.startsWith("+44")) { // Lunita
            userNumber = userNumber.substring(0, 13)
        } else if (userNumber.startsWith("+55")) {
            userNumber = userNumber.substring(0, 14)
        } else if (userNumber.startsWith("+593")) {
            userNumber = userNumber.substring(0, 14)
        } else if (userNumber.startsWith("+503")) {
            userNumber = userNumber.substring(0, 12)
        } else if (userNumber.startsWith("+1 ") || userNumber.startsWith("+237") || userNumber.startsWith("+52 9") || userNumber.startsWith("+52 33")) { // Estados Unidos y Canadá (+1)
            userNumber = userNumber.substring(0, 15)
        } else if (userNumber.startsWith("+598")) {
            userNumber = userNumber.substring(0, 13)
        } else if (userNumber.startsWith("+507")) {
            userNumber = userNumber.substring(0, 12)
        } else if (userNumber.startsWith("+595")) {
            userNumber = userNumber.substring(0, 12)
        } else {
            //(user.startsWith("+58 424-") || user.startsWith("+58 426-") || user.startsWith("+44") || user.startsWith("+57 313"))
            userNumber = userNumber.slice(0, -1); // recortar el carácter final
        }
        return userNumber;
    } // completo
    function cutTelephoneForMentionFx(user) {
        const lengthByPrefix = {
            "+52": 16,
            "+54": 16,
            "+51": 13,
            "+55": 14,
            "+593": 14,
            "+503": 12,
            "+598": 13,
            "+507": 12,
            "+595": 12
        };

        // Caso especial para prefijos +53
        if (user.startsWith("+53")) {
            user = user.startsWith("+53 63") ? user.substring(0, 9) : user.substring(0, 10);
        }
        // Caso especial para prefijo +1 (EE.UU. y Canadá)
        else if (user.startsWith("+1") && user.includes(" ")) {
            user = user.substring(0, 15);
        }
        // Uso del diccionario para los demás prefijos
        else {
            for (const [prefix, length] of Object.entries(lengthByPrefix)) {
                if (user.startsWith(prefix)) {
                    user = user.substring(0, length);
                    break;
                }
            }
        }

        return user;
    } // completo   

    async function insertNewLineAtTextArea(textarea, repeat = 1) {
        // Enfocar el área de texto una vez al principio
        textarea.focus();

        // Función para simular Shift + Enter
        const insertLine = () => {
            textarea.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter', keyCode: 13, which: 13, shiftKey: true, bubbles: true
            }));
            textarea.dispatchEvent(new KeyboardEvent('keypress', {
                key: 'Enter', keyCode: 13, which: 13, shiftKey: true, bubbles: true
            }));
            textarea.dispatchEvent(new KeyboardEvent('keyup', {
                key: 'Enter', keyCode: 13, which: 13, shiftKey: true, bubbles: true
            }));
            textarea.dispatchEvent(new Event('input', { bubbles: true }));

            /*
            const pressedKey = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, shiftKey: true, bubbles: true, cancelable: true, view: window });
            textarea.dispatchEvent(pressedKey) */
        };

        // Repetir el comportamiento según el valor de 'repeat'
        for (let i = 0; i < repeat; i++) {
            insertLine();
            await wait(50); // esperar entre líneas
        }
    }

    function pressTabKey(textarea) {
        textarea.focus(); // enfocar área de escritura de texto

        /*
        // simular pulsación de la tecla TAB
        textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', keyCode: 9, which: 9, bubbles: true }));
        textarea.dispatchEvent(new KeyboardEvent('keypress', { key: 'Tab', keyCode: 9, which: 9, bubbles: true }));
        textarea.dispatchEvent(new KeyboardEvent('keyup', { key: 'Tab', keyCode: 9, which: 9, bubbles: true }));
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        */

        const pressedKey = new KeyboardEvent('keydown', { key: 'Tab', keyCode: 9, which: 9, bubbles: true });
        textarea.dispatchEvent(pressedKey);
    } // completo
    /* Solo revisar respuesta */



    // Función para crear un generador de números pseudoaleatorios basado en una semilla.
    function seedRandom(seed) {
        let x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    // Función para aleatorizar un arreglo usando una semilla.
    function shuffleArrayWithSeed(array, seed) {
        let random = () => seedRandom(seed);
        let newArray = [...array]; // Copiar el arreglo original para no modificarlo directamente

        // Algoritmo de Fisher-Yates Shuffle usando el generador basado en semilla
        for (let i = newArray.length - 1; i > 0; i--) {
            let j = Math.floor(random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }

        return newArray;
    }



    // Primer paso llamar a la función checkAndCreateButton cada 2 segundos
    setInterval(checkAndCreateButton, 2000);

    console.log("Juego de trivia para grupos de Whatsapp cargado y listo");
})();