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

    // the most pieces a curve is divided into, the length of an element is measured with them
    static segmentPieces() {
        return 30.0;
    }

    // number of straight pieces to draw a curve of given length: a piece is about 6 points long,
    // it keeps the drawn line within half a point from the curve, short curves are not divided in vain
    static pieces(length) {
        return Math.min(Math.max(Math.ceil(length / 6), 4), Curves.segmentPieces());
    }

    // points of any element as of a cubic curve drawing the same
    static cubicPoints(element) {
        const p = element.points;
        if (element.type === 'curve' && p.length === 4) return p.map(q => ({
            x: q.x,
            y: q.y
        }));
        if (element.type === 'curve3p' && p.length === 3) return [p[0], Curves.linearMove(2 / 3, p[0], p[1]), Curves.linearMove(2 / 3, p[2], p[1]), p[2]];
        if (element.type === 'line' && p.length === 2) return [p[0], Curves.linearMove(1 / 3, p[0], p[1]), Curves.linearMove(2 / 3, p[0], p[1]), p[1]];
        return [p[0], p[0], p[0], p[0]];
    }

    // 5 points of the curve two symbols would be joined with ideally: a is the last segment of the end connection
    // of the first symbol, b is the first segment of the begin connection of the second one, both as cubic curves
    // in the line. Two points of a and two points of b are kept, the points between them are merged into one in the
    // middle. The curve itself is not drawn, the curve of 4 points is fitted to it
    static quarticJoint(a, b) {
        return [a[0], a[1], Curves.linearMove(0.5, a[2], b[1]), b[2], b[3]];
    }

    // one curve of 4 points joining two symbols, the closest one to the curve of 5 points made by quarticJoint.
    // The ends are kept, the second point lies on the line a[0] - a[1] and the third one on the line b[3] - b[2]:
    // the pen leaves the first symbol and comes to the second one as their connections are drawn. How far these
    // points are on their lines is found by least squares for the curve to go as close as possible to the curve
    // of 5 points
    static joint(a, b) {
        const quartic = Curves.quarticJoint(a, b);
        const p0 = a[0];
        const p3 = b[3];
        const ux = a[1].x - p0.x;
        const uy = a[1].y - p0.y;
        const vx = b[2].x - p3.x;
        const vy = b[2].y - p3.y;
        // curve(t) = p0 * (B0 + B1) + p3 * (B2 + B3) + ka * u * B1 + kb * v * B2
        let suu = 0, suv = 0, svv = 0, sur = 0, svr = 0;
        const samples = 8;
        for (let i = 1; i < samples; i++) {
            const t = i / samples;
            const w = 1 - t;
            const b1 = 3 * w * w * t;
            const b2 = 3 * w * t * t;
            const k = [w * w * w * w, 4 * w * w * w * t, 6 * w * w * t * t, 4 * w * t * t * t, t * t * t * t];
            let rx = -(w * w * w + b1) * p0.x - (b2 + t * t * t) * p3.x;
            let ry = -(w * w * w + b1) * p0.y - (b2 + t * t * t) * p3.y;
            for (let n = 0; n < 5; n++) {
                rx += k[n] * quartic[n].x;
                ry += k[n] * quartic[n].y;
            }
            suu += b1 * b1 * (ux * ux + uy * uy);
            svv += b2 * b2 * (vx * vx + vy * vy);
            suv += b1 * b2 * (ux * vx + uy * vy);
            sur += b1 * (ux * rx + uy * ry);
            svr += b2 * (vx * rx + vy * ry);
        }
        // the pen never goes backwards: the points are kept not closer than a quarter of the way to a[1] and b[2]
        const least = 0.25;
        let ka = least;
        let kb = least;
        const det = suu * svv - suv * suv;
        if (det > 0.000001) {
            ka = (sur * svv - svr * suv) / det;
            kb = (suu * svr - suv * sur) / det;
        }
        if (ka < least || kb < least) {
            // one of them is on its limit, the other one is found alone
            const kaAlone = suu > 0 ? (sur - least * suv) / suu : least;
            const kbAlone = svv > 0 ? (svr - least * suv) / svv : least;
            if (ka < least && kb < least) {
                ka = least;
                kb = least;
            } else if (ka < least) {
                ka = least;
                kb = Math.max(kbAlone, least);
            } else {
                kb = least;
                ka = Math.max(kaAlone, least);
            }
        }
        return [p0, {
            x: p0.x + ka * ux,
            y: p0.y + ka * uy
        }, {
            x: p3.x + kb * vx,
            y: p3.y + kb * vy
        }, p3];
    }

    // length of an element as it is drawn: by straight pieces between rounded points
    static elementLength(element) {
        const points = element.points;
        let point;
        if (element.type === 'curve' && points.length === 4) {
            point = (t) => Curves.cubicBezierPoint(t, points);
        } else if (element.type === 'curve3p' && points.length === 3) {
            point = (t) => Curves.quadraticBezierPoint(t, points);
        } else if (element.type === 'line' && points.length === 2) {
            point = (t) => points[Math.round(t)];
        } else {
            return 0;
        }
        const pieces = element.type === 'line' ? 1 : Curves.segmentPieces();
        let length = 0;
        let ps = points[0];
        for (let i = 1; i <= pieces; i++) {
            let pe = point(i / pieces);
            length += Math.hypot(pe.x - ps.x, pe.y - ps.y);
            ps = pe;
        }
        return Math.round(length * 100) / 100;
    }

    static drawBezier3p(object, points, color) {
        let ps = points[0];
        if (ps.x == points[1].x && ps.x == points[2].x && ps.y == points[1].y && ps.y == points[2].y) return;
        const pieces = Curves.pieces(Curves.elementLength({
            type: 'curve3p',
            points: points
        }));
        for (let i = 0; i <= pieces; i++) {
            let pe = Curves.quadraticBezierPoint(i / pieces, points);
            object.drawLine(ps.x, ps.y, pe.x, pe.y, color);
            ps = pe;
        }
    }

    static drawBezier4p(object, points, color) {
        let ps = points[0];
        if (ps.x == points[1].x && ps.x == points[2].x && ps.x == points[3].x && ps.y == points[1].y && ps.y == points[2].y &&
            ps.y == points[3].y) return;
        const pieces = Curves.pieces(Curves.elementLength({
            type: 'curve',
            points: points
        }));
        for (let i = 0; i <= pieces; i++) {
            let pe = Curves.cubicBezierPoint(i / pieces, points);
            object.drawLine(ps.x, ps.y, pe.x, pe.y, color);
            ps = pe;
        }
    }
}