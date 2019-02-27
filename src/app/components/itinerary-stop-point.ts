import {ServiceRegistry} from '../services/service-registry';
import {Component} from './interfaces';
import {Point} from '../tools/interfaces';
import {truncate} from '../util';

const template = (p: Point) => `<span class="drag-handle" draggable="true">D</span><div><span>longitude: ${truncate(p.lng)}</span><span>latitude:${truncate(p.lat)}</span></div><button>X</button>`;

export const factory = (registry: ServiceRegistry, p: Point): Component => {
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
        ev.dataTransfer.setData('text/plain', 'woot woot');
        ev.dataTransfer.dropEffect = 'move';
    });

    el.addEventListener('dragover', (ev: DragEvent) => {
        boundingBox = boundingBox || el.getBoundingClientRect();
        console.log(boundingBox);
    });

    return {
        clean() {

        },
        dom() {
            return el;
        }
    };
};
