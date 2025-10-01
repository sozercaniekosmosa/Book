// EventBus.dispatchEvent('evb-key', {event, combine, nodeFocus}))
class EventBus {
    private bus: HTMLElement;

    constructor() {
        this.bus = document.createElement('eventbus');
    }

    addEventListener(event, callback) {
        this.bus.addEventListener(event, e => callback(...e.detail));
    }

    removeEventListener(event, callback) {
        this.bus.removeEventListener(event, callback);
    }

    dispatchEvent(event, ...data) {
        this.bus.dispatchEvent(new CustomEvent(event, {detail: data}));
    }
}

//@ts-ignore
export const eventBus = window.EventBus = new EventBus;

let lastX = 0, lastY = 0, deltaX, deltaY;
document.addEventListener('mousemove', function (event) {
    deltaX = event.clientX - lastX;
    deltaY = event.clientY - lastY;
    // console.log(`Delta X: ${deltaX}, Delta Y: ${deltaY}`);
    lastX = event.clientX;
    lastY = event.clientY;
});
export let getDeltaMouseMove = () => ({0: deltaX, 1: deltaY, x: deltaX, y: deltaY});