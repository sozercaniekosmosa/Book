export const lerp = (x, y, a) => x * (1 - a) + y * a;
export const clamp = (a, min = 0, max = 1) => Math.min(max, Math.max(min, a));
export const invlerp = (x, y, a) => clamp((a - x) / (y - x));
export const range = (a1, b1, a2, b2, val) => lerp(a2, b2, invlerp(a1, b1, val)); // range(0,20000, 0,100, 50) // 10000

/**
 * Вызывает callback на каждй новой точке (Алгоритм Брезенхема)
 * @paramVal x1
 * @paramVal y1
 * @paramVal x2
 * @paramVal y2
 * @paramVal callback(x,y)
 * @returns {*}
 */
export function getLinePoints(x1, y1, x2, y2, callback) {
    var dx = Math.abs(x2 - x1);
    var dy = Math.abs(y2 - y1);
    var sx = (x1 < x2) ? 1 : -1;
    var sy = (y1 < y2) ? 1 : -1;
    var err = dx - dy;

    while (true) {
        callback(x1, y1)

        if (x1 === x2 && y1 === y2) break;
        var e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x1 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y1 += sy;
        }
    }
}

export const getRandomRange = (min, max, fix = 2) => {
    return (Math.random() * (max - min) + min).toFixed(fix);
}