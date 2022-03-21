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

    static segments() {
        return 15.0;
    }

    static drawBezier4p(object, points, color) {
        let ps = points[0];
        if (ps.x == points[1].x && ps.x == points[2].x && ps.x == points[3].x && ps.y == points[1].y && ps.y == points[2].y &&
            ps.y == points[3].y) return;
        for (let i = 0; i <= Curves.segments(); i++) {
            let pe = cubic_bezier_point(i / Curves.segments(), points);
            object.drawLine(ps.x, ps.y, pe.x, pe.y, color);
            ps = pe;
        }

    }
}