$(document).ready(function(){
    let IS_X; //крестик или нолик игрока
    let USER_NAME;
    const SIZE_TABLE = 10;
    const SEQUENCE_WIN = 5;
    const VALUE_X = 1;
    const VALUE_0 = 0.5;
    const VALUE_EMPTY = 0;

    const BOT_WON = 1;
    const PLAYER_WON = 2;

    //Функции последовательного отображения модальных окон при первоначальном запуске
    function startGame(){
        $(".wrap-overlay-choice").removeClass("filter-blur5");

        $(".wrap-overlay-loading").css({
            display: "none"
        });

        $(".wrap-overlay-choice-window-x").click(function(e){
            $(this).addClass("wrap-overlay-choice-window-x-active");
            $(".wrap-overlay-choice-window-0").removeClass("wrap-overlay-choice-window-0-active");
        });

        $(".wrap-overlay-choice-window-0").click(function(e){
            $(this).addClass("wrap-overlay-choice-window-0-active");
            $(".wrap-overlay-choice-window-x").removeClass("wrap-overlay-choice-window-x-active");
        });
    }
    //

    //функции отображения модальных окон
    function removeMainBlur5(){
        $(".wrap-playing-field").removeClass("filter-blur5");
        $(".wrap-info").removeClass("filter-blur5");
    }
    function addMainBlur5(){
        $(".wrap-playing-field").addClass("filter-blur5");
        $(".wrap-info").addClass("filter-blur5");
    }
    function showLoading(infoStr){
        $(".wrap-overlay-loading").css({
            display: "flex"
        });
        $(".wrap-overlay-loading-additional-info").html(infoStr);
        addMainBlur5();
    }
    function closeLoading(){
        $(".wrap-overlay-loading").css({
            display: "none"
        });
        removeMainBlur5();
    }
    function showChoiceSide(){
        $(".wrap-overlay-choice").css({
            display: "none"
        });
        addMainBlur5();
    }
    function closeChoiceSide(){
        $(".wrap-overlay-choice").css({
            display: "none"
        });
        removeMainBlur5();
    }

    function unbindClick() {
        $(".wrap-playing-field-table tr td").each(function (index, val) {
            if (index % (SIZE_TABLE + 1) != 0) {
                $(val).unbind("click");
            }
        });
    }

    /**
     * При вызове функции формируется массив, на основе игрового поля который содержить 
     * в себе коэффициенты от 0 до 1. 
     *      Если в ячейке ничего не стоить, то будет записано 0.
     *      Если в ячейке стоит 0, то будет записано 0.5.
     *      Если в ячейке стоит X, то будет записано 1.
     */
    function getArrayCoefficients() {
        let arr = [];
        $(".wrap-playing-field-table tr td").each(function (index, val) {
            if (index % (SIZE_TABLE + 1) != 0) {
                if ($(val).html() == "") arr.push(0);
                if ($(val).html() == "0") arr.push(0.5);
                if ($(val).html() == "X") arr.push(1)
            }
        });
        return arr;
    }

    /**
     * 
     * @param {Array} arr - массив, содержащий данные на основе которых нейронная сеть формирует ответ
     * @param {Number} index - индекс, который является наименованием объекта и координатами на игровом поле
     * 
     *  Функци возвращает объект необходимый для отправки запроса 
     */
    function getTrainData(arr, index) {
        let rightCoord = Math.floor(index / (SIZE_TABLE + 1));
        let topCoord = (index - rightCoord) - (rightCoord * SIZE_TABLE) - 1;

        let result = {
            input: arr,
            output: { }
        }
        let temp = `${rightCoord}${topCoord}`;
        result.output[temp] = 1;
        return result;
    }
    /**
     * 
     * @param {string} index - строка состоящая из 2 символов, где первый символ
     *      координата по вертикали, а 2 символ по горизонтали
     */
    function isEmptyCell(index){
        let arr = getArrayCoefficients();
        let i = Math.floor(index / SIZE_TABLE) * SIZE_TABLE + (index % SIZE_TABLE);
        if (arr[i] == 0) {
            return true;
        } else {
            return false;
        }
    } 

    startGame();

    //НАЧАЛО
    $(".wrap-overlay-choice-window-arr").click(function(e){
        USER_NAME = $(".wrap-overlay-choice-window-input").val();
        IS_X = $(".wrap-overlay-choice-window-x").hasClass("wrap-overlay-choice-window-x-active");
        
        if (USER_NAME != ""){
            $.ajax({
                type: "POST",
                url: "/ticitac",
                data: JSON.stringify({ UserName: USER_NAME, Side: IS_X }),
                dataType: "json",
                contentType: "application/json",
                beforeSend: function() {
                    closeChoiceSide();
                    showLoading("Collection of necessary information");
                },
                success: function (response) {
                    //Заполнение блока статистики
                    $(".wrap-info-stats-block div:nth-child(1) span").html(response.USER_NAME).css({
                        color: (!IS_X) ? ("#e41d23") : ("#2c73b8")
                    });
                    $(".wrap-info-stats-block div:nth-child(2) span").html(response.AllGames);
                    $(".wrap-info-stats-block div:nth-child(3) span").html(response.BotWins);
                    $(".wrap-info-stats-block div:nth-child(4) span").html(response.TrainData);
                    let temp = (response.FirstStep == 0) ? ("0") : ("X");
                    $("#game-log").val("The first moves - " + temp);
                    //Обучение системы
                    let whoFirst = response.FirstStep;
                    $.ajax({
                        type: "GET",
                        url: "/tictac/train",
                        beforeSend: function() {
                            showLoading("System training...");
                        },
                        success: function(response) {
                            if (IS_X != whoFirst){
                                makeMove({}, getArrayCoefficients());
                            }
                            else{
                                closeLoading();
                            }
                        }
                    });
                }
            });
        }
        else{
            $(".wrap-overlay-choice-window-input").css({
                border: "1px solid red"
            });
        }
    });

    function makeMove(train, tableForStep){
        $.ajax({
            type: "POST",
            url: "/tictac/step",
            data: JSON.stringify({ Train: train, TableForStep: tableForStep }),
            dataType: "json",
            contentType: "application/json",
            beforeSend: function() {
                showLoading("Waiting for move!");
            },
            success: function (response) {
                let arrCoord = [];      // Массив строк координат
                let arrProbab = [];     // Массив вероятностей
                for (let coord in response.res){
                    arrCoord.push(coord);
                    arrProbab.push(response.res[coord]);
                }
                while (arrCoord.length != 0) {
                    let maxProbab = 0;
                    let maxIndex;
                    for (let index = 0; index < arrProbab.length; index++) {
                        if (arrProbab[index] > maxProbab) {
                            maxProbab = arrProbab[index];
                            maxIndex = index;
                        }
                    }
                    if (isEmptyCell(arrCoord[maxIndex])) {
                        $(".wrap-playing-field-table tr td").each(function (index, val) {
                            if (index == (Math.floor(arrCoord[maxIndex] / SIZE_TABLE) * (SIZE_TABLE + 1) + 
                                    (arrCoord[maxIndex] % SIZE_TABLE) + 1)) {
                                $(this).unbind("click");
                                $(this).html((!IS_X) ? ("X") : ("0"));
                            }
                        });
                        break;
                    } else {
                        arrCoord.splice(maxIndex, 1);
                        arrProbab.splice(maxIndex, 1);
                    }
                }
                if (arrCoord.length == 0) {
                    $('.wrap-playing-field-table caption').html("A small problem! Due to the lack of trained data, " +
                            "the neural network does not know where to go! Please restart the game.");
                    unbindClick();
                } else {
                    let result = isContainSequnceInRow();
                    if (result != null) {
                        endGame(result);
                    }
                }

                closeLoading();
            }
        });
    }

    function endGame(result) {
        unbindClick();
        $('.wrap-playing-field-table caption').html(`End game.
                Won ${(result[0].value == VALUE_X) ? ("X") : ("0")} - 
                ${((result[0].value == VALUE_X) == IS_X) ? ("player " + USER_NAME) : ("BOT")}
                . Please start the game again.`);
        $(".wrap-playing-field-table tr td").each(function (index, val) {
            let rightCoord = Math.floor(index / (SIZE_TABLE + 1));
            let topCoord = (index - rightCoord) - (rightCoord * SIZE_TABLE) - 1;
            result.forEach(element => { 
                if (element.coord[0] == rightCoord && topCoord == element.coord[1]) {
                    $(this).css({
                        background: "#e41d23"
                    });
                }
            });
        });
        $.ajax({
            type: "POST",
            url: "/tictac/end",
            data: JSON.stringify({ 
                Result: (result[0].value != IS_X) ? (PLAYER_WON) : (BOT_WON),
            }),
            dataType: "json",
            contentType: "application/json",
            success: function (response) {

            }
        })
    }

    // Функция определения содержат ли линейные массивы SEQUENCE_WIN в ряд
    function isContainSequenceLineir(arr1, arr2) {

        let sequenceArr1X = [];
        let sequenceArr10 = [];

        let sequenceArr2X = [];
        let sequenceArr20 = [];
        
        let temp1;
        let temp2;

        for (let row = 0; row < SIZE_TABLE; row++) {
            for (let col = 0; col < SIZE_TABLE; col++) {

                temp1 = arr1[row][col];
                temp2 = arr2[row][col];

                if (temp1.value == VALUE_0) {
                    sequenceArr10.push(arr1[row][col]);
                    sequenceArr1X = [];
                } else if (temp1.value == VALUE_X) {
                    sequenceArr1X.push(arr1[row][col]);
                    sequenceArr10 = [];
                } else {
                    sequenceArr1X = [];
                    sequenceArr10 = [];
                }

                if (temp2.value == VALUE_0) {
                    sequenceArr20.push(arr2[row][col]);
                    sequenceArr2X = [];
                } else if (temp2.value == VALUE_X) {
                    sequenceArr2X.push(arr2[row][col]);
                    sequenceArr20 = [];
                } else {
                    sequenceArr2X = [];
                    sequenceArr20 = [];
                }

                if (sequenceArr10.length == SEQUENCE_WIN) {
                    return sequenceArr10;
                }
                if (sequenceArr1X.length == SEQUENCE_WIN) {
                    return sequenceArr1X;
                }
                if (sequenceArr20.length == SEQUENCE_WIN) {
                    return sequenceArr20;
                }
                if (sequenceArr2X.length == SEQUENCE_WIN) {
                    return sequenceArr2X;
                }
            }
            
            sequenceArr1X = [];
            sequenceArr10 = [];
            sequenceArr2X = [];
            sequenceArr20 = [];
        }
        return null;
    }

    //Функция определения содержат ли диагональные массивы SEQUENCE_WIN в ряд
    function isContainSequnceDiagonal(arr3, arr4) {

        let sequenceArr3X = [];
        let sequenceArr30 = [];

        let sequenceArr4X = [];
        let sequenceArr40 = [];

        let temp3;
        let temp4;

        for (let row = 0; row < SIZE_TABLE * 2 - 1; row++) {
            for (let col = 0; col < arr3[row].length; col++) {

                if (arr3[row].length >= SEQUENCE_WIN) {

                    temp3 = arr3[row][col];
                    temp4 = arr4[row][col];

                    if (temp3.value == VALUE_0) {
                        sequenceArr30.push(arr3[row][col]);
                        sequenceArr3X = [];
                    } else if (temp3.value == VALUE_X) {
                        sequenceArr3X.push(arr3[row][col]);
                        sequenceArr30 = [];
                    } else {
                        sequenceArr3X = [];
                        sequenceArr30 = [];
                    }
    
                    if (temp4.value == VALUE_0) {
                        sequenceArr40.push(arr4[row][col]);
                        sequenceArr4X = [];
                    } else if (temp4.value == VALUE_X) {
                        sequenceArr4X.push(arr4[row][col]);
                        sequenceArr40 = [];
                    } else {
                        sequenceArr4X = [];
                        sequenceArr40 = [];
                    }

                    if (sequenceArr30.length == SEQUENCE_WIN) {
                        return sequenceArr30;
                    }
                    if (sequenceArr3X.length == SEQUENCE_WIN) {
                        return sequenceArr3X;
                    }
                    if (sequenceArr40.length == SEQUENCE_WIN) {
                        return sequenceArr40;
                    }
                    if (sequenceArr4X.length == SEQUENCE_WIN) {
                        return sequenceArr4X;
                    }
                }
            }

            sequenceArr3X = [];
            sequenceArr30 = [];
            sequenceArr4X = [];
            sequenceArr40 = [];
        }
        return null;
    } 

    // Функция проверки есть ли на поле SEQUENCE_WIN в ряд либо X, либо 0
    function isContainSequnceInRow() {

        let arr1 = [];  // -> указание направления, которым записан массив, начало слева и вверх
        let arr2 = [];  // \/
        let arr3 = [];  // /
        let arr4 = [];  // \

        let valueX0;
        let temp = [];

        $(".wrap-playing-field-table tr td").each(function (index, val) {
            if ((index % (SIZE_TABLE + 1)) != 0) {
                let rightCoord = Math.floor(index / (SIZE_TABLE + 1));
                let topCoord = (index - rightCoord) - (rightCoord * SIZE_TABLE) - 1;

                if ($(val).html() == "") valueX0 = 0;
                if ($(val).html() == "0") valueX0 = 0.5;
                if ($(val).html() == "X") valueX0 = 1;

                temp.push({ 
                    value: valueX0, 
                    coord: [ rightCoord, topCoord ]
                });
                if (topCoord == 9) {
                    arr1[rightCoord] = temp;
                    temp = [];
                }
                if (rightCoord == 0) {
                    arr2[topCoord] = [];
                }
                arr2[topCoord].push({ 
                    value: valueX0, 
                    coord: [ rightCoord, topCoord ]
                });              
            }
        });

        //формирование диагонального массива слева, вверх на право 
        let rowArr = 0; 
        let colArr = 0;
        let pob = 0;
        let index = 0;

        while (rowArr != SIZE_TABLE && colArr != SIZE_TABLE) {
            if (pob == 0) { 
                arr3[index] = [];
            }
            arr3[index].push(arr1[rowArr - pob][colArr + pob]);
            if (rowArr - pob == 0 || colArr + pob == SIZE_TABLE - 1) {
                if (rowArr < SIZE_TABLE - 1) {
                    rowArr++;
                } else {
                    colArr++;
                }
                pob = 0;
                index++;
            } else {
                pob++;
            }
        }

        //формирование диагонального массива слева, вверх на право 
        rowArr = 0;
        colArr = SIZE_TABLE - 1;
        pob = 0;
        index = 0;
        arr4[index] = [];

        while (rowArr != SIZE_TABLE && colArr != -1) {
            if (pob == 0) { 
                arr4[index] = [];
            }
            arr4[index].push(arr1[rowArr - pob][colArr - pob]);
            if (rowArr - pob == 0 || colArr - pob == 0) {
                if (rowArr != SIZE_TABLE - 1) {
                    rowArr++;
                } else {
                    colArr--;
                }
                pob = 0; 
                index++;
            } else {
                pob++;
            }
        }

        let lineirResult = isContainSequenceLineir(arr1, arr2);

        if (lineirResult != null) {
           return lineirResult;
        } else {

            let diagonalResult = isContainSequnceDiagonal(arr3, arr4);

            if (diagonalResult != null) {
                return diagonalResult;
            }
        }

        return null;
    }

    // Навешивание обработчика события на ячейку игрового поля
    $(".wrap-playing-field-table tr td").each(function (index, val) {
        if (index % (SIZE_TABLE + 1) != 0) {
            $(val).on("click", function() {

                $(this).html((IS_X) ? ("X") : ("0"));

                let result = isContainSequnceInRow();
                if (result != null) {
                    endGame(result);
                } else {
                    $(this).html("");
                    makeMove(getTrainData(getArrayCoefficients(), index), getArrayCoefficients());
                }  

                $(this).html((IS_X) ? ("X") : ("0"));
                $(this).unbind("click");
            });
        }
    });

    $(".wrap-info-btn-end-game").click(function() {
        showLoading("Start a new game");
        location.reload();
    });
});