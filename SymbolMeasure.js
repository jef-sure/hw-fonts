class SymbolMeasure {
    constructor() {
        this.left = undefined;
        this.right = undefined;
        this.top = undefined;
        this.bottom = undefined;
    }
    canvas2Point(x, y) {
        return [x, y];
    }
    drawPointCanvas(x, y) {
        if (this.left === undefined) {
            this.left = x;
            this.right = x;
            this.top = y;
            this.bottom = y;
        } else {
            if (x < this.left) this.left = x;
            else if (x > this.right) this.right = x;
            if (y < this.top) this.top = y;
            else if (y > this.bottom) this.bottom = y;
        }
    }
    drawLine(x1, y1, x2, y2) {
        this.drawPointCanvas(x1, y1);
        this.drawPointCanvas(x2, y2);
    }
}