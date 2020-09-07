(function () {
    var firstName = $("#firstName");
    var secondName = $("#secondName");
    var canvas = document.getElementById("canvas");
    var dataURL = canvas.toDataURL();
    var button = document.getElementById("button");
    var hidden = $("#hidden");
    var lastX, lastY;
    var ctx = canvas.getContext("2d");
    var mousePressed = false;
    let signed = false;

    initCanvas();
    function initCanvas() {
        //var ctx = canvas.getContext("2d");
        canvas.addEventListener("mousedown", function (e) {
            mousePressed = true;
            Draw(
                e.pageX - $(this).offset().left,
                e.pageY - $(this).offset().top,
                false
            );
        });
        canvas.addEventListener("mousemove", function (e) {
            if (mousePressed) {
                Draw(
                    e.pageX - $(this).offset().left,
                    e.pageY - $(this).offset().top,
                    true
                );
            }
        });
        canvas.addEventListener("mouseup", function (e) {
            mousePressed = false;
            dataURL = canvas.toDataURL();
        });
        canvas.addEventListener("mouseleave", function (e) {
            mousePressed = false;
        });
    }

    function Draw(x, y, isDown) {
        if (isDown) {
            ctx.beginPath();
            ctx.strokeStyle = "#e43f5a";
            ctx.lineWidth = 2;
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.closePath();
            ctx.stroke();
        }
        lastX = x;
        lastY = y;
        signed = true;
    }

    button.addEventListener("click", function () {
        if (signed) {
            hidden.val(dataURL);
        }
    });
})();
