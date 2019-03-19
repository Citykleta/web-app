import {ServiceRegistry} from '../services/service-registry';
import {Component} from './types';
import {factory as stopPointFactory} from './itinerary-stop-point';
import {isSameLocation} from '../util';

const template = () => `
<h2>Itinerary</h2>
<div class="tool-content">
<div id="upper-control">
<ol class="itinerary-stop-point-container"></ol>
</div>
</div>
`;

export const factory = (registry: ServiceRegistry): Component => {
    const {store, itinerary} = registry;
    const domElement = document.createElement('DIV');
    domElement.innerHTML = template();
    const range = document.createRange();
    range.selectNodeContents(domElement);
    const stopListElements = domElement.querySelector('.itinerary-stop-point-container');

    let stops = [];

    const itineraryStopChangedHandler = () => {
        const {stops: newStops, focus} = store.getState().itinerary;
        const [from, ...through] = newStops;
        const to = through.pop();
        if ((stops.length !== newStops.length) || newStops.some((item, idx) => {
            // @ts-ignore todo
            return !isSameLocation(item, stops[idx]);
        })) {
            const range = document.createRange();
            range.selectNodeContents(stopListElements);
            range.deleteContents();

            stopListElements.appendChild(stopPointFactory(registry, from).dom());

            for (const stop of through) {
                stopListElements.appendChild(stopPointFactory(registry, stop).dom());
            }

            stopListElements.appendChild(stopPointFactory(registry, to).dom());
        }

        stops = newStops;
    };

    const unsubscribe = store.subscribe(itineraryStopChangedHandler);

    itineraryStopChangedHandler();

    // (<HTMLInputElement>document.querySelector('.itinerary-stop-point')).focus();

    return {
        clean() {
            unsubscribe();
            itinerary.reset();
        },
        dom() {
            return range.extractContents();
        }
    };
};

