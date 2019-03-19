import {ServiceRegistry} from '../services/service-registry';
import {Component} from './types';
import {StatePoint, UIPoint} from '../util';
import {template as searchBoxTemplate} from './search-box';

const draggableLocationPoint = (p: UIPoint | StatePoint) => `<span class="drag-handle" draggable="true">|</span>
<label>
<!--<span></span>-->
${searchBoxTemplate(p)}
</label>
<button>X</button>`;

const isTopPart = (ev: DragEvent, rect: ClientRect) => ev.pageY < (rect.top + rect.height / 2);

export const factory = (registry: ServiceRegistry, p: UIPoint | StatePoint, props = {classList: []}): Component => {
    const el = document.createElement('LI');
    el.id = `itinerary-stop-point-${p.id}`;
    const {itinerary, store} = registry;
    const classList = ['itinerary-stop-point', ...props.classList];
    let boundingBox;
    for (const cl of classList) {
        el.classList.add(cl);
    }

    el.innerHTML = draggableLocationPoint(p);

    const input = el.querySelector('input');

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

    input.addEventListener('focus', ev => {
        itinerary.setFocus(p.id);
    });

    input.addEventListener('blur', ev => {
        // itinerary.setFocus(null);
    });

    return {
        clean() {
        },
        dom() {
            return el;
        }
    };
};
