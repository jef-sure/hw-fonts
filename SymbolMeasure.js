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
    // measures of given segments of a symbol, left and right are counted from active area, top and bottom from base line.
    // There are two kinds of them: the maximal ones of the whole drawing (left, right, width, top, bottom, height)
    // and the writing ones (lineLeft, lineRight, lineWidth) - of the part within the line of lowercase
    // letters. Symbols are placed by the writing width: a tail above the line or below the base line takes no place in it
    static ofSymbol(font, codePoint, segments) {
        const cs = font.codePoints[codePoint];
        const bl = font.baseLine + font.symbolOffsetY;
        const lineTop = bl - (font.xHeight > 0 ? font.xHeight : 0);
        let sm = new SymbolMeasure();
        let line = new SymbolMeasure();
        const measure = {
            drawPointCanvas(x, y) {
                sm.drawPointCanvas(x, y);
                if (y >= lineTop && y <= bl) line.drawPointCanvas(x, y);
            },
            drawLine(x1, y1, x2, y2) {
                Draw.line(measure, x1, y1, x2, y2);
            }
        };
        for (const skey of segments) {
            if (Array.isArray(cs[skey])) Draw.arrayOfSegments(measure, cs[skey], 1);
        }
        if (sm.left === undefined) return null;
        // a symbol drawn out of the line is written by its whole width
        if (line.left === undefined) line = sm;
        return {
            left: sm.left - font.symbolOffsetX,
            right: sm.right - font.symbolOffsetX,
            width: sm.right - sm.left + 1,
            height: sm.bottom - sm.top + 1,
            top: sm.top - bl,
            bottom: sm.bottom - bl,
            lineLeft: line.left - font.symbolOffsetX,
            lineRight: line.right - font.symbolOffsetX,
            lineWidth: line.right - line.left + 1,
        };
    }
}
