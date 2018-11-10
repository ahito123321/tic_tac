$(document).ready(function(){
    let isX; //крестик или нолик
    let UserName;

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

    /**
     * При вызове функции формируется массив, на основе игрового поля который содержить 
     * в себе коэффициенты от 0 до 1. 
     *      Если в ячейке ничего не стоить, то будет записано 0.
     *      Если в ячейке стоит 0, то будет записано 0.5.
     *      Если в ячейке стоит 1, то будет записано 1.
     */
    function getArrayCoefficients() {
        let arr = [];
        $(".wrap-playing-field-table tr td").each(function (index, val) {
            if (index % 11 != 0) {
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
    function getSendObject(arr, index) {
        let rightCoord = Math.floor(index / 11);
        let topCoord = (index - rightCoord) - (rightCoord * 10) - 1;
        console.log(rightCoord + " - " + topCoord);
        return ({
            input: arr,
            output: [topCoord, rightCoord]
        });
    }
    /**
     * 
     * @param {string} index - строка состоящая из 2 символов, где первый символ
     *      координата по вертикали, а 2 символ по горизонтали
     */
    function isEmptyCell(index){
        let arr = getArrayCoefficients();
        let i = Math.floor(index / 10) * 10 + (index % 10);
        if (arr[i] == 0) {
            return true;
        } else {
            return false;
        }
    } 

    startGame();

    $(".wrap-overlay-choice-window-arr").click(function(e){
        UserName = $(".wrap-overlay-choice-window-input").val();
        isX = $(".wrap-overlay-choice-window-x").hasClass("wrap-overlay-choice-window-x-active");
        
        if (UserName != ""){
            $.ajax({
                type: "POST",
                url: "/ticitac",
                data: JSON.stringify({ UserName: UserName, Side: isX }),
                dataType: "json",
                contentType: "application/json",
                beforeSend: function() {
                    closeChoiceSide();
                    showLoading("Collection of necessary information");
                },
                success: function (response) {
                    //Заполнение блока статистики
                    $(".wrap-info-stats-block div:nth-child(1) span").html(response.UserName).css({
                        color: (!isX) ? ("#e41d23") : ("#2c73b8")
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
                            if (isX != whoFirst){
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
                            if (index == (Math.floor(arrCoord[maxIndex] / 10) * 11 + (arrCoord[maxIndex] % 10) + 1)) {
                                $(this).html((!isX) ? ("X") : ("0"));
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
                    $(".wrap-playing-field-table tr td").each(function (index, val) {
                        if (index % 11 != 0) {
                            $(val).unbind("click");
                        }
                    });
                }
                closeLoading();
            }
        });
    }


    // Функция проверки есть на оле 5 в ряд либо X, либо 0
    function isContainFiveInRow() {
        let arr1 = [];  // -> указание направления, которым записан массив, начало слева и вверх
        let arr2 = [];  // \/
        let arr3 = [];  // /
        let arr4 = [];  // \

        let rowArr = 0;
        let colArr = 0;

        let valueX0;

        $(".wrap-playing-field-table tr td").each(function (index, val) {
            if (index % 11 != 0) {
                let rightCoord = Math.floor(index / 11);
                let topCoord = (index - rightCoord) - (rightCoord * 10) - 1;
                
                if ($(val).html() == "") valueX0 = 0;
                if ($(val).html() == "0") valueX0 = 0.5;
                if ($(val).html() == "X") valueX0 = 1;

                arr1[10 * rightCoord + topCoord] = valueX0;
                arr2[10 * topCoord + rightCoord] = valueX0;
                arr3[10 * rowArr + colArr] = valueX0;
                
                
            }
        });
        /*
         int rowArr = 0;
            int colArr = 0;
            int pob = 0;
            int index = 0;
            int[] newArr = new int[25];
            while (rowArr != 5 && colArr != 5)
            {
                newArr[index] = arr[rowArr - pob, colArr + pob];
                if (rowArr - pob == 0 || colArr + pob == 4)
                {
                    if (rowArr < 4)
                    {
                        rowArr++;
                    }
                    else
                    {
                        colArr++;
                    }
                    pob = 0;
                }
                else
                {
                    pob++;
                }
                index++;
            }
        */

        return false;
    }

    // Навешивание обработчика события на ячейку игрового поля
    $(".wrap-playing-field-table tr td").each(function (index, val) {
        if (index % 11 != 0) {
            $(val).on("click", function(e) {
                if (!isContainFiveInRow()) {
                    $(this).html((isX) ? ("X") : ("0"));
                    makeMove(getSendObject(getArrayCoefficients(), index), getArrayCoefficients());
                }
            });
        }
    });
});