import {ServiceRegistry} from '../services/service-registry';
import {Component} from './interfaces';
import {truncate} from '../util';
import {WayPoint} from '../services/store';

const template = (p: WayPoint) => `<span class="drag-handle" draggable="true">D</span><div><span>longitude: ${truncate(p.lng)}</span><span>latitude:${truncate(p.lat)}</span></div><button>X</button>`;

const isTopPart = (ev: DragEvent, rect: ClientRect) => ev.pageY < (rect.top + rect.height / 2);

export const factory = (registry: ServiceRegistry, p: WayPoint): Component => {
    const el = document.createElement('LI');
    const {itinerary} = registry;
    let boundingBox;
    el.classList.add('itinerary-stop-point');
    el.innerHTML = template(p);

    el.querySelector('button').addEventListener('click', ev => {
        itinerary.removePoint(p);
    });

    const dragHandle = el.querySelector('.drag-handle');

    dragHandle.addEventListener('dragstart', (ev: DragEvent) => {
        ev.dataTransfer.setData('text/json', JSON.stringify(p));
        ev.dataTransfer.dropEffect = 'move';
        itinerary.startMove(p);
    });

    el.addEventListener('dragover', (ev: DragEvent) => {
        ev.preventDefault();
        boundingBox = boundingBox || el.getBoundingClientRect();
        const isBefore = isTopPart(ev, boundingBox);
        el.classList.toggle('drop-target-before', isBefore);
        el.classList.toggle('drop-target-after', !isBefore);
    });

    el.addEventListener('drop', (ev: DragEvent) => {
        ev.preventDefault();
        const movingPoint = ev.dataTransfer.getData('text/json');
        if (isTopPart(ev, boundingBox)) {
            itinerary.moveBefore(p);
        } else {
            itinerary.moveAfter(p);
        }
    });

    el.addEventListener('dragleave', (ev: DragEvent) => {
        ev.preventDefault();
        if (ev.target === el) {
            el.classList.remove('drop-target-before');
            el.classList.remove('drop-target-after');
        }
    });

    return {
        clean() {

        },
        dom() {
            return el;
        }
    };
};
