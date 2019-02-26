import {ServiceRegistry} from '../services/service-registry';
import {Component} from './interfaces';
import {Point} from '../tools/interfaces';
import {truncate} from '../util';

const template = (p: Point) => `<div><span>longitude: ${truncate(p.lng)}</span><span>latitude:${truncate(p.lat)}</span></div><button>X</button>`;

export const factory = (registry: ServiceRegistry, p: Point): Component => {
    const el = document.createElement('LI');
    const {itinerary} = registry;
    el.classList.add('itinerary-stop-point');
    el.innerHTML = template(p);
    el.querySelector('button').addEventListener('click', ev => {
        itinerary.removePoint(p);
    });

    return {
        clean() {

        },
        dom() {
            return el;
        }
    };
};
