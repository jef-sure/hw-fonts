class Curves {
    static cubicBezierPoint(t, points) {
        let cX = 3 * (points[1].x - points[0].x);
        let bX = 3 * (points[2].x - points[1].x) - cX;
        let aX = points[3].x - points[0].x - cX - bX;
        let cY = 3 * (points[1].y - points[0].y);
        let bY = 3 * (points[2].y - points[1].y) - cY;
        let aY = points[3].y - points[0].y - cY - bY;
        return {
            x: Math.round((aX * Math.pow(t, 3)) + (bX * Math.pow(t, 2)) + (cX * t) + points[0].x),
            y: Math.round((aY * Math.pow(t, 3)) + (bY * Math.pow(t, 2)) + (cY * t) + points[0].y),
        };
    }

    static quadraticBezierPoint(t, points) {
        /*
        x(t) = (x0 − 2x1 + x2)t^2 + 2(x1 − x0)t + x0
        y(t) = (y0 − 2y1 + y2)t^2 + 2(y1 − y0)t + y0
        */
        let sqt = t * t;
        return {
            x: Math.round((points[0].x - 2 * points[1].x + points[2].x) * sqt + 2 * (points[1].x - points[0].x) * t + points[0].x),
            y: Math.round((points[0].y - 2 * points[1].y + points[2].y) * sqt + 2 * (points[1].y - points[0].y) * t + points[0].y),
        };
    }

    static linearMove(t, p0, p1) {
        let dX = t * (p1.x - p0.x);
        let dY = t * (p1.y - p0.y);
        return {
            x: dX + p0.x,
            y: dY + p0.y,
        };
    }

    static shiftNScale(scale_x, scale_y, shift, t, p0, p1) {
        let dX = t * (p1.x - p0.x);
        let dY = t * (p1.y - p0.y);
        return {
            x: scale_x * (dX + p0.x) + shift.x,
            y: scale_y * (dY + p0.y) + shift.y,
        };
    }

    static segmentPieces() {
        return 30.0;
    }

    static drawBezier3p(object, points, color) {
        let ps = points[0];
        if (ps.x == points[1].x && ps.x == points[2].x && ps.y == points[1].y && ps.y == points[2].y) return;
        for (let i = 0; i <= Curves.segmentPieces(); i++) {
            let pe = Curves.quadraticBezierPoint(i / Curves.segmentPieces(), points);
            object.drawLine(ps.x, ps.y, pe.x, pe.y, color);
            ps = pe;
        }
    }

    static drawBezier4p(object, points, color) {
        let ps = points[0];
        if (ps.x == points[1].x && ps.x == points[2].x && ps.x == points[3].x && ps.y == points[1].y && ps.y == points[2].y &&
            ps.y == points[3].y) return;
        for (let i = 0; i <= Curves.segmentPieces(); i++) {
            let pe = Curves.cubicBezierPoint(i / Curves.segmentPieces(), points);
            object.drawLine(ps.x, ps.y, pe.x, pe.y, color);
            ps = pe;
        }
    }
}