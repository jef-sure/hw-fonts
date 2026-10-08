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
    // measures kept in the font for every symbol
    static keys() {
        return ['width', 'top', 'bottom', 'left', 'right', 'lineLeft', 'lineRight', 'lineWidth', 'upLeft', 'upRight', 'advance'];
    }
    // spaces of a symbol in the line: the one before it is its own, 0 if it is not set,
    // the one after it is the font's space between symbols unless the symbol has its own
    static spaces(font, symbol) {
        const own = (space) => Number.isFinite(space) && space >= 0;
        return {
            before: symbol && own(symbol.spaceBefore) ? symbol.spaceBefore : 0,
            after: symbol && own(symbol.spaceAfter) ? symbol.spaceAfter : (font.symbolSpace > 0 ? font.symbolSpace : 0),
        };
    }
    // measures of given segments of a symbol, left and right are counted from active area, top and bottom from base line.
    // There are three kinds of them: the maximal ones of the whole drawing (left, right, width, top, bottom, height),
    // the writing ones (lineLeft, lineRight, lineWidth) - of the part within the line of lowercase letters,
    // and the upper ones (upLeft, upRight) - of the part above that line, null when there is nothing there.
    // Symbols are placed by the writing width, a tail above the line takes place only next to another tall symbol,
    // a tail below the base line takes no place at all. The advance is the whole place of a symbol in the line:
    // its writing width with the spaces before and after it, the next symbol begins that far from the beginning of this one
    static ofSymbol(font, codePoint, segments) {
        const cs = font.codePoints[codePoint];
        const bl = font.baseLine + font.symbolOffsetY;
        const lineTop = bl - (font.xHeight > 0 ? font.xHeight : 0);
        let sm = new SymbolMeasure();
        let line = new SymbolMeasure();
        let up = new SymbolMeasure();
        const measure = {
            drawPointCanvas(x, y) {
                sm.drawPointCanvas(x, y);
                if (y < lineTop) up.drawPointCanvas(x, y);
                else if (y <= bl) line.drawPointCanvas(x, y);
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
        const spaces = SymbolMeasure.spaces(font, cs);
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
            upLeft: up.left === undefined ? null : up.left - font.symbolOffsetX,
            upRight: up.left === undefined ? null : up.right - font.symbolOffsetX,
            advance: spaces.before + line.right - line.left + 1 + spaces.after,
        };
    }
}
