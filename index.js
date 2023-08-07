"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var image = new Image(100, 100);
image.src = 'b321a9cbd3e03c2b9e07.png';
var canvas = document.querySelector('canvas');
if (canvas) {
    var ctx_1 = canvas.getContext('2d');
    if (ctx_1) {
        setInterval(function () {
            ctx_1.drawImage(image, 0, 0, 100, 100);
        }, 33);
    }
}
